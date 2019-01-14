import {
  ApplicationRef,
  Component,
  ErrorHandler,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import {ElectronService} from '../../common/services/electron.service';
import {SettingsService} from '../../services/settings.service';
import {RepositoryModel} from '../../../../shared/git/Repository.model';
import {CommitModel} from '../../../../shared/git/Commit.model';
import {Channels} from '../../../../shared/Channels';
import {CommitSummaryModel} from '../../../../shared/git/CommitSummary.model';
import {BranchModel} from '../../../../shared/git/Branch.model';
import {GlobalErrorHandlerService} from '../../common/services/global-error-handler.service';
import {StashModel} from '../../../../shared/git/stash.model';
import {WorktreeModel} from '../../../../shared/git/worktree.model';
import {DiffHeaderModel} from '../../../../shared/git/diff.header.model';
import {FilterPipe} from '../../common/pipes/filter.pipe';
import {CommandHistoryModel} from '../../../../shared/git/command-history.model';
import {GitService} from '../../services/git.service';
import {ErrorModel} from '../../../../shared/common/error.model';
import {ErrorService} from '../../common/services/error.service';
import {CodeWatcherService} from '../../services/code-watcher.service';
import {ModalService} from '../../common/services/modal.service';
import {SubmoduleModel} from '../../../../shared/git/submodule.model';

@Component({
  selector: 'app-repo-view',
  templateUrl: './repo-view.component.html',
  styleUrls: ['./repo-view.component.scss'],
})
export class RepoViewComponent implements OnInit, OnDestroy {
  repo: RepositoryModel;
  changes: CommitModel = new CommitModel();
  selectedUnstagedChanges: { [key: string]: boolean } = {};
  selectedStagedChanges: { [key: string]: boolean } = {};
  diffHeaders: DiffHeaderModel[] = [];
  commitAndPush = false;
  commitHistory: CommitSummaryModel[] = [];
  showDiff = false;
  @Input() repoPath = 'C:/Users/blake/Documents/projects/test-repo';
  @Input() repoCache: RepositoryModel;
  localBranchFilter = '';
  remoteBranchFilter = '';
  globalErrorHandlerService: GlobalErrorHandlerService;
  isLoading = false;
  @Output() onLoadingChange = new EventEmitter<boolean>();
  @Output() onLoadRepoFailed = new EventEmitter<ErrorModel>();
  @Output() onOpenRepoNewTab = new EventEmitter<string>();
  worktreeFilter: string;
  diffCommitInfo: CommitSummaryModel;
  stashFilter: string;
  stagedChangesFilter: string;
  unstagedChangesFilter: string;
  commandHistoryFilter: string;
  submoduleFilter: string;
  stashOnlyUnstaged = true;
  selectedAutocompleteItem = 0;
  suggestions: string[] = [];
  positionInAutoComplete: number;
  commandHistory: CommandHistoryModel[];
  maxCommandsVisible = 10;
  commandsPerPage = 10;
  debounceRefreshTimer: number;
  repoViewUid: number;
  activeSubmodule: SubmoduleModel;
  private interval;
  private currentCommitCursorPosition: number;
  private _errorClassLocation = 'Repo view component, ';
  private firstNoRemoteErrorDisplayed = false;

  constructor(private electronService: ElectronService,
              private settingsService: SettingsService,
              private errorService: ErrorService,
              public codeWatcherService: CodeWatcherService,
              public modalService: ModalService,
              errorHandler: ErrorHandler,
              public applicationRef: ApplicationRef,
              private gitService: GitService) {
    this.globalErrorHandlerService = <GlobalErrorHandlerService>errorHandler;
    this.gitService.onCommandHistoryUpdated.asObservable().subscribe(history => {
      this.commandHistory = history;
      this.applicationRef.tick();
    });
    this.repoViewUid = Math.round(Math.random() * 10000000);
  }

  getStashFilterText(stash: StashModel) {
    return stash.branchName + stash.message + stash.branchName;
  }

  ngOnInit() {
    this.loadRepo();
  }

  ngOnDestroy() {
    clearInterval(this.interval);
  }

  @HostListener('window:focus', ['$event'])
  onFocus(event: any): void {
    if (this.repo) {
      this.getFileChanges(!this.showDiff || this.diffCommitInfo != undefined);
      this.getBranchChanges();
      this.getCommitHistory();
    }
  }

  stageAll() {
    this.setLoading(true);
    this.electronService.rpc(Channels.GITSTAGE, [this.repo.path, '.'])
        .then(changes => this.handleFileChanges(changes, false))
        .catch(err => this.handleErrorMessage(
          new ErrorModel(this._errorClassLocation + 'stageAllChanges', 'staging all changes', err)));
    this.selectedUnstagedChanges = {};
  }

  stageSelected() {
    if (Object.values(this.selectedUnstagedChanges).filter(x => x).length == 0) {
      return;
    }
    let arg = Object.keys(this.selectedUnstagedChanges).filter(x => this.selectedUnstagedChanges[x]).join(' ');
    this.setLoading(true);
    this.electronService.rpc(Channels.GITSTAGE, [this.repo.path, arg])
        .then(changes => this.handleFileChanges(changes, false))
        .catch(err => this.handleErrorMessage(
          new ErrorModel(this._errorClassLocation + 'stageSelectedChanges', 'staging selected changes', err)));
    this.selectedUnstagedChanges = {};
  }

  unstageAll() {
    this.setLoading(true);
    this.electronService.rpc(Channels.GITUNSTAGE, [this.repo.path, '.'])
        .then(changes => this.handleFileChanges(changes, false))
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'unstageAllChanges',
          'unstaging all changes',
          err)));
    this.selectedStagedChanges = {};
  }

  unstageSelected() {
    if (Object.values(this.selectedStagedChanges).filter(x => x).length == 0) {
      return;
    }
    let arg = Object.keys(this.selectedStagedChanges).filter(x => this.selectedStagedChanges[x]).join(' ');
    this.setLoading(true);
    this.electronService.rpc(Channels.GITUNSTAGE, [this.repo.path, arg])
        .then(changes => this.handleFileChanges(changes, false))
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'unstageSelectedChanges',
          'unstaging selected changes',
          err)));
    this.selectedStagedChanges = {};
  }

  getFileChanges(keepDiffCommitSelection: boolean = true, manualFetch: boolean = false) {
    if (!this.repo) {
      return;
    }
    if (this.debounceRefreshTimer) {
      clearTimeout(this.debounceRefreshTimer);
    }
    this.debounceRefreshTimer = window.setTimeout(() => {
      this.getBranchChanges();
      this.fetch(manualFetch);
      this.getCommitHistory();
      this.setLoading(true);
      this.electronService.rpc(Channels.GETFILECHANGES, [this.repo.path])
          .then(changes => this.handleFileChanges(changes, keepDiffCommitSelection))
          .catch(err => this.handleErrorMessage(new ErrorModel(
            this._errorClassLocation + 'getFileChanges',
            'getting file changes',
            err)));
    }, 400);
  }

  getBranchChanges() {
    this.setLoading(true);
    this.electronService.rpc(Channels.GETBRANCHES, [this.repo.path])
        .then(changes => this.handleBranchChanges(changes))
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'getBranches',
          'getting branch changes',
          err)));
  }

  deleteBranch(branch: string) {
    this.setLoading(true);
    this.electronService.rpc(Channels.DELETEBRANCH, [this.repo.path, branch])
        .then(changes => this.handleBranchChanges(changes))
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'deleteBranch',
          'deleting the branch',
          err)));
  }

  fastForwardBranch(branch: string) {
    this.setLoading(true);
    this.gitService.fastForwardBranch(branch)
        .then(() => this.getBranchChanges())
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'fastForwardBranch',
          'fast forwarding the branch',
          err)));
  }

  mergeBranch(branch: string) {
    this.setLoading(true);
    this.gitService.mergeBranch(branch)
        .then(changes => this.handleBranchChanges(changes))
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'mergeBranch',
          'merging the branch',
          err)));
  }

  renameBranch(branch: { oldName: string, newName: string }) {
    this.setLoading(true);
    this.electronService.rpc(Channels.RENAMEBRANCH, [this.repo.path, branch.oldName, branch.newName])
        .then(changes => this.handleBranchChanges(changes))
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'renameBranch',
          'renaming the branch',
          err)));
  }

  openTerminal() {
    this.setLoading(true);
    this.electronService.rpc(Channels.OPENTERMINAL, [this.repo.path]).then(ignore => {
    }).catch(err => this.handleErrorMessage(new ErrorModel(this._errorClassLocation + 'openTerminal', '', err)));
  }

  openFolder(path: string = '') {
    this.setLoading(true);
    this.electronService.rpc(Channels.OPENFOLDER, [this.repo.path, path])
        .then(ignore => {
        })
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'openFolder',
          'opening the folder',
          err)));
  }

  getFileDiff() {
    let unstaged = Object.keys(this.selectedUnstagedChanges)
                         .filter(x => this.selectedUnstagedChanges[x])
                         .map(x => x.replace(/.*->\s*/, ''));
    let staged = Object.keys(this.selectedStagedChanges)
                       .filter(x => this.selectedStagedChanges[x])
                       .map(x => x.replace(/.*->\s*/, ''));
    if (staged.length==0 && unstaged.length==0) {
      unstaged = ['.'];
      staged = ['.'];
    }
    this.setLoading(true);
    this.electronService.rpc(Channels.GETFILEDIFF, [this.repo.path, unstaged, staged])
        .then(diff => {
          this.diffHeaders = diff;
          this.applicationRef.tick();
          this.setLoading(false);
        })
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'getFileDiff',
          'getting the file differences',
          err)));
  }

  getCommitHistory(skip: number = 0) {
    this.setLoading(true);
    this.electronService.rpc(Channels.GETCOMMITHISTORY, [this.repo.path, 300, skip])
        .then(commits => {
          if (!skip || skip == 0) {
            this.commitHistory = commits;
          } else {
            this.commitHistory = this.commitHistory.concat(commits);
          }
          this.applicationRef.tick();
        })
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'getCommitHistory',
          'getting commit history',
          err)));
  }

  commit() {
    if (this.changes.stagedChanges.length == 0) {
      return;
    }
    this.setLoading(true, true);
    this.electronService.rpc(Channels.COMMIT, [this.repo.path, this.changes.description, this.commitAndPush])
        .then(changes => {
          this.handleFileChanges(changes);
          this.getCommitHistory();
          this.getFileDiff();
          this.changes.description = '';
          this.showDiff = false;
          this.setLoading(false, true);
          this.applicationRef.tick();
        })
        .catch(err => this.handleErrorMessage(new ErrorModel(this._errorClassLocation + 'commit', 'committing', err)));
    this.clearSelectedChanges();
  }

  cherryPickCommit(commit: CommitSummaryModel) {
    this.setLoading(true, true);
    this.electronService.rpc(Channels.CHERRYPICKCOMMIT, [this.repo.path, commit.hash])
        .then(changes => {
          this.handleFileChanges(changes);
          this.getFileDiff();
          this.setLoading(false, true);
          this.applicationRef.tick();
        })
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'cherryPickCommit',
          'cherry-picking commit onto current branch',
          err)));
    this.clearSelectedChanges();
  }

  checkout(branch: string, newBranch: boolean) {
    this.setLoading(true);
    this.electronService.rpc(Channels.CHECKOUT, [this.repo.path, branch, newBranch])
        .then(changes => {
          this.handleFileChanges(changes);
          this.getCommitHistory();
          this.getBranchChanges();
        })
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'checkout',
          'checking out the branch',
          err)));
    this.clearSelectedChanges();
  }

  pull(force: boolean) {
    this.setLoading(true);
    this.electronService.rpc(Channels.PULL, [this.repo.path, force])
        .then(changes => {
          this.handleFileChanges(changes);
          this.getCommitHistory();
          this.getBranchChanges();
        })
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'pull',
          'pulling the branch',
          err)));
    this.clearSelectedChanges();
  }

  push(branch: string, force: boolean) {
    this.setLoading(true);
    this.electronService.rpc(Channels.PUSH, [this.repo.path, branch, force])
        .then(changes => {
          this.getCommitHistory();
          this.getBranchChanges();
        })
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'push',
          'pushing the branch',
          err)));
    this.clearSelectedChanges();
  }

  deleteClicked(files: string[]) {
    this.setLoading(true);
    this.electronService.rpc(Channels.DELETEFILES, [this.repo.path, files])
        .then(() => {
          this.getFileChanges(true);
          this.getFileDiff();
          this.getBranchChanges();
        })
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'deleteFiles',
          'deleting the file',
          err)));
    this.clearSelectedChanges();
  }

  merge(file: string) {
    this.setLoading(true);
    this.electronService.rpc(Channels.MERGE, [this.repo.path, file, this.settingsService.settings.mergetool])
        .then(changes => this.handleFileChanges(changes))
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'mergeFiles',
          'merging the file',
          err)));
    this.clearSelectedChanges();
  }

  stash(onlyUnstaged: boolean) {
    this.stashOnlyUnstaged = onlyUnstaged;
    this.showModal('createStash');
  }

  showModal(id: string, val: boolean = true) {
    this.modalService.setModalVisible(id + this.repoViewUid, val);
  }

  createStash(stashName: string) {
    this.setLoading(true);
    this.electronService.rpc(Channels.STASH, [this.repo.path, this.stashOnlyUnstaged, stashName]).then(changes => {
      this.handleFileChanges(changes);
      this.getBranchChanges();
    })
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'createStash',
          'creating the stash',
          err)));
    this.clearSelectedChanges();
  }

  hardReset() {
    this.setLoading(true);
    this.electronService.rpc(Channels.HARDRESET, [this.repo.path]).then(changes => this.handleFileChanges(changes))
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'hardReset',
          'resetting all changes',
          err)));
    this.clearSelectedChanges();
  }

  undoFileChanges(file: string, staged: boolean, revision: string = '') {
    this.setLoading(true);
    this.electronService.rpc(Channels.UNDOFILECHANGES, [this.repo.path, file, revision, staged])
        .then(changes => {
          this.handleFileChanges(changes);
        })
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'undoFileChanges',
          'undoing changes for the file',
          err)));
    this.clearSelectedChanges();
  }

  isRemoteAlreadyCheckedOut(branch: string) {
    return this.repo.localBranches.filter(x => x.name == branch.replace('origin/', '')).length > 0;
  }

  getCurrentBranch(): BranchModel {
    return this.repo.localBranches.find(x => x.isCurrentBranch) || new BranchModel();
  }

  getBranchName(branch: BranchModel) {
    return branch.name;
  }

  deleteWorktree(w) {
    this.setLoading(true);
    this.electronService.rpc(Channels.DELETEWORKTREE, [this.repo.path, w.name])
        .then(changes => this.handleBranchChanges(changes))
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'deleteWorktree',
          'deleting the worktree',
          err)));
    this.clearSelectedChanges();
  }

  updateSubmodules(recursive: boolean, branch?: string) {
    this.setLoading(true);
    this.gitService.updateSubmodules(branch, recursive)
        .then(() => this.getFileChanges())
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'updateSubmodules',
          'updating the submodules',
          err)));
    this.clearSelectedChanges();
  }

  addSubmodule(url: string, path: string) {
    this.setLoading(true);
    this.gitService.addSubmodule(url, path)
        .then(() => this.getBranchChanges())
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'addSubmodule',
          'adding the submodule',
          err)));
    this.clearSelectedChanges();
  }

  fetch(manualFetch: boolean = false) {
    this.setLoading(true);
    this.electronService.rpc(Channels.FETCH, [this.repo.path])
        .then(changes => this.handleBranchChanges(changes))
        .catch((err: string) => {
          if (err && err
              .indexOf('No remote repository specified.  Please, specify either a URL or a') >= 0 &&
            (!this.firstNoRemoteErrorDisplayed || manualFetch)) {
            this.handleErrorMessage(new ErrorModel(
              this._errorClassLocation + 'fetch',
              'fetching remote changes',
              err));
            this.firstNoRemoteErrorDisplayed = true;
          }
          if (err && err
            .indexOf('No remote repository specified.  Please, specify either a URL or a') < 0) {
            this.handleErrorMessage(new ErrorModel(
              this._errorClassLocation + 'fetch',
              'fetching remote changes',
              err));
          }
        });
  }

  getCommandHistory() {
    this.setLoading(true);
    this.electronService.rpc(Channels.GETCOMMANDHISTORY, [this.repo.path])
        .then(history => {
          this.commandHistory = [];
          this.applicationRef.tick();
          this.commandHistory = history;
          this.applicationRef.tick();
        })
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'getCommandHistory',
          'fetching git command history',
          err)));
  }

  toggleExpandState(key: string) {
    this.settingsService.settings.expandStates[key] = !this.settingsService.settings.expandStates[key];
    this.settingsService.saveSettings();
  }

  getExpandState(key: string) {
    return this.settingsService.settings.expandStates[key];
  }

  selectionChanged(selectedChanges: { [key: string]: boolean }, isStaged: boolean) {
    if (isStaged) {
      this.selectedStagedChanges = selectedChanges;
    } else {
      this.selectedUnstagedChanges = selectedChanges;
    }
    this.getFileDiff();
    this.diffCommitInfo = undefined;
    setTimeout(() => this.showDiff = true, 300);
  }

  viewCommitDiff(commit: CommitSummaryModel) {
    this.setLoading(true);
    this.electronService.rpc(Channels.COMMITDIFF, [this.repo.path, commit.hash])
        .then(diff => {
          this.diffHeaders = diff;
          this.showDiff = true;
          this.diffCommitInfo = commit;
          this.isLoading = false;
          this.applicationRef.tick();
        })
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'viewCommitDiff',
          'getting file differences for the commit',
          err)));
  }

  getBranchPremerge(branch: BranchModel) {
    this.setLoading(true);
    this.electronService.rpc(Channels.GETBRANCHPREMERGE, [this.repo.path, branch])
        .then(diff => {
          this.diffHeaders = diff;
          this.showDiff = true;
          this.diffCommitInfo = new CommitSummaryModel();
          const currentBranch = this.repo.localBranches.find(x => x.isCurrentBranch);
          this.diffCommitInfo.hash = branch.currentHash + ' <--> ' + currentBranch.currentHash;
          this.diffCommitInfo.message = 'Diff of all changes since last common ancestor between \'' +
            branch.name +
            '\' and \'' +
            currentBranch.name +
            '\'';
          this.isLoading = false;
          this.applicationRef.tick();
        })
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'branchPremerge',
          'getting changes since branch created',
          err)));
  }

  applyStash(index: number) {
    this.setLoading(true);
    this.electronService.rpc(Channels.APPLYSTASH, [this.repo.path, index])
        .then(changes => {
          this.handleFileChanges(changes);
          this.getBranchChanges();
        })
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'applyStash',
          'applying the stash',
          err)));
    this.clearSelectedChanges();
  }

  deleteStash(index: number) {
    this.setLoading(true);
    this.electronService.rpc(Channels.DELETESTASH, [this.repo.path, index])
        .then(changes => {
          this.handleFileChanges(changes);
          this.getBranchChanges();
        })
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'deleteStash',
          'deleting the stash',
          err)));
    this.clearSelectedChanges();
  }

  createBranch(branchName: string) {
    this.setLoading(true);
    this.electronService.rpc(Channels.CREATEBRANCH, [this.repo.path, branchName])
        .then(changes => {
          this.handleBranchChanges(changes);
          this.getCommitHistory();
        })
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'createBranch',
          'creating the branch',
          err)));
  }

  getCreateStashDefaultText() {
    return (this.repo.localBranches.find(x => x.isCurrentBranch) || new BranchModel()).lastCommitText;
  }

  getFilenameChunks(filename: string) {
    return filename.replace('->', '/->/').split('/');
  }

  getCommitSuggestions() {
    let partial = this.changes.description;
    if (!partial || !this.settingsService.settings.commitMessageAutocomplete) {
      this.suggestions = [];
      return [];
    }

    let lastWord, index = 0;
    let arr = partial.split(/[\s,]/);
    for (let i = 0; i < arr.length; i++) {
      if (index >= this.currentCommitCursorPosition) {
        break;
      }
      lastWord = arr[i];
      this.positionInAutoComplete = this.currentCommitCursorPosition - index;
      index += arr[i].length + 1;
    }

    if (!lastWord || !lastWord.trim() || lastWord.trim().length < 5) {
      this.suggestions = [];
      return [];
    }
    let optionsSet: { [key: string]: number } = {};
    this.changes.stagedChanges.forEach(x =>
      this.getFilenameChunks(x.file)
          .forEach(y => optionsSet[y.trim()] = this.levenshtein(y.toLowerCase(), lastWord.toLowerCase())));
    this.changes.unstagedChanges.forEach(x =>
      this.getFilenameChunks(x.file)
          .forEach(y => optionsSet[y.trim()] = this.levenshtein(y.toLowerCase(), lastWord.toLowerCase())));

    const currentBranchName = this.getCurrentBranch().name;
    this.getFilenameChunks(currentBranchName)
        .forEach(y => optionsSet[y.trim()] = this.levenshtein(currentBranchName, lastWord));
    const result = Object.keys(optionsSet)
                         // .sort((a, b) => optionsSet[a] - optionsSet[b])
                         .filter(x => FilterPipe.fuzzyFilter(
                           lastWord.toLowerCase(),
                           x.toLocaleLowerCase()) || optionsSet[x] < lastWord.length / 3)
                         .slice(0, 5);
    this.suggestions = result;
    return result;
  }

  setCurrentCursorPosition($event) {
    this.currentCommitCursorPosition = $event.target.selectionStart;

    if (['Enter', 'ArrowUp', 'ArrowDown', 'Escape', 'Tab'].indexOf($event.key) < 0) {
      this.getCommitSuggestions();
    }
    if (this.suggestions.length == 0) {
      return;
    }
    $event.stopPropagation();
    if ($event.key == 'Enter' && !$event.ctrlKey) {
      this.currentCommitCursorPosition--;
      this.chooseAutocomleteItem(true);
    } else if ($event.key == 'Tab' && !$event.ctrlKey) {
      $event.preventDefault();
      this.chooseAutocomleteItem(true);
    } else if ($event.key == 'ArrowUp') {
      this.selectedAutocompleteItem = Math.max(0, this.selectedAutocompleteItem - 1);
    } else if ($event.key == 'ArrowDown') {
      this.selectedAutocompleteItem = Math.min(this.suggestions.length, this.selectedAutocompleteItem + 1);
    } else if ($event.key == 'Escape') {
      this.suggestions = [];
    }
  }

  chooseAutocomleteItem(removeEnter: boolean, item?: number) {
    this.selectedAutocompleteItem = item || this.selectedAutocompleteItem;
    this.changes.description = this.changes.description.substring(
      0,
      this.currentCommitCursorPosition - this.positionInAutoComplete) +
      this.suggestions[this.selectedAutocompleteItem] +
      this.changes.description.substring(this.currentCommitCursorPosition +
        (removeEnter ? 1 : 0));
    this.selectedAutocompleteItem = 0;
    this.suggestions = [];
  }

  setAddWorktreeVisible(val: boolean) {
    this.showModal('addWorktree', val);
  }

  getCommandHistoryFilterableText(command: CommandHistoryModel) {
    return command.name + command.command;
  }

  handleFileChanges(changes: CommitModel, keepDiffCommitSelection: boolean = true) {
    this.changes = Object.assign(
      new CommitModel(),
      changes,
      {description: this.changes ? this.changes.description : ''});
    if (!keepDiffCommitSelection) {
      this.getFileDiff();
      this.diffCommitInfo = undefined;
    }
    this.getCommandHistory();
    this.applicationRef.tick();
    this.setLoading(false);
  }

  handleErrorMessage(error: ErrorModel) {
    this.errorService.receiveError(error);
    this.setLoading(false, true);
  }

  hunkChangeError($event: any) {
    this.handleErrorMessage(
      new ErrorModel('', 'saving changes to the hunk', $event));
  }

  viewSubmodule(submodule: SubmoduleModel) {
    this.activeSubmodule = submodule;
    this.showModal('submoduleViewer');
  }

  private levenshtein(a: string, b: string): number {
    let tmp;
    if (a.length === 0) {
      return b.length;
    }
    if (b.length === 0) {
      return a.length;
    }
    if (a.length > b.length) {
      tmp = a;
      a = b;
      b = tmp;
    }

    let i, j, res, alen = a.length, blen = b.length, row = Array(alen);
    for (i = 0; i <= alen; i++) {
      row[i] = i;
    }

    for (i = 1; i <= blen; i++) {
      res = i;
      for (j = 1; j <= alen; j++) {
        tmp = row[j - 1];
        row[j - 1] = res;
        res = b[i - 1] === a[j - 1] ? tmp : Math.min(tmp + 1, Math.min(res + 1, row[j] + 1));
      }
    }
    return res;
  }

  private loadRepo(path: string = '') {
    this.repoPath = path || this.repoPath;
    this.repo = this.repoCache;
    this.setLoading(true);
    this.electronService.rpc(Channels.LOADREPO, [this.repoPath]).then(repo => {
      this.repo = new RepositoryModel().copy(repo);
      this.gitService.repo = this.repo;
      this.repoCache = this.repo;
      this.getFileChanges(false);
      this.fetch();
      this.applicationRef.tick();
      this.interval = setInterval(() => {
        this.getFileChanges();
        this.getBranchChanges();
      }, 1000 * 60 * 5);
    }).catch(err => {
      this.setLoading(false);
      this.onLoadRepoFailed.emit(new ErrorModel(this._errorClassLocation + 'loadRepo', 'loading the repo', err));
    });
  }

  private clearSelectedChanges() {
    this.selectedUnstagedChanges = {};
    this.selectedStagedChanges = {};
  }

  private handleBranchChanges(changes: RepositoryModel) {
    this.repo.localBranches = changes.localBranches.map(b => Object.assign(new BranchModel(), b));
    this.repo.remoteBranches = changes.remoteBranches.map(b => Object.assign(new BranchModel(), b));
    this.repo.worktrees = changes.worktrees.map(w => Object.assign(new WorktreeModel(), w));
    this.repo.stashes = changes.stashes.map(s => Object.assign(new StashModel(), s));
    this.repo.submodules = changes.submodules.map(s => Object.assign(new SubmoduleModel(), s));
    Object.assign(this.repoCache, this.repo || {});
    this.getCommandHistory();
    this.applicationRef.tick();
    this.setLoading(false);
  }

  private setLoading(val: boolean, lockCommitInfo: boolean = false) {
    if (!val || lockCommitInfo) {
      this.isLoading = val;
    }
    this.onLoadingChange.emit(val);
  }
}
