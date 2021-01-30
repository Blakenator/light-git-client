import {
  ChangeDetectorRef,
  Component,
  ErrorHandler,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import { ElectronService } from '../../common/services/electron.service';
import { SettingsService } from '../../services/settings.service';
import { ChangeType } from '../../../../shared/git/Commit.model';
import { Channels } from '../../../../shared/Channels';
import { CommitSummaryModel } from '../../../../shared/git/CommitSummary.model';
import { BranchModel } from '../../../../shared/git/Branch.model';
import { GlobalErrorHandlerService } from '../../common/services/global-error-handler.service';
import { StashModel } from '../../../../shared/git/stash.model';
import {
  DiffHeaderModel,
  DiffHeaderStagedState,
} from '../../../../shared/git/diff.header.model';
import { FilterPipe } from '../../common/pipes/filter.pipe';
import { CommandHistoryModel } from '../../../../shared/git/command-history.model';
import { GitService } from '../../services/git.service';
import { ErrorModel } from '../../../../shared/common/error.model';
import { ErrorService } from '../../common/services/error.service';
import { CodeWatcherService } from '../../services/code-watcher.service';
import { ModalService } from '../../common/services/modal.service';
import { SubmoduleModel } from '../../../../shared/git/submodule.model';
import { LoadingService } from '../../services/loading.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TabDataService } from '../../services/tab-data.service';
import { EqualityUtil } from '../../common/equality.util';
import { JobSchedulerService } from '../../services/job-system/job-scheduler.service';
import { Job, RepoAreaDefaults } from '../../services/job-system/models';

@Component({
  selector: 'app-repo-view',
  templateUrl: './repo-view.component.html',
  styleUrls: ['./repo-view.component.scss'],
})
export class RepoViewComponent implements OnDestroy {
  selectedUnstagedChanges: { [key: string]: boolean } = {};
  selectedStagedChanges: { [key: string]: boolean } = {};
  commitDiff: DiffHeaderModel[];
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
  crlfError: { start: string; end: string };
  crlfErrorToastTimeout: number;
  activeUndo: string;
  activeCommitHistoryBranch: BranchModel;
  readonly branchReplaceChars = { match: /[\s]/g, with: '-' };
  activeDeleteBranch: BranchModel;
  activeMergeInfo: {
    into: BranchModel;
    target: BranchModel;
    currentBranch: BranchModel;
  };
  private $destroy = new Subject<void>();
  private destroyed = false;
  private periodicRefreshTimer;
  private currentCommitCursorPosition: number;
  private _errorClassLocation = 'Repo view component, ';
  private firstNoRemoteErrorDisplayed = false;
  private commitMessageDebounce: number;
  private _shouldAmendCommit: boolean;

  private readonly ON_WINDOW_FOCUS_TIMEOUT = 500;

  constructor(
    private electronService: ElectronService,
    private settingsService: SettingsService,
    private errorService: ErrorService,
    public loadingService: LoadingService,
    public codeWatcherService: CodeWatcherService,
    public modalService: ModalService,
    errorHandler: ErrorHandler,
    private _changeDetectorRef: ChangeDetectorRef,
    private tabDataService: TabDataService,
    private jobSchedulerService: JobSchedulerService,
    private gitService: GitService,
  ) {
    this.globalErrorHandlerService = <GlobalErrorHandlerService>errorHandler;
    this.gitService.onCommandHistoryUpdated
      .asObservable()
      .pipe(takeUntil(this.$destroy))
      .subscribe((history) => {
        this.commandHistory = history;
        this.changeDetectorRef.detectChanges();
      });
    this.gitService.onCrlfError
      .pipe(takeUntil(this.$destroy))
      .subscribe((status) => {
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
    this.tabDataService.onFileDiff.subscribe((path) => {
      if (path === this.getRepo().path) {
        this.getFileDiff();
      }
    });
  }

  get changeDetectorRef(): ChangeDetectorRef {
    if (!this.destroyed) {
      return this._changeDetectorRef;
    } else {
      return Object.assign({}, this._changeDetectorRef, {
        detectChanges: () => {},
      });
    }
  }

  private _repoPath: string;

  @Input()
  set repoPath(value: string) {
    if (this._repoPath != value) {
      this._repoPath = value;
    }
  }

  public getRepo() {
    return this.tabDataService.getCacheFor(this._repoPath);
  }

  getStashFilterText(stash: StashModel) {
    return stash.branchName + stash.message + stash.branchName;
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.$destroy.next();
    clearInterval(this.periodicRefreshTimer);
  }

  @HostListener('window:focus', ['$event'])
  onFocus(event: any): void {
    if (this.getRepo()) {
      setTimeout(() => {
        this.tabDataService.updateAreas(
          RepoAreaDefaults.LOCAL,
          this.getRepo().path,
        );
      }, this.ON_WINDOW_FOCUS_TIMEOUT);
    }
  }

  stageAll() {
    this.simpleOperation(
      this.gitService.stage(['.']),
      'stageAllChanges',
      'staging all changes',
    );
    this.selectedUnstagedChanges = {};
  }

  stageSelected() {
    if (
      Object.keys(this.selectedUnstagedChanges).filter(
        (x) => this.selectedUnstagedChanges[x],
      ).length == 0
    ) {
      return;
    }
    let files = this.getSelectedUnstagedFiles();
    this.simpleOperation(
      this.gitService.stage(files),
      'stageSelectedChanges',
      'staging selected changes',
    );
    this.selectedUnstagedChanges = {};
  }

  getSelectedUnstagedFiles() {
    return Object.keys(this.selectedUnstagedChanges)
      .filter((x) => this.selectedUnstagedChanges[x])
      .map((f) => f.replace(/.*?->\s*/, ''));
  }

  unstageAll() {
    this.simpleOperation(
      this.gitService.unstage(['.']),
      'unstageAllChanges',
      'unstaging all changes',
    );
    this.selectedStagedChanges = {};
  }

  unstageSelected() {
    if (
      Object.keys(this.selectedStagedChanges).filter(
        (x) => this.selectedStagedChanges[x],
      ).length == 0
    ) {
      return;
    }
    let files = this.getSelectedStagedFiles();
    this.simpleOperation(
      this.gitService.unstage(files),
      'unstageSelectedChanges',
      'unstaging selected changes',
    );
    this.selectedStagedChanges = {};
  }

  getSelectedStagedFiles() {
    return Object.keys(this.selectedStagedChanges)
      .filter((x) => this.selectedStagedChanges[x])
      .map((f) => f.replace(/.*?->\s*/, ''));
  }

  getFullRefresh() {
    this.tabDataService.updateAreas(RepoAreaDefaults.ALL, this.getRepo().path);
  }

  markDeleteBranch(branch: BranchModel) {
    this.activeDeleteBranch = branch;
    this.showModal('confirmDeleteBranch');
  }

  deleteBranch() {
    this.simpleOperation(
      this.gitService.deleteBranch([this.activeDeleteBranch]),
      'confirmDeleteBranch',
      'deleting the branch',
    ).then(() => (this.activeDeleteBranch = undefined));
  }

  pruneLocalBranches() {
    this.showModal('pruneConfirm', true);
  }

  doPrune(branches: BranchModel[]) {
    this.simpleOperation(
      this.gitService.deleteBranch(branches),
      'pruneLocalBranches',
      'pruning local branches',
    );
  }

  fastForwardBranch(branch: BranchModel) {
    this.simpleOperation(
      this.gitService.fastForwardBranch(branch),
      'fastForwardBranch',
      'fast forwarding the branch',
    );
  }

  mergeBranch() {
    const doMerge = () => {
      let updateMessage = () => {
        if (
          (this.getRepo().changes.stagedChanges.length > 0 ||
            this.getRepo().changes.unstagedChanges.length > 0) &&
          !this.getRepo().changes.description?.trim()
        ) {
          this.getRepo().changes.description = `Merged ${
            this.activeMergeInfo.target.name
          } into ${this.tabDataService.getCurrentBranch().name}`;
        }
      };
      this.simpleOperation(
        this.gitService.mergeBranch(this.activeMergeInfo.target.name),
        'mergeBranch',
        'merging the branch',
        false,
        true,
        true,
      )
        .then(updateMessage)
        .catch(updateMessage);
    };

    if (
      this.tabDataService.getCurrentBranch() &&
      this.tabDataService.getCurrentBranch().name ==
        this.activeMergeInfo.into.name
    ) {
      doMerge();
    } else {
      this.simpleOperation(
        this.gitService.checkout(this.activeMergeInfo.into.name, false),
        'mergeBranch',
        'checking out the base branch',
        false,
        true,
        true,
      )
        .then(() => {
          doMerge();
        })
        .catch(() => {});
    }
  }

  renameBranch(branch: { oldName: string; newName: string }) {
    this.simpleOperation(
      this.gitService.renameBranch(branch),
      'renameBranch',
      'renaming the branch',
    );
  }

  openTerminal() {
    this.electronService
      .rpc(Channels.OPENTERMINAL, [this.getRepo().path])
      .then((ignore) => {})
      .catch((err) =>
        this.handleErrorMessage(
          new ErrorModel(this._errorClassLocation + 'openTerminal', '', err),
        ),
      );
  }

  openFolder(path: string = '') {
    this.electronService
      .rpc(Channels.OPENFOLDER, [this.getRepo().path, path])
      .then((ignore) => {})
      .catch((err) =>
        this.handleErrorMessage(
          new ErrorModel(
            this._errorClassLocation + 'openFolder',
            'opening the folder',
            err,
          ),
        ),
      );
  }

  getFileDiff() {
    // todo: move this to tab data service
    let unstaged = Object.keys(this.selectedUnstagedChanges)
      .filter((x) => this.selectedUnstagedChanges[x])
      .map((x) => x.replace(/.*->\s*/, ''));
    let staged = Object.keys(this.selectedStagedChanges)
      .filter((x) => this.selectedStagedChanges[x])
      .map((x) => x.replace(/.*->\s*/, ''));
    if (staged.length == 0 && unstaged.length == 0) {
      unstaged = ['.'];
      staged = ['.'];
    }

    this.jobSchedulerService
      .scheduleSimpleOperation(this.gitService.getFileDiff(unstaged, staged))
      .result.then((diff) => {
        this.getRepo().diff = diff.sort((a, b) => {
          if (a.stagedState != b.stagedState) {
            return a.stagedState == DiffHeaderStagedState.UNSTAGED ? 1 : -1;
          }
          return a.toFilename.localeCompare(b.toFilename);
        });
        this.hasWatcherAlerts =
          this.codeWatcherService.getWatcherAlerts(this.getRepo().diff).length >
          0;
        this.changeDetectorRef.detectChanges();
      })
      .catch((err) =>
        this.handleErrorMessage(
          new ErrorModel(
            this._errorClassLocation + 'getFileDiff',
            'getting the file differences',
            err,
          ),
        ),
      );
  }

  getCommitHistory(skip: number = 0) {
    if (!this.gitService.getRepo()) {
      setTimeout(() => this.getCommitHistory(skip), 100);
      return;
    }

    this.jobSchedulerService
      .scheduleSimpleOperation(
        this.gitService.getCommitHistory(
          skip,
          this.activeCommitHistoryBranch
            ? this.activeCommitHistoryBranch.name
            : undefined,
        ),
      )
      .result.then((commits) => {
        if (EqualityUtil.listsEqual(this.getRepo().commitHistory, commits)) {
          return;
        }
        if (!skip || skip == 0) {
          this.getRepo().commitHistory = commits;
        } else {
          this.getRepo().commitHistory = this.getRepo().commitHistory.concat(
            commits,
          );
        }
        this.changeDetectorRef.detectChanges();
      })
      .catch((err) =>
        this.handleErrorMessage(
          new ErrorModel(
            this._errorClassLocation + 'getCommitHistory',
            'getting commit history',
            err,
          ),
        ),
      );
  }

  commit() {
    if (
      this.getRepo().changes.stagedChanges.length == 0 &&
      this.tabDataService.getCurrentBranch()
    ) {
      return;
    }

    this.jobSchedulerService
      .scheduleSimpleOperation(
        this.gitService.commit(
          this.getRepo().changes.description.trim().length <= 0 &&
            this._shouldAmendCommit
            ? this.tabDataService.getCurrentBranch().lastCommitText
            : this.getRepo().changes.description,
          this.settingsService.settings.commitAndPush,
          this._shouldAmendCommit,
          this.tabDataService.getCurrentBranch(),
        ),
      )
      .result.then(() => {
        this.getRepo().changes.description = '';
        this.showDiff = false;
      })
      .catch((err) => {
        return this.handleErrorMessage(
          new ErrorModel(
            this._errorClassLocation + 'commit',
            'committing',
            err,
          ),
        );
      });
    this.clearSelectedChanges();
  }

  cherryPickCommit(commit: CommitSummaryModel) {
    this.simpleOperation(
      this.gitService.cherryPickCommit(commit.hash),
      'cherryPickCommit',
      'cherry-picking commit onto current branch',
    );
    this.clearSelectedChanges();
  }

  checkout(event: { branch: string; andPull: boolean }, newBranch: boolean) {
    let localBranchExists = this.tabDataService
      .getLocalBranchMap()
      .has(event.branch.replace('origin/', ''));
    this.simpleOperation(
      this.gitService.checkout(
        localBranchExists ? event.branch.replace('origin/', '') : event.branch,
        newBranch && !localBranchExists,
        event.andPull,
      ),
      'checkout',
      'checking out the branch',
    );
    this.clearSelectedChanges();
  }

  pull(force: boolean) {
    this.simpleOperation(
      this.gitService.pull(force),
      'pull',
      'pulling the branch',
    );
    this.clearSelectedChanges();
  }

  push(branch: BranchModel, force: boolean) {
    this.simpleOperation(
      this.gitService.push(branch, force),
      'push',
      'pushing the branch',
    );
    this.clearSelectedChanges();
  }

  deleteFiles(files: string[]) {
    this.simpleOperation(
      this.gitService.deleteFiles(files),
      'deleteFiles',
      'deleting the file',
    );
    this.clearSelectedChanges();
  }

  merge(file: string) {
    this.simpleOperation(
      this.gitService.mergeFile(file, this.settingsService.settings.mergetool),
      'mergeFiles',
      'merging the file',
    );
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
      'creating the stash',
    );
    this.clearSelectedChanges();
  }

  hardReset() {
    this.simpleOperation(
      this.gitService.hardReset(),
      'hardReset',
      'resetting all changes',
    );
    this.clearSelectedChanges();
  }

  undoFileChanges(files: string[], staged: boolean, revision: string = '') {
    if (files.length === 0) {
      return;
    }
    const fileSet = new Set(files);
    const changes = (staged
      ? this.getRepo().changes.stagedChanges
      : this.getRepo().changes.unstagedChanges
    ).filter((change) => fileSet.has(change.file));
    const changeSet = new Set(changes.map((change) => change.file));
    const submoduleSet = new Set(
      this.getRepo().submodules.map((mod) => mod.path),
    );

    const deletes = changes
      .filter(
        (change) =>
          (change.change === ChangeType.Addition ||
            change.change === ChangeType.Untracked) &&
          !submoduleSet.has(change.file),
      )
      .map((change) => change.file);
    const undos = changes
      .filter(
        (change) =>
          change.change !== ChangeType.Addition &&
          change.change !== ChangeType.Untracked &&
          !submoduleSet.has(change.file),
      )
      .map((change) => change.file);
    const subs = this.getRepo().submodules.filter((sub) =>
      changeSet.has(sub.path),
    );

    this.simpleOperation(
      this.gitService.undoFileChanges(undos, revision, staged),
      'undoFileChanges',
      'undoing changes for the files',
    );
    this.deleteFiles(deletes);
    this.undoSubmoduleChanges(subs);

    this.clearSelectedChanges();
    this.activeUndo = undefined;
  }

  undoSubmoduleChanges(submodules: SubmoduleModel[]) {
    this.simpleOperation(
      this.gitService.undoSubmoduleChanges(submodules),
      'undoSubmoduleChanges',
      'undoing changes for the submodules',
    );
    this.clearSelectedChanges();
  }

  confirmUndo(file: string) {
    this.activeUndo = file;
    this.showModal('undoFileModal');
  }

  getCurrentBranch(): BranchModel {
    return this.tabDataService.getCurrentBranch();
  }

  deleteWorktree(w) {
    this.simpleOperation(
      this.gitService.deleteWorktree(w.name),
      'deleteWorktree',
      'deleting the worktree',
    );
    this.clearSelectedChanges();
  }

  updateSubmodules(recursive: boolean, branch?: string) {
    this.simpleOperation(
      this.gitService.updateSubmodules(branch, recursive),
      'updateSubmodules',
      'updating the submodules',
    );
    this.clearSelectedChanges();
  }

  addSubmodule(url: string, path: string) {
    this.simpleOperation(
      this.gitService.addSubmodule(url, path),
      'addSubmodule',
      'adding the submodule',
    );
    this.clearSelectedChanges();
  }

  fetch(manualFetch: boolean = false) {
    this.jobSchedulerService
      .scheduleSimpleOperation(this.gitService.fetch())
      .result.catch((err: string) => {
        if (
          err &&
          err.indexOf(
            'No remote repository specified.  Please, specify either a URL or a',
          ) >= 0 &&
          (!this.firstNoRemoteErrorDisplayed || manualFetch)
        ) {
          this.handleErrorMessage(
            new ErrorModel(
              this._errorClassLocation + 'fetch',
              'fetching remote changes',
              err,
            ),
          );
          this.firstNoRemoteErrorDisplayed = true;
        }
        if (
          err &&
          err.indexOf(
            'No remote repository specified.  Please, specify either a URL or a',
          ) < 0
        ) {
          this.handleErrorMessage(
            new ErrorModel(
              this._errorClassLocation + 'fetch',
              'fetching remote changes',
              err,
            ),
          );
        }
      });
  }

  getCommandHistory() {
    this.jobSchedulerService
      .scheduleSimpleOperation(this.gitService.getCommandHistory())
      .result.then((history) => {
        this.commandHistory = history;
        this.changeDetectorRef.detectChanges();
      })
      .catch((err) =>
        this.handleErrorMessage(
          new ErrorModel(
            this._errorClassLocation + 'getCommandHistory',
            'fetching git command history',
            err,
          ),
        ),
      );
  }

  toggleExpandState(key: string) {
    this.settingsService.settings.expandStates[key] = !this.settingsService
      .settings.expandStates[key];
    this.settingsService.saveSettings();
  }

  getExpandState(key: string) {
    return this.settingsService.settings.expandStates[key];
  }

  selectionChanged(
    selectedChanges: { [key: string]: boolean },
    isStaged: boolean,
  ) {
    if (isStaged) {
      this.selectedStagedChanges = selectedChanges;
    } else {
      this.selectedUnstagedChanges = selectedChanges;
    }
    this.getFileDiff();
    this.diffCommitInfo = undefined;
    setTimeout(() => (this.showDiff = true), 300);
  }

  leaveCommitDiff() {
    this.diffCommitInfo = undefined;
    this.commitDiff = undefined;
  }

  viewCommitDiff(commit: string) {
    let commitToView = this.getRepo().commitHistory.find(
      (x) => x.hash == commit || x.hash.startsWith(commit),
    );
    if (!commitToView) {
      return;
    }

    this.jobSchedulerService
      .scheduleSimpleOperation(this.gitService.getCommitDiff(commit))
      .result.then((diff) => {
        this.commitDiff = diff;
        this.showDiff = true;
        this.diffCommitInfo = commitToView;

        this.changeDetectorRef.detectChanges();
      })
      .catch((err) =>
        this.handleErrorMessage(
          new ErrorModel(
            this._errorClassLocation + 'viewCommitDiff',
            'getting file differences for the commit',
            err,
          ),
        ),
      );
  }

  getBranchPremerge(branch: BranchModel) {
    this.jobSchedulerService
      .scheduleSimpleOperation(
        this.gitService.getBranchPremerge(branch.currentHash),
      )
      .result.then((diff) => {
        this.commitDiff = diff;
        this.showDiff = true;
        this.diffCommitInfo = new CommitSummaryModel();
        const currentBranch = this.tabDataService.getCurrentBranch();
        this.diffCommitInfo.hash =
          branch.currentHash + ' <--> ' + currentBranch.currentHash;
        this.diffCommitInfo.message =
          "Diff of all changes since last common ancestor between '" +
          branch.name +
          "' and '" +
          currentBranch.name +
          "'";

        this.changeDetectorRef.detectChanges();
      })
      .catch((err) =>
        this.handleErrorMessage(
          new ErrorModel(
            this._errorClassLocation + 'branchPremerge',
            'getting changes since branch created',
            err,
          ),
        ),
      );
  }

  applyStash(index: number) {
    this.simpleOperation(
      this.gitService.applyStash(index),
      'applyStash',
      'applying the stash',
    );
    this.clearSelectedChanges();
  }

  viewStash(index: number) {
    this.jobSchedulerService
      .scheduleSimpleOperation(this.gitService.getStashDiff(index))
      .result.then((diff) => {
        this.commitDiff = diff;
        this.showDiff = true;
        let commitInfo = new CommitSummaryModel();
        commitInfo.message = this.getRepo().stashes[index].message;
        this.diffCommitInfo = commitInfo;

        this.changeDetectorRef.detectChanges();
      })
      .catch((err) =>
        this.handleErrorMessage(
          new ErrorModel(
            this._errorClassLocation + 'viewStashDiff',
            'getting file differences for the stash',
            err,
          ),
        ),
      );
  }

  deleteStash(index: number) {
    this.getRepo().stashes.splice(index, 1);
    this.getRepo().stashes.forEach((stash, i) => (stash.index = i));
    this.simpleOperation(
      this.gitService.deleteStash(index),
      'deleteStash',
      'deleting the stash',
    );
    this.clearSelectedChanges();
  }

  createBranch(branchName: string) {
    this.simpleOperation(
      this.gitService.createBranch(branchName),
      'createBranch',
      'creating the branch',
    );
  }

  getCreateStashDefaultText() {
    return this.tabDataService.getCurrentBranch()?.lastCommitText ?? '';
  }

  getFilenameChunks(filename: string) {
    return filename.replace('->', '/->/').split('/');
  }

  getCommitSuggestions() {
    let partial = this.getRepo().changes.description;
    if (!partial || !this.settingsService.settings.commitMessageAutocomplete) {
      this.suggestions = [];
      return [];
    }

    let lastWord,
      index = 0;
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
    this.getRepo().changes.stagedChanges.forEach((x) =>
      this.getFilenameChunks(x.file).forEach((filenameChunk) => {
        let suggestion = filenameChunk.trim().replace(/\.[^\.]*$/, '');
        return (optionsSet[suggestion] = this.levenshtein(
          suggestion.toLowerCase(),
          lastWord.toLowerCase(),
        ));
      }),
    );
    this.getRepo().changes.unstagedChanges.forEach((x) =>
      this.getFilenameChunks(x.file).forEach((filenameChunk) => {
        let suggestion = filenameChunk.trim().replace(/\.[^\.]*$/, '');
        return (optionsSet[suggestion] = this.levenshtein(
          suggestion.toLowerCase(),
          lastWord.toLowerCase(),
        ));
      }),
    );

    if (this.tabDataService.getCurrentBranch()) {
      const currentBranchName = this.tabDataService.getCurrentBranch().name;
      this.getFilenameChunks(currentBranchName).forEach(
        (y) =>
          (optionsSet[y.trim()] = this.levenshtein(
            currentBranchName,
            lastWord,
          )),
      );
    }
    const result = Object.keys(optionsSet)
      // .sort((a, b) => optionsSet[a] - optionsSet[b])
      .filter(
        (x) =>
          FilterPipe.fuzzyFilter(
            lastWord.toLowerCase(),
            x.toLocaleLowerCase(),
          ) || optionsSet[x] < lastWord.length / 3,
      )
      .slice(0, 5);
    this.suggestions = result;
    return result;
  }

  setCurrentCursorPosition($event: KeyboardEvent | any) {
    if (this.commitMessageDebounce) {
      clearTimeout(this.commitMessageDebounce);
    }
    if (!this.settingsService.settings.commitMessageAutocomplete) {
      return false;
    }
    this.commitMessageDebounce = window.setTimeout(() => {
      this.currentCommitCursorPosition = $event.target.selectionStart;

      if (
        ['Enter', 'ArrowUp', 'ArrowDown', 'Escape', 'Tab'].indexOf($event.key) <
        0
      ) {
        this.getCommitSuggestions();
      }
      if (this.suggestions.length == 0) {
        return;
      }
      $event.stopPropagation();
      if ($event.key == 'Enter' && !$event.ctrlKey && !$event.metaKey) {
        this.currentCommitCursorPosition--;
        this.chooseAutocomleteItem(true);
      } else if ($event.key == 'Tab' && !$event.ctrlKey && !$event.metaKey) {
        $event.preventDefault();
        this.chooseAutocomleteItem(true);
      } else if ($event.key == 'ArrowUp') {
        this.selectedAutocompleteItem = Math.max(
          0,
          this.selectedAutocompleteItem - 1,
        );
      } else if ($event.key == 'ArrowDown') {
        this.selectedAutocompleteItem = Math.min(
          this.suggestions.length,
          this.selectedAutocompleteItem + 1,
        );
      } else if ($event.key == 'Escape') {
        this.suggestions = [];
      }
    }, 300);
  }

  chooseAutocomleteItem(removeEnter: boolean, item?: number) {
    this.selectedAutocompleteItem = item || this.selectedAutocompleteItem;
    this.getRepo().changes.description =
      this.getRepo().changes.description.substring(
        0,
        this.currentCommitCursorPosition - this.positionInAutoComplete,
      ) +
      this.suggestions[this.selectedAutocompleteItem] +
      this.getRepo().changes.description.substring(
        this.currentCommitCursorPosition + (removeEnter ? 1 : 0),
      );
    this.selectedAutocompleteItem = 0;
    this.suggestions = [];
  }

  setAddWorktreeVisible(val: boolean) {
    this.showModal('addWorktree', val);
  }

  getCommandHistoryFilterableText(command: CommandHistoryModel) {
    return command.name + command.command;
  }

  handleErrorMessage(error: ErrorModel) {
    this.errorService.receiveError(error);
  }

  hunkChangeError($event: any) {
    this.handleErrorMessage(
      new ErrorModel('', 'saving changes to the hunk', $event),
    );
  }

  viewSubmodule(submodule: SubmoduleModel) {
    this.activeSubmodule = submodule;
    this.showModal('submoduleViewer');
  }

  cancelSuggestions() {
    if (this.settingsService.settings.commitMessageAutocomplete) {
      setTimeout(() => {
        this.suggestions = [];
        this.changeDetectorRef.detectChanges();
      }, 300);
    }
  }

  setFilenameSplit(val: boolean) {
    this.settingsService.settings.splitFilenameDisplay = val;
    this.settingsService.saveSettings();
  }

  handleActiveBranchUpdate(branch: BranchModel) {
    this.activeCommitHistoryBranch = branch;
    this.getCommitHistory();
  }

  startCommit(amend: boolean) {
    this._shouldAmendCommit = amend;
    if (this.getRepo().changes.stagedChanges.length > 0) {
      this.codeWatcherService.showWatchers();
    }
  }

  cancelMerge() {
    this.activeMergeInfo = undefined;
  }

  startMerge(target?: BranchModel) {
    let currentBranch = this.tabDataService.getCurrentBranch();
    this.activeMergeInfo = {
      into: currentBranch,
      currentBranch,
      target,
    };
    this.showModal('mergeBranchModal');
  }

  showRestoreStashDialog() {
    this.showModal('restoreDeletedStash');
  }

  resolveConflictsUsing(file: string, theirs: boolean) {
    this.simpleOperation(
      this.gitService.resolveConflictsUsing(file, theirs),
      'resolveConflictsUsing',
      'resolving conflicts',
    );
  }

  getCommitDisabledTooltip() {
    if (this.loadingService.isLoading) {
      return 'Refreshing repo info, please wait';
    } else if (this.getRepo().changes.stagedChanges.length === 0) {
      return 'No staged changes';
    } else if (!this.tabDataService.getCurrentBranch()) {
      return 'No branch checked out';
    } else {
      return '';
    }
  }

  private simpleOperation(
    op: Job<void>,
    functionName: string,
    occurredWhile: string,
    clearCommitInfo: boolean = false,
    fullRefresh: boolean = true,
    rethrowException: boolean = false,
  ): Promise<void> {
    clearTimeout(this.debounceRefreshTimer);
    return this.jobSchedulerService
      .scheduleSimpleOperation(op)
      .result.catch((err) => {
        this.handleErrorMessage(
          new ErrorModel(
            this._errorClassLocation + functionName,
            occurredWhile,
            err,
          ),
        );
        if (rethrowException) {
          throw err;
        }
      });
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

    let i,
      j,
      res,
      alen = a.length,
      blen = b.length,
      row = Array(alen);
    for (i = 0; i <= alen; i++) {
      row[i] = i;
    }

    for (i = 1; i <= blen; i++) {
      res = i;
      for (j = 1; j <= alen; j++) {
        tmp = row[j - 1];
        row[j - 1] = res;
        res =
          b[i - 1] === a[j - 1]
            ? tmp
            : Math.min(tmp + 1, Math.min(res + 1, row[j] + 1));
      }
    }
    return res;
  }

  private loadRepo(path: string = '') {
    this._repoPath =
      path ||
      (this.isNested
        ? this._repoPath
        : this.tabDataService.activeRepoCache.path || this._repoPath);

    this.jobSchedulerService
      .scheduleSimpleOperation(this.gitService.loadRepo(this._repoPath))
      .result.then(() => {
        this.periodicRefreshTimer = setInterval(
          () => this.getFullRefresh(),
          1000 * 60 * 5,
        );
      })
      .catch((err) => {
        this.onLoadRepoFailed.emit(
          new ErrorModel(
            this._errorClassLocation + 'loadRepo',
            'loading the repo',
            err,
          ),
        );
      });
  }

  private clearSelectedChanges() {
    this.selectedUnstagedChanges = {};
    this.selectedStagedChanges = {};
  }
}
