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
      this.getFullRefresh(!this.showDiff || this.diffCommitInfo != undefined);
    }
  }

  stageAll() {
    this.simpleOperation(this.gitService.stage('.'), 'stageAllChanges', 'staging all changes');
    this.selectedUnstagedChanges = {};
  }

  stageSelected() {
    if (Object.values(this.selectedUnstagedChanges).filter(x => x).length == 0) {
      return;
    }
    let files = Object.keys(this.selectedUnstagedChanges).filter(x => this.selectedUnstagedChanges[x]).join(' ');
    this.simpleOperation(this.gitService.stage(files), 'stageSelectedChanges', 'staging selected changes');
    this.selectedUnstagedChanges = {};
  }

  unstageAll() {
    this.simpleOperation(this.gitService.unstage('.'), 'unstageAllChanges', 'unstaging all changes');
    this.selectedStagedChanges = {};
  }

  unstageSelected() {
    if (Object.values(this.selectedStagedChanges).filter(x => x).length == 0) {
      return;
    }
    let files = Object.keys(this.selectedStagedChanges).filter(x => this.selectedStagedChanges[x]).join(' ');
    this.simpleOperation(this.gitService.unstage(files), 'unstageSelectedChanges', 'unstaging selected changes');
    this.selectedStagedChanges = {};
  }

  getFullRefresh(keepDiffCommitSelection: boolean = true, manualFetch: boolean = false) {
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
      this.getFileDiff();
      this.setLoading(true);
      this.gitService.getFileChanges()
          .then(changes => this.handleFileChanges(changes, keepDiffCommitSelection))
          .catch(err => this.handleErrorMessage(new ErrorModel(
            this._errorClassLocation + 'getFileChanges',
            'getting file changes',
            err)));
    }, 400);
  }

  getBranchChanges() {
    // not simple
    this.setLoading(true);
    this.gitService.getBranchChanges()
        .then(changes => this.handleBranchChanges(changes))
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'getBranches',
          'getting branch changes',
          err)));
  }

  deleteBranch(branch: string) {
    this.simpleOperation(this.gitService.deleteBranch(branch), 'deleteBranch', 'deleting the branch');
  }

  fastForwardBranch(branch: string) {
    this.simpleOperation(this.gitService.fastForwardBranch(branch), 'fastForwardBranch', 'fast forwarding the branch');
  }

  mergeBranch(branch: string) {
    this.simpleOperation(this.gitService.mergeBranch(branch), 'mergeBranch', 'merging the branch');
  }

  renameBranch(branch: { oldName: string, newName: string }) {
    this.simpleOperation(this.gitService.renameBranch(branch), 'renameBranch', 'renaming the branch');
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
    if (staged.length == 0 && unstaged.length == 0) {
      unstaged = ['.'];
      staged = ['.'];
    }
    this.setLoading(true);
    this.gitService.getFileDiff(unstaged, staged)
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
    this.gitService.commit(this.changes.description, this.commitAndPush)
        .then(() => {
          this.changes.description = '';
          this.showDiff = false;
          this.getFullRefresh(false);
        })
        .catch(err => this.handleErrorMessage(new ErrorModel(this._errorClassLocation + 'commit', 'committing', err)));
    this.clearSelectedChanges();
  }

  cherryPickCommit(commit: CommitSummaryModel) {
    this.simpleOperation(
      this.gitService.cherryPickCommit(commit.hash),
      'cherryPickCommit',
      'cherry-picking commit onto current branch');
    this.clearSelectedChanges();
  }

  checkout(branch: string, newBranch: boolean) {
    this.simpleOperation(this.gitService.checkout(branch, newBranch), 'checkout', 'checking out the branch');
    this.clearSelectedChanges();
  }

  pull(force: boolean) {
    this.simpleOperation(this.gitService.pull(force), 'pull', 'pulling the branch');
    this.clearSelectedChanges();
  }

  push(branch: string, force: boolean) {
    this.simpleOperation(this.gitService.push(branch, force), 'push', 'pushing the branch');
    this.clearSelectedChanges();
  }

  deleteClicked(files: string[]) {
    this.simpleOperation(this.gitService.deleteFiles(files), 'deleteFiles', 'deleting the file');
    this.clearSelectedChanges();
  }

  merge(file: string) {
    this.simpleOperation(
      this.gitService.mergeFile(file, this.settingsService.settings.mergetool),
      'mergeFiles',
      'merging the file');
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
    this.simpleOperation(
      this.gitService.stashChanges(this.stashOnlyUnstaged, stashName),
      'createStash',
      'creating the stash');
    this.clearSelectedChanges();
  }

  hardReset() {
    this.simpleOperation(this.gitService.hardReset(), 'hardReset', 'resetting all changes');
    this.clearSelectedChanges();
  }

  undoFileChanges(file: string, staged: boolean, revision: string = '') {
    this.simpleOperation(
      this.gitService.undoFileChanges(file, revision, staged),
      'undoFileChanges',
      'undoing changes for the file');
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
    this.simpleOperation(this.gitService.deleteWorktree(w.name), 'deleteWorktree', 'deleting the worktree');
    this.clearSelectedChanges();
  }

  updateSubmodules(recursive: boolean, branch?: string) {
    this.simpleOperation(
      this.gitService.updateSubmodules(branch, recursive),
      'updateSubmodules',
      'updating the submodules');
    this.clearSelectedChanges();
  }

  addSubmodule(url: string, path: string) {
    this.simpleOperation(this.gitService.addSubmodule(url, path), 'addSubmodule', 'adding the submodule');
    this.clearSelectedChanges();
  }

  fetch(manualFetch: boolean = false) {
    this.setLoading(true);
    this.gitService.fetch()
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
    this.gitService.getCommandHistory()
        .then(history => {
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
    this.gitService.getCommitDiff(commit.hash)
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
    this.gitService.getBranchPremerge(branch.currentHash)
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
    this.simpleOperation(this.gitService.applyStash(index), 'applyStash', 'applying the stash');
    this.clearSelectedChanges();
  }

  deleteStash(index: number) {
    this.simpleOperation(this.gitService.deleteStash(index), 'deleteStash', 'deleting the stash');
    this.clearSelectedChanges();
  }

  createBranch(branchName: string) {
    this.simpleOperation(this.gitService.createBranch(branchName), 'createBranch', 'creating the branch');
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

  private simpleOperation(op: Promise<void>, functionName: string, occurredWhile: string, fullRefresh: boolean = true) {
    this.setLoading(true);
    op.then(() => {
      if (fullRefresh) {
        this.getFullRefresh();
      }
    }).catch(err => this.handleErrorMessage(new ErrorModel(
      this._errorClassLocation + functionName,
      occurredWhile,
      err)));
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
      this.getFullRefresh(false);
      this.fetch();
      this.applicationRef.tick();
      this.interval = setInterval(() => this.getFullRefresh(), 1000 * 60 * 5);
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
