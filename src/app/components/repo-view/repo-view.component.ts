import {
  ChangeDetectorRef,
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
import {DiffHeaderModel, DiffHeaderStagedState} from '../../../../shared/git/diff.header.model';
import {FilterPipe} from '../../common/pipes/filter.pipe';
import {CommandHistoryModel} from '../../../../shared/git/command-history.model';
import {GitService} from '../../services/git.service';
import {ErrorModel} from '../../../../shared/common/error.model';
import {ErrorService} from '../../common/services/error.service';
import {CodeWatcherService} from '../../services/code-watcher.service';
import {ModalService} from '../../common/services/modal.service';
import {SubmoduleModel} from '../../../../shared/git/submodule.model';
import {LoadingService} from '../../services/loading.service';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {TabService} from '../../services/tab.service';

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
  commitHistory: CommitSummaryModel[] = [];
  showDiff = false;
  @Input() isNested = false;
  localBranchFilter = '';
  remoteBranchFilter = '';
  globalErrorHandlerService: GlobalErrorHandlerService;
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
  hasWatcherAlerts = false;
  crlfError: { start: string, end: string };
  crlfErrorToastTimeout: number;
  activeUndo: string;
  activeCommitHistoryBranch: BranchModel;
  branchesToPrune: string[];
  readonly branchReplaceChars = {match: /[\s]/g, with: '-'};
  private $destroy = new Subject<void>();
  private destroyed = false;
  private refreshDebounce;
  private currentCommitCursorPosition: number;
  private _errorClassLocation = 'Repo view component, ';
  private firstNoRemoteErrorDisplayed = false;
  private commitMessageDebounce: number;

  constructor(private electronService: ElectronService,
              private settingsService: SettingsService,
              private errorService: ErrorService,
              public loadingService: LoadingService,
              public codeWatcherService: CodeWatcherService,
              public modalService: ModalService,
              errorHandler: ErrorHandler,
              private _changeDetectorRef: ChangeDetectorRef,
              private tabService: TabService,
              private gitService: GitService) {
    this.globalErrorHandlerService = <GlobalErrorHandlerService>errorHandler;
    this.gitService.onCommandHistoryUpdated.asObservable().pipe(takeUntil(this.$destroy)).subscribe(history => {
      this.commandHistory = history;
      this.changeDetectorRef.detectChanges();
    });
    this.gitService.onCrlfError.pipe(takeUntil(this.$destroy)).subscribe(status => {
      if (this.crlfErrorToastTimeout) {
        clearTimeout(this.crlfErrorToastTimeout);
        this.crlfErrorToastTimeout = undefined;
      }
      this.crlfError = status;
      this.changeDetectorRef.detectChanges();
      this.crlfErrorToastTimeout = window.setTimeout(() => {
        this.crlfError = undefined;
        this.crlfErrorToastTimeout = undefined;
        this.changeDetectorRef.detectChanges();
      }, 5000);
    });
    this.repoViewUid = Math.round(Math.random() * 10000000);
  }

  get changeDetectorRef(): ChangeDetectorRef {
    if (!this.destroyed) {
      return this._changeDetectorRef;
    } else {
      return Object.assign({}, this._changeDetectorRef, {
        detectChanges: () => {
        },
      });
    }
  }

  private _repoPath: string;

  @Input()
  set repoPath(value: string) {
    if (this._repoPath != value) {
      this._repoPath = value;
      this.loadRepo(this._repoPath);
    }
  }

  getStashFilterText(stash: StashModel) {
    return stash.branchName + stash.message + stash.branchName;
  }

  ngOnInit() {
    this.loadRepo();
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.$destroy.next();
    clearInterval(this.refreshDebounce);
  }

  @HostListener('window:focus', ['$event'])
  onFocus(event: any): void {
    if (this.repo) {
      this.getFullRefresh(false, !this.showDiff || this.diffCommitInfo != undefined);
    }
  }

  stageAll() {
    this.simpleOperation(this.gitService.stage(['.']), 'stageAllChanges', 'staging all changes');
    this.selectedUnstagedChanges = {};
  }

  stageSelected() {
    if (Object.keys(this.selectedUnstagedChanges).filter(x => this.selectedUnstagedChanges[x]).length == 0) {
      return;
    }
    let files = Object.keys(this.selectedUnstagedChanges)
                      .filter(x => this.selectedUnstagedChanges[x])
                      .map(f => f.replace(/.*?->\s*/, ''));
    this.simpleOperation(this.gitService.stage(files), 'stageSelectedChanges', 'staging selected changes');
    this.selectedUnstagedChanges = {};
  }

  unstageAll() {
    this.simpleOperation(this.gitService.unstage(['.']), 'unstageAllChanges', 'unstaging all changes');
    this.selectedStagedChanges = {};
  }

  unstageSelected() {
    if (Object.keys(this.selectedStagedChanges).filter(x => this.selectedStagedChanges[x]).length == 0) {
      return;
    }
    let files = Object.keys(this.selectedStagedChanges)
                      .filter(x => this.selectedStagedChanges[x])
                      .map(f => f.replace(/.*?->\s*/, ''));
    this.simpleOperation(this.gitService.unstage(files), 'unstageSelectedChanges', 'unstaging selected changes');
    this.selectedStagedChanges = {};
  }

  getFullRefresh(clearCommitInfo: boolean, keepDiffCommitSelection: boolean = true, manualFetch: boolean = false) {
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
      this.getFileDiff(clearCommitInfo);
      this.loadingService.setLoading(true);
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
    this.loadingService.setLoading(true);
    this.gitService.getBranchChanges()
        .then(changes => this.handleBranchChanges(changes))
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'getBranches',
          'getting branch changes',
          err)));
  }

  deleteBranch(branch: string) {
    this.simpleOperation(this.gitService.deleteBranch([branch]), 'deleteBranch', 'deleting the branch');
  }

  pruneLocalBranches() {
    this.branchesToPrune = this.repo.localBranches.filter(branch => !branch.trackingPath && !branch.isCurrentBranch)
                               .map(b => b.name);
    this.showModal('pruneConfirm', true);
  }

  doPrune() {
    this.simpleOperation(
      this.gitService.deleteBranch(this.branchesToPrune),
      'pruneLocalBranches',
      'pruning local branches');
  }

  fastForwardBranch(branch: string) {
    this.simpleOperation(this.gitService.fastForwardBranch(branch), 'fastForwardBranch', 'fast forwarding the branch');
  }

  mergeBranch(branch: string) {
    this.simpleOperation(this.gitService.mergeBranch(branch), 'mergeBranch', 'merging the branch')
        .then(() => {
          if ((this.changes.stagedChanges.length > 0 || this.changes.unstagedChanges.length > 0) &&
            !this.changes.description &&
            !this.changes.description.trim()) {
            this.changes.description = `Merged ${branch} into ${this.repo.localBranches.find(
              b => b.isCurrentBranch).name}`;
          }
        });
  }

  renameBranch(branch: { oldName: string, newName: string }) {
    this.simpleOperation(this.gitService.renameBranch(branch), 'renameBranch', 'renaming the branch');
  }

  openTerminal() {
    this.loadingService.setLoading(true);
    this.electronService.rpc(Channels.OPENTERMINAL, [this.repo.path]).then(ignore => {
    }).catch(err => this.handleErrorMessage(new ErrorModel(this._errorClassLocation + 'openTerminal', '', err)));
  }

  openFolder(path: string = '') {
    this.loadingService.setLoading(true);
    this.electronService.rpc(Channels.OPENFOLDER, [this.repo.path, path])
        .then(ignore => {
        })
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'openFolder',
          'opening the folder',
          err)));
  }

  getFileDiff(manualRefresh: boolean = false) {
    if (!manualRefresh && this.diffCommitInfo) {
      return;
    } else if (manualRefresh) {
      this.diffCommitInfo = undefined;
    }
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
    this.loadingService.setLoading(true);
    this.gitService.getFileDiff(unstaged, staged)
        .then(diff => {
          this.diffHeaders = diff.sort((a, b) => {
            if (a.stagedState != b.stagedState) {
              return a.stagedState == DiffHeaderStagedState.UNSTAGED ? 1 : -1;
            }
            return a.toFilename.localeCompare(b.toFilename);
          });
          this.hasWatcherAlerts = this.codeWatcherService.getWatcherAlerts(this.diffHeaders).length > 0;
          this.changeDetectorRef.detectChanges();
          this.loadingService.setLoading(false);
        })
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'getFileDiff',
          'getting the file differences',
          err)));
  }

  getCommitHistory(skip: number = 0) {
    if (!this.gitService.isRepoLoaded) {
      setTimeout(() => this.getCommitHistory(skip), 100);
      return;
    }
    this.loadingService.setLoading(true);
    this.gitService.getCommitHistory(
      skip,
      this.activeCommitHistoryBranch ? this.activeCommitHistoryBranch.name : undefined)
        .then(commits => {
          if (!skip || skip == 0) {
            this.commitHistory = commits;
          } else {
            this.commitHistory = this.commitHistory.concat(commits);
          }
          this.changeDetectorRef.detectChanges();
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
    this.loadingService.setLoading(true);
    this.gitService.commit(this.changes.description, this.settingsService.settings.commitAndPush)
        .then(() => {
          this.changes.description = '';
          this.showDiff = false;
          this.getFullRefresh(false, false);
        })
        .catch(err => {
          return this.handleErrorMessage(new ErrorModel(this._errorClassLocation + 'commit', 'committing', err));
        });
    this.clearSelectedChanges();
  }

  cherryPickCommit(commit: CommitSummaryModel) {
    this.simpleOperation(
      this.gitService.cherryPickCommit(commit.hash),
      'cherryPickCommit',
      'cherry-picking commit onto current branch');
    this.clearSelectedChanges();
  }

  checkout(event: { branch: string, andPull: boolean }, newBranch: boolean) {
    let localBranchExists = this.repo.localBranches.find(local => local.name == event.branch.replace('origin/', ''));
    this.simpleOperation(this.gitService.checkout(
      localBranchExists ? event.branch.replace('origin/', '') : event.branch,
      newBranch && !localBranchExists,
      event.andPull), 'checkout', 'checking out the branch');
    this.clearSelectedChanges();
  }

  pull(force: boolean) {
    this.simpleOperation(this.gitService.pull(force), 'pull', 'pulling the branch');
    this.clearSelectedChanges();
  }

  push(branch: BranchModel, force: boolean) {
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
    this.activeUndo = undefined;
  }

  confirmUndo(file: string) {
    this.activeUndo = file;
    this.showModal('undoFileModal');
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
    this.loadingService.setLoading(true);
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
    this.loadingService.setLoading(true);
    this.gitService.getCommandHistory()
        .then(history => {
          this.commandHistory = history;
          this.changeDetectorRef.detectChanges();
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
    this.getFileDiff(true);
    this.diffCommitInfo = undefined;
    setTimeout(() => this.showDiff = true, 300);
  }

  leaveCommitDiff() {
    this.diffCommitInfo = undefined;
    this.showDiff = false;
    this.getFileDiff();
  }

  viewCommitDiff(commit: string) {
    let commitToView = this.commitHistory.find(x => x.hash == commit || x.hash.startsWith(commit));
    if (!commitToView) {
      return;
    }
    this.loadingService.setLoading(true);
    this.gitService.getCommitDiff(commit)
        .then(diff => {
          this.diffHeaders = diff;
          this.showDiff = true;
          this.diffCommitInfo = commitToView;
          this.loadingService.setLoading(false);
          this.changeDetectorRef.detectChanges();
        })
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'viewCommitDiff',
          'getting file differences for the commit',
          err)));
  }

  getBranchPremerge(branch: BranchModel) {
    this.loadingService.setLoading(true);
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
          this.loadingService.setLoading(false);
          this.changeDetectorRef.detectChanges();
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

  viewStash(index: number) {
    this.gitService.getStashDiff(index)
        .then(diff => {
          this.diffHeaders = diff;
          this.showDiff = true;
          let commitInfo = new CommitSummaryModel();
          commitInfo.message = this.repo.stashes[index].message;
          this.diffCommitInfo = commitInfo;
          this.loadingService.setLoading(false);
          this.changeDetectorRef.detectChanges();
        })
        .catch(err => this.handleErrorMessage(new ErrorModel(
          this._errorClassLocation + 'viewStashDiff',
          'getting file differences for the stash',
          err)));
  }

  deleteStash(index: number) {
    this.repo.stashes.splice(index, 1);
    this.repo.stashes.forEach((stash, i) => stash.index = i);
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
          .forEach(filenameChunk => {
            let suggestion = filenameChunk.trim().replace(/\.[^\.]*$/, '');
            return optionsSet[suggestion] = this.levenshtein(suggestion.toLowerCase(), lastWord.toLowerCase());
          }));
    this.changes.unstagedChanges.forEach(x =>
      this.getFilenameChunks(x.file)
          .forEach(filenameChunk => {
            let suggestion = filenameChunk.trim().replace(/\.[^\.]*$/, '');
            return optionsSet[suggestion] = this.levenshtein(suggestion.toLowerCase(), lastWord.toLowerCase());
          }));

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
    if (this.commitMessageDebounce) {
      clearTimeout(this.commitMessageDebounce);
    }
    this.commitMessageDebounce = window.setTimeout(() => {
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
    }, 300);
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
    this.changeDetectorRef.detectChanges();
    this.loadingService.setLoading(false);
  }

  handleErrorMessage(error: ErrorModel) {
    this.errorService.receiveError(error);
    this.loadingService.setLoading(false);
  }

  hunkChangeError($event: any) {
    this.handleErrorMessage(
      new ErrorModel('', 'saving changes to the hunk', $event));
  }

  viewSubmodule(submodule: SubmoduleModel) {
    this.activeSubmodule = submodule;
    this.showModal('submoduleViewer');
  }

  cancelSuggestions() {
    setTimeout(() => {
      this.suggestions = [];
      this.changeDetectorRef.detectChanges();
    }, 300);
  }

  setFilenameSplit(val: boolean) {
    this.settingsService.settings.splitFilenameDisplay = val;
    this.settingsService.saveSettings();
  }

  handleActiveBranchUpdate(branch: BranchModel) {
    this.activeCommitHistoryBranch = branch;
    this.getCommitHistory();
  }

  startCommit() {
    if (this.changes.stagedChanges.length > 0) {
      this.codeWatcherService.showWatchers();
    }
  }

  private simpleOperation(op: Promise<void>,
                          functionName: string,
                          occurredWhile: string,
                          clearCommitInfo: boolean = false,
                          fullRefresh: boolean = true): Promise<void> {
    this.loadingService.setLoading(true);
    return op.then(() => {
      if (fullRefresh) {
        this.getFullRefresh(clearCommitInfo);
      }
      return Promise.resolve();
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
    this._repoPath = path || (this.isNested ?
                              this._repoPath :
                              this.tabService.activeRepoCache.path || this._repoPath);
    this.repo = this.tabService.activeRepoCache;
    this.loadingService.setLoading(true);
    this.gitService.loadRepo(this._repoPath)
        .then(repo => {
          this.repo = repo;
          if (!this.isNested) {
            Object.assign(this.tabService.activeRepoCache, this.repo);
          }
          this.getCommandHistory();
          this.getFullRefresh(false, false);
          this.changeDetectorRef.detectChanges();
          this.refreshDebounce = setInterval(() => this.getFullRefresh(false), 1000 * 60 * 5);
        }).catch(err => {
      this.loadingService.setLoading(false);
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
    Object.assign(this.tabService.activeRepoCache, this.repo || {});
    this.changeDetectorRef.detectChanges();
    this.loadingService.setLoading(false);
  }
}
