import { Injectable } from '@angular/core';
import { Channels } from '../../../shared/Channels';
import { ElectronService } from '../common/services/electron.service';
import { ConfigItemModel } from '../../../shared/git/config-item.model';
import { DiffHeaderModel } from '../../../shared/git/diff.header.model';
import { BehaviorSubject, Subject } from 'rxjs';
import { CommandHistoryModel } from '../../../shared/git/command-history.model';
import { DiffHunkModel } from '../../../shared/git/diff.hunk.model';
import { ErrorModel } from '../../../shared/common/error.model';
import { ErrorService } from '../common/services/error.service';
import { ActiveOperation, CommitModel } from '../../../shared/git/Commit.model';
import { CommitSummaryModel } from '../../../shared/git/CommitSummary.model';
import { SettingsService } from './settings.service';
import { AlertService } from '../common/services/alert.service';
import { NotificationModel } from '../../../shared/notification.model';
import { BranchModel } from '../../../shared/git/Branch.model';
import { SubmoduleModel } from '../../../shared/git/submodule.model';
import { CrlfListener } from './warning-listeners/crlf.listener';
import { RemoteMessageListener } from './warning-listeners/remote-message.listener';
import { SubmoduleCheckoutListener } from './warning-listeners/submodule-checkout.listener';
import { Job, JobConfig, RepoArea } from './job-system/models';
import { WorktreeModel } from '../../../shared/git/worktree.model';
import { StashModel } from '../../../shared/git/stash.model';
import { TabDataService } from './tab-data.service';
import { PreCommitStatusModel } from '../../../shared/PreCommitStatus.model';
import { PreCommitStatusListener } from './warning-listeners/pre-commit-status.listener';
import { CommandOutputModel } from '../../../shared/common/command.output.model';

@Injectable({
  providedIn: 'root',
})
export class GitService {
  public onCommandHistoryUpdated = new Subject<CommandHistoryModel[]>();
  public tabDataService: TabDataService;
  private _onCrlfError = new Subject<{ start: string; end: string }>();
  public readonly onCrlfError = this._onCrlfError.asObservable();
  private _onRemoteMessage = new Subject<NotificationModel>();
  private _onPreCommitStatus = new BehaviorSubject<PreCommitStatusModel>(
    undefined,
  );
  public readonly onPreCommitStatus = this._onPreCommitStatus.asObservable();
  private _crlfListener = new CrlfListener(this._onCrlfError);
  private _remoteMessageListener = new RemoteMessageListener(
    this._onRemoteMessage,
  );
  private _submoduleCheckoutListener = new SubmoduleCheckoutListener();
  private _precommitStatusListener = new PreCommitStatusListener(
    this._onPreCommitStatus,
  );

  constructor(
    private electronService: ElectronService,
    private errorService: ErrorService,
    private settingsService: SettingsService,
    private alertService: AlertService,
  ) {
    electronService.listen(Channels.COMMANDHISTORYCHANGED, (resp) =>
      this.onCommandHistoryUpdated.next(resp),
    );
    this._onRemoteMessage
      .asObservable()
      .subscribe((notification) =>
        this.alertService.showNotification(notification),
      );
  }

  public getRepo() {
    return this.tabDataService.activeRepoCache;
  }

  handleAirplaneMode<T>(promise: Promise<T>, airplaneDefault?: T) {
    if (this.isAirplaneMode()) {
      return Promise.resolve(airplaneDefault);
    } else {
      return promise;
    }
  }

  getConfigItems(repoPath?: string): Job<ConfigItemModel[]> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [],
        command: Channels.GETCONFIGITEMS,
        reorderable: true,
        execute: () =>
          this.electronService.rpc(Channels.GETCONFIGITEMS, [path]),
      },
      path,
    );
  }

  setConfigItem(
    item: ConfigItemModel,
    rename?: ConfigItemModel,
    repoPath?: string,
  ): Job<ConfigItemModel[]>[] {
    const path = repoPath ?? this.getRepo().path;
    const result: Job<ConfigItemModel[]>[] = [];
    if (rename) {
      rename.value = '';
      result.push(
        this.getJob(
          {
            affectedAreas: [RepoArea.SETTINGS],
            command: Channels.SETCONFIGITEM,
            execute: () =>
              this.electronService.rpc(Channels.SETCONFIGITEM, [path, rename]),
          },
          path,
        ),
      );
    }
    result.push(
      this.getJob(
        {
          affectedAreas: [RepoArea.SETTINGS],
          command: Channels.SETCONFIGITEM,
          execute: () =>
            this.electronService.rpc(Channels.SETCONFIGITEM, [path, item]),
        },
        path,
      ),
    );
    return result;
  }

  mergeBranch(branch: string, repoPath?: string): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [
          RepoArea.LOCAL_BRANCHES,
          RepoArea.LOCAL_CHANGES,
          RepoArea.COMMIT_HISTORY,
        ],
        command: Channels.MERGEBRANCH,
        execute: () =>
          this.electronService.rpc(Channels.MERGEBRANCH, [path, branch]),
      },
      path,
    );
  }

  rebaseBranch(
    branch: string,
    interactive: boolean = false,
    repoPath?: string,
  ): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [
          RepoArea.LOCAL_BRANCHES,
          RepoArea.LOCAL_CHANGES,
          RepoArea.COMMIT_HISTORY,
        ],
        command: Channels.REBASEBRANCH,
        execute: () =>
          this.electronService.rpc(Channels.REBASEBRANCH, [
            path,
            branch,
            interactive,
          ]),
      },
      path,
    );
  }

  addWorktree(
    location: string,
    branch: string,
    callback: (out: string, err: string, done: boolean) => any,
  ) {
    this.electronService.trigger(Channels.ADDWORKTREE, [
      this.getRepo().path,
      location,
      branch,
    ]);
    this.electronService.listen(
      Channels.ADDWORKTREE,
      (result: { out: string; err: string; done: boolean }) => {
        callback(result.out, result.err, result.done);
        if (result.done) {
          this.electronService.cleanupChannel(Channels.ADDWORKTREE);
        }
      },
    );
  }

  clone(
    location: string,
    url: string,
    callback: (out: string, err: string, done: boolean) => any,
  ) {
    if (this.isAirplaneMode()) {
      return;
    }
    this.electronService.trigger(Channels.CLONE, ['./', location, url]);
    this.electronService.listen(
      Channels.CLONE,
      (result: { out: string; err: string; done: boolean }) => {
        callback(result.out, result.err, result.done);
        if (result.done) {
          this.electronService.cleanupChannel(Channels.CLONE);
        }
      },
    );
  }

  changeHunk(
    filename: string,
    hunk: DiffHunkModel,
    changedText: string,
    repoPath?: string,
  ): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [RepoArea.LOCAL_CHANGES],
        command: Channels.CHANGEHUNK,
        execute: () =>
          this.electronService.rpc(Channels.CHANGEHUNK, [
            path,
            filename,
            hunk,
            changedText,
          ]),
      },
      path,
    );
  }

  applyStash(index: number, repoPath?: string): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [RepoArea.LOCAL_CHANGES],
        command: Channels.APPLYSTASH,
        execute: () =>
          this.electronService.rpc(Channels.APPLYSTASH, [path, index]),
      },
      path,
    );
  }

  deleteStash(index: number, repoPath?: string): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [RepoArea.STASHES],
        command: Channels.DELETESTASH,
        execute: () =>
          this.electronService.rpc(Channels.DELETESTASH, [path, index]),
      },
      path,
    );
  }

  updateSubmodules(
    branch: string,
    recursive: boolean,
    repoPath?: string,
  ): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [RepoArea.SUBMODULES],
        command: Channels.UPDATESUBMODULES,
        reorderable: true,
        execute: () =>
          this.handleAirplaneMode(
            this.electronService.rpc(Channels.UPDATESUBMODULES, [
              path,
              recursive,
              branch,
            ]),
          ),
      },
      path,
    );
  }

  addSubmodule(url: string, path: string, repoPath?: string): Job<void> {
    const rPath = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [RepoArea.SUBMODULES],
        command: Channels.ADDSUBMODULE,
        execute: () =>
          this.handleAirplaneMode(
            this.electronService.rpc(Channels.ADDSUBMODULE, [rPath, url, path]),
          ),
      },
      rPath,
    );
  }

  getFileDiff(
    unstaged: string[],
    staged: string[],
    repoPath?: string,
  ): Job<DiffHeaderModel[]> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [],
        command: Channels.GETFILEDIFF,
        reorderable: true,
        execute: () =>
          this._crlfListener.detect(
            this.electronService.rpc(Channels.GETFILEDIFF, [
              path,
              unstaged,
              staged,
            ]),
            false,
          ),
      },
      path,
    );
  }

  getBranchPremerge(
    branchHash: string,
    repoPath?: string,
  ): Job<DiffHeaderModel[]> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [],
        command: Channels.GETBRANCHPREMERGE,
        reorderable: true,
        execute: () =>
          this.electronService.rpc(Channels.GETBRANCHPREMERGE, [
            path,
            branchHash,
          ]),
      },
      path,
    );
  }

  getCommitHistory(
    skip: number,
    activeBranch?: string,
    repoPath?: string,
  ): Job<CommitSummaryModel[]> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [],
        command: Channels.GETCOMMITHISTORY,
        reorderable: true,
        execute: () =>
          this.electronService.rpc(Channels.GETCOMMITHISTORY, [
            path,
            300,
            skip,
            activeBranch,
          ]),
      },
      path,
    );
  }

  getDeletedStashes(repoPath?: string): Job<CommitSummaryModel[]> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [],
        command: Channels.GETDELETEDSTASHES,
        reorderable: true,
        execute: () =>
          this.electronService.rpc(Channels.GETDELETEDSTASHES, [path]),
      },
      path,
    );
  }

  restoreDeletedStash(stashHash: string, repoPath?: string): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [RepoArea.LOCAL_BRANCHES],
        command: Channels.RESTOREDELETEDSTASH,
        execute: () =>
          this.electronService.rpc(Channels.RESTOREDELETEDSTASH, [
            path,
            stashHash,
          ]),
      },
      path,
    );
  }

  loadRepo(repoPath: string): Job<void> {
    return new Job<void>({
      affectedAreas: [
        RepoArea.LOCAL_BRANCHES,
        RepoArea.REMOTE_BRANCHES,
        RepoArea.STASHES,
        RepoArea.COMMIT_HISTORY,
        RepoArea.LOCAL_CHANGES,
        RepoArea.WORKTREES,
        RepoArea.SUBMODULES,
      ],
      command: Channels.LOADREPO,
      repoPath,
      execute: () => this.electronService.rpc(Channels.LOADREPO, [repoPath]),
    });
  }

  getCommitDiff(hash: string, repoPath?: string): Job<DiffHeaderModel[]> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [],
        command: Channels.COMMITDIFF,
        reorderable: true,
        execute: () =>
          this.electronService.rpc(Channels.COMMITDIFF, [path, hash]),
      },
      path,
    );
  }

  getStashDiff(stashIndex: number, repoPath?: string): Job<DiffHeaderModel[]> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [],
        command: Channels.STASHDIFF,
        execute: () =>
          this.electronService.rpc(Channels.STASHDIFF, [path, stashIndex]),
      },
      path,
    );
  }

  cherryPickCommit(hash: string, repoPath?: string): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [RepoArea.LOCAL_CHANGES, RepoArea.COMMIT_HISTORY],
        command: Channels.CHERRYPICKCOMMIT,
        execute: () =>
          this.electronService.rpc(Channels.CHERRYPICKCOMMIT, [path, hash]),
      },
      path,
    );
  }

  fastForwardBranch(
    branch: BranchModel,
    repoPath?: string,
  ): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [RepoArea.LOCAL_BRANCHES, RepoArea.COMMIT_HISTORY],
        command: Channels.FASTFORWARDBRANCH,
        execute: () =>
          this.handleAirplaneMode(
            this.electronService.rpc(Channels.FASTFORWARDBRANCH, [
              path,
              branch,
            ]),
          ),
      },
      path,
    );
  }

  checkout(
    branchOrHash: string,
    toNewBranch: boolean,
    andPull: boolean = false,
    repoPath?: string,
  ): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [
          RepoArea.LOCAL_BRANCHES,
          RepoArea.LOCAL_CHANGES,
          RepoArea.COMMIT_HISTORY,
        ],
        command: Channels.CHECKOUT,
        execute: () =>
          this._submoduleCheckoutListener.detect(
            this.electronService.rpc(Channels.CHECKOUT, [
              path,
              branchOrHash,
              toNewBranch,
              andPull,
            ]),
            true,
          ),
      },
      path,
    );
  }

  pull(force: boolean, repoPath?: string): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [
          RepoArea.LOCAL_CHANGES,
          RepoArea.LOCAL_BRANCHES,
          RepoArea.COMMIT_HISTORY,
        ],
        command: Channels.PULL,
        execute: () =>
          this.handleAirplaneMode(
            this._submoduleCheckoutListener.detect(
              this.electronService.rpc(Channels.PULL, [path, force]),
              true,
            ),
          ),
      },
      path,
    );
  }

  push(branch: BranchModel, force: boolean, repoPath?: string): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [
          RepoArea.LOCAL_BRANCHES,
          RepoArea.COMMIT_HISTORY,
          RepoArea.REMOTE_BRANCHES,
        ],
        command: Channels.PUSH,
        execute: () =>
          this._remoteMessageListener.detect(
            this.handleAirplaneMode(
              this.electronService.rpc(Channels.PUSH, [path, branch, force]),
            ),
            true,
          ),
      },
      path,
    );
  }

  deleteFiles(files: string[], repoPath?: string): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [RepoArea.LOCAL_CHANGES],
        command: Channels.DELETEFILES,
        execute: () =>
          this.electronService.rpc(Channels.DELETEFILES, [path, files]),
      },
      path,
    );
  }

  setBulkGitSettings(
    config: { [key: string]: string | number },
    useGlobal: boolean,
    repoPath?: string,
  ): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [RepoArea.SETTINGS],
        command: Channels.SETGITSETTINGS,
        execute: () =>
          this.electronService.rpc(Channels.SETGITSETTINGS, [
            path,
            config,
            useGlobal,
          ]),
      },
      path,
    );
  }

  checkGitBashVersions() {
    const handleResult = (err: { git: boolean; bash: boolean }) => {
      let errors = [];
      if (!err.git) {
        errors.push('git');
      }
      if (!err.bash) {
        errors.push('bash');
      }
      if (errors.length > 0) {
        this.errorService.receiveError(
          new ErrorModel(
            'home component, git bash version check',
            'checking the versions of Git and Bash',
            'Invalid path configuration(s) detected:\n\t' +
              errors.join('\n\t') +
              '\n\nPlease configure your paths correctly in the Settings menu',
          ),
        );
      }
    };
    return this.getJob({
      affectedAreas: [],
      command: Channels.CHECKGITBASHVERSIONS,
      execute: () =>
        this.electronService
          .rpc(Channels.CHECKGITBASHVERSIONS, ['./'])
          .then(handleResult)
          .catch(handleResult),
    });
  }

  stage(files: string[], repoPath?: string): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [RepoArea.LOCAL_CHANGES],
        command: Channels.GITSTAGE,
        execute: () =>
          this._crlfListener.detect(
            this.electronService.rpc(Channels.GITSTAGE, [path, files]),
            true,
          ),
      },
      path,
    );
  }

  unstage(files: string[], repoPath?: string): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [RepoArea.LOCAL_CHANGES],
        command: Channels.GITUNSTAGE,
        execute: () =>
          this._crlfListener.detect(
            this.electronService.rpc(Channels.GITUNSTAGE, [path, files]),
            true,
          ),
      },
      path,
    );
  }

  createBranch(branchName: string, repoPath?: string): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [RepoArea.LOCAL_BRANCHES, RepoArea.COMMIT_HISTORY],
        command: Channels.CREATEBRANCH,
        execute: () =>
          this.electronService.rpc(Channels.CREATEBRANCH, [path, branchName]),
      },
      path,
    );
  }

  deleteBranch(
    branches: BranchModel[],
    repoPath?: string,
  ): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [RepoArea.LOCAL_BRANCHES, RepoArea.COMMIT_HISTORY],
        command: Channels.DELETEBRANCH,
        execute: () =>
          this.electronService.rpc(Channels.DELETEBRANCH, [path, branches]),
      },
      path,
    );
  }

  mergeFile(
    file: string,
    mergetool: string,
    repoPath?: string,
  ): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [RepoArea.LOCAL_CHANGES],
        command: Channels.MERGE,
        execute: () =>
          this.electronService.rpc(Channels.MERGE, [path, file, mergetool]),
      },
      path,
    );
  }

  deleteWorktree(
    worktreeName: string,
    repoPath?: string,
  ): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [RepoArea.WORKTREES],
        command: Channels.DELETEWORKTREE,
        execute: () =>
          this.electronService.rpc(Channels.DELETEWORKTREE, [
            path,
            worktreeName,
          ]),
      },
      path,
    );
  }

  stashChanges(
    onlyUnstaged: boolean,
    stashName: string,
    repoPath?: string,
  ): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [RepoArea.LOCAL_CHANGES, RepoArea.STASHES],
        command: Channels.STASH,
        execute: () =>
          this._crlfListener.detect(
            this.electronService.rpc(Channels.STASH, [
              path,
              onlyUnstaged,
              stashName,
            ]),
            true,
          ),
      },
      path,
    );
  }

  fetch(refreshAreas: boolean = true, repoPath?: string): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: refreshAreas
          ? [
              RepoArea.LOCAL_BRANCHES,
              RepoArea.REMOTE_BRANCHES,
              RepoArea.COMMIT_HISTORY,
              RepoArea.SUBMODULES,
            ]
          : [],
        command: Channels.FETCH,
        execute: () =>
          this.handleAirplaneMode(
            this.electronService.rpc(Channels.FETCH, [path]),
          ),
      },
      path,
    );
  }

  undoFileChanges(
    file: string[],
    revision: string,
    staged: boolean,
    repoPath?: string,
  ): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [RepoArea.LOCAL_CHANGES],
        command: Channels.UNDOFILECHANGES,
        execute: () =>
          this._crlfListener.detect(
            this.electronService.rpc(Channels.UNDOFILECHANGES, [
              path,
              file,
              revision,
              staged,
            ]),
            true,
          ),
      },
      path,
    );
  }

  undoSubmoduleChanges(
    submodules: SubmoduleModel[],
    repoPath?: string,
  ): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [RepoArea.LOCAL_CHANGES],
        command: Channels.UNDOSUBMODULECHANGES,
        execute: () =>
          this.electronService.rpc(Channels.UNDOSUBMODULECHANGES, [
            path,
            submodules,
          ]),
      },
      path,
    );
  }

  resolveConflictsUsing(
    file: string,
    theirs: boolean,
    repoPath?: string,
  ): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [RepoArea.LOCAL_CHANGES],
        command: Channels.RESOLVECONFLICTUSING,
        execute: () =>
          this._crlfListener.detect(
            this.electronService.rpc(Channels.RESOLVECONFLICTUSING, [
              path,
              file,
              theirs,
            ]),
            true,
          ),
      },
      path,
    );
  }

  hardReset(repoPath?: string): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [RepoArea.LOCAL_CHANGES],
        command: Channels.GETDELETEDSTASHES,
        execute: () =>
          this.electronService.rpc(Channels.HARDRESET, [path]),
      },
      path,
    );
  }

  commit(
    description: string,
    commitAndPush: boolean,
    amend: boolean,
    currentBranch: BranchModel,
    repoPath?: string,
  ): Job<{ needsNewPushJob: boolean }> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [
          RepoArea.LOCAL_CHANGES,
          RepoArea.LOCAL_BRANCHES,
          RepoArea.REMOTE_BRANCHES,
          RepoArea.COMMIT_HISTORY,
        ],
        command: Channels.COMMIT,
        execute: () =>
          this._precommitStatusListener
            .detect(
              this._remoteMessageListener.detect(
                this.electronService.rpc<CommandOutputModel>(Channels.COMMIT, [
                  path,
                  description,
                  commitAndPush,
                  currentBranch,
                  amend,
                ]),
                true,
              ),
              true,
            )
            .then(() => {
              const lastValue = this._onPreCommitStatus.getValue();
              // need to requeue a push operation because the precommit errors
              return {
                needsNewPushJob:
                  commitAndPush &&
                  lastValue &&
                  lastValue.rules.length > 0 &&
                  !lastValue.isError(),
              };
            }),
      },
      path,
    );
  }

  getWorktrees(repoPath?: string): Job<WorktreeModel[]> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [],
        command: Channels.GETWORKTREES,
        execute: () =>
          this.electronService.rpc(Channels.GETWORKTREES, [path]),
      },
      path,
    );
  }

  getSubmodules(repoPath?: string): Job<SubmoduleModel[]> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [],
        command: Channels.GETSUBMODULES,
        execute: () =>
          this.electronService.rpc(Channels.GETSUBMODULES, [path]),
      },
      path,
    );
  }

  getLocalBranches(repoPath?: string): Job<BranchModel[]> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [],
        command: Channels.GETLOCALBRANCHES,
        execute: () =>
          this.electronService.rpc(Channels.GETLOCALBRANCHES, [path]),
      },
      path,
    );
  }

  getRemoteBranches(repoPath?: string): Job<BranchModel[]> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [],
        command: Channels.GETREMOTEBRANCHES,
        execute: () =>
          this.electronService.rpc(Channels.GETREMOTEBRANCHES, [path]),
      },
      path,
    );
  }

  getStashes(repoPath?: string): Job<StashModel[]> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [],
        command: Channels.GETSTASHES,
        execute: () =>
          this.electronService.rpc(Channels.GETSTASHES, [path]),
      },
      path,
    );
  }

  getFileChanges(repoPath?: string): Job<CommitModel> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [],
        command: Channels.GETFILECHANGES,
        execute: () =>
          this.electronService.rpc(Channels.GETFILECHANGES, [path]),
      },
      path,
    );
  }

  changeActiveOperation(
    op: ActiveOperation,
    abort: boolean,
    repoPath?: string,
  ): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [
          RepoArea.LOCAL_CHANGES,
          RepoArea.LOCAL_BRANCHES,
          RepoArea.LOCAL_BRANCHES,
        ],
        command: Channels.CHANGEACTIVEOPERATION,
        execute: () =>
          this._precommitStatusListener.detect(
            this.electronService.rpc(Channels.CHANGEACTIVEOPERATION, [
              path,
              op,
              abort,
            ]),
            true,
          ),
      },
      path,
    );
  }

  getCommandHistory(repoPath?: string): Job<CommandHistoryModel[]> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [],
        command: Channels.GETCOMMANDHISTORY,
        execute: () =>
          this.electronService.rpc(Channels.GETCOMMANDHISTORY, [path]),
      },
      path,
    );
  }

  renameBranch(
    branch: { oldName: string; newName: string },
    repoPath?: string,
  ): Job<void> {
    const path = repoPath ?? this.getRepo().path;
    return this.getJob(
      {
        affectedAreas: [RepoArea.LOCAL_BRANCHES],
        command: Channels.RENAMEBRANCH,
        execute: () =>
          this.electronService.rpc(Channels.RENAMEBRANCH, [
            path,
            branch.oldName,
            branch.newName,
          ]),
      },
      path,
    );
  }

  private isAirplaneMode() {
    return this.settingsService.settings.airplaneMode;
  }

  private swallowError<T>(promise: Promise<T>) {
    return new Promise<T>((resolve, reject) => {
      promise.then(resolve).catch(() => resolve(undefined));
    });
  }

  /**
   * Creates a Job with an explicit repoPath, capturing it at call time
   * rather than reading the active tab dynamically at execution time.
   * This prevents cache pollution when switching between repos.
   */
  private getJob<T>(
    config: Omit<JobConfig<T>, 'repoPath'>,
    repoPath?: string,
  ): Job<T> {
    return new Job<T>({
      ...config,
      repoPath: repoPath ?? this.getRepo().path,
    });
  }
}
