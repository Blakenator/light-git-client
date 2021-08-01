import { Injectable } from '@angular/core';
import { Channels } from '../../../shared/Channels';
import { ElectronService } from '../common/services/electron.service';
import { ConfigItemModel } from '../../../shared/git/config-item.model';
import { DiffHeaderModel } from '../../../shared/git/diff.header.model';
import { Subject } from 'rxjs';
import { CommandHistoryModel } from '../../../shared/git/command-history.model';
import { DiffHunkModel } from '../../../shared/git/diff.hunk.model';
import { ErrorModel } from '../../../shared/common/error.model';
import { ErrorService } from '../common/services/error.service';
import { CommitModel } from '../../../shared/git/Commit.model';
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

@Injectable({
  providedIn: 'root',
})
export class GitService {
  public onCommandHistoryUpdated = new Subject<CommandHistoryModel[]>();
  public tabDataService: TabDataService;
  private _onCrlfError = new Subject<{ start: string; end: string }>();
  public readonly onCrlfError = this._onCrlfError.asObservable();
  private _onRemoteMessage = new Subject<NotificationModel>();
  private _crlfListener = new CrlfListener(this._onCrlfError);
  private _remoteMessageListener = new RemoteMessageListener(
    this._onRemoteMessage,
  );
  private _submoduleCheckoutListener = new SubmoduleCheckoutListener();

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

  getConfigItems(): Job<ConfigItemModel[]> {
    return this.getJob({
      affectedAreas: [],
      command: Channels.GETCONFIGITEMS,
      reorderable: true,
      execute: () =>
        this.electronService.rpc(Channels.GETCONFIGITEMS, [
          this.getRepo().path,
        ]),
    });
  }

  setConfigItem(
    item: ConfigItemModel,
    rename?: ConfigItemModel,
  ): Job<ConfigItemModel[]>[] {
    const result: Job<ConfigItemModel[]>[] = [];
    if (rename) {
      rename.value = '';
      result.push(
        this.getJob({
          affectedAreas: [RepoArea.SETTINGS],
          command: Channels.SETCONFIGITEM,
          execute: () =>
            this.electronService.rpc(Channels.SETCONFIGITEM, [
              this.getRepo().path,
              rename,
            ]),
        }),
      );
    }
    result.push(
      this.getJob({
        affectedAreas: [RepoArea.SETTINGS],
        command: Channels.SETCONFIGITEM,
        execute: () =>
          this.electronService.rpc(Channels.SETCONFIGITEM, [
            this.getRepo().path,
            item,
          ]),
      }),
    );
    return result;
  }

  mergeBranch(branch: string): Job<void> {
    return this.getJob({
      affectedAreas: [
        RepoArea.LOCAL_BRANCHES,
        RepoArea.LOCAL_CHANGES,
        RepoArea.COMMIT_HISTORY,
      ],
      command: Channels.MERGEBRANCH,
      execute: () =>
        this.swallowError(
          this.electronService.rpc(Channels.MERGEBRANCH, [
            this.getRepo().path,
            branch,
          ]),
        ),
    });
  }

  addWorktree(
    location: string,
    branch: string,
    callback: (out: string, err: string, done: boolean) => any,
  ) {
    this.electronService.rpc(
      Channels.ADDWORKTREE,
      [this.getRepo().path, location, branch],
      false,
    );
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
    this.electronService.rpc(Channels.CLONE, ['./', location, url], false);
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
  ): Job<void> {
    return this.getJob({
      affectedAreas: [RepoArea.LOCAL_CHANGES],
      command: Channels.CHANGEHUNK,
      execute: () =>
        this.electronService.rpc(Channels.CHANGEHUNK, [
          this.getRepo().path,
          filename,
          hunk,
          changedText,
        ]),
    });
  }

  applyStash(index: number): Job<void> {
    return this.getJob({
      affectedAreas: [RepoArea.LOCAL_CHANGES],
      command: Channels.APPLYSTASH,
      execute: () =>
        this.electronService.rpc(Channels.APPLYSTASH, [
          this.getRepo().path,
          index,
        ]),
    });
  }

  deleteStash(index: number): Job<void> {
    return this.getJob({
      affectedAreas: [RepoArea.STASHES],
      command: Channels.DELETESTASH,
      execute: () =>
        this.electronService.rpc(Channels.DELETESTASH, [
          this.getRepo().path,
          index,
        ]),
    });
  }

  updateSubmodules(branch: string, recursive: boolean): Job<void> {
    return this.getJob({
      affectedAreas: [RepoArea.SUBMODULES],
      command: Channels.UPDATESUBMODULES,
      reorderable: true,
      execute: () =>
        this.handleAirplaneMode(
          this.electronService.rpc(Channels.UPDATESUBMODULES, [
            this.getRepo().path,
            recursive,
            branch,
          ]),
        ),
    });
  }

  addSubmodule(url: string, path: string): Job<void> {
    return this.getJob({
      affectedAreas: [RepoArea.SUBMODULES],
      command: Channels.ADDSUBMODULE,
      execute: () =>
        this.handleAirplaneMode(
          this.electronService.rpc(Channels.ADDSUBMODULE, [
            this.getRepo().path,
            url,
            path,
          ]),
        ),
    });
  }

  getFileDiff(unstaged: string[], staged: string[]): Job<DiffHeaderModel[]> {
    return this.getJob({
      affectedAreas: [],
      command: Channels.GETFILEDIFF,
      reorderable: true,
      execute: () =>
        this._crlfListener.detect(
          this.electronService.rpc(Channels.GETFILEDIFF, [
            this.getRepo().path,
            unstaged,
            staged,
          ]),
          false,
        ),
    });
  }

  getBranchPremerge(branchHash: string): Job<DiffHeaderModel[]> {
    return this.getJob({
      affectedAreas: [],
      command: Channels.GETBRANCHPREMERGE,
      reorderable: true,
      execute: () =>
        this.electronService.rpc(Channels.GETBRANCHPREMERGE, [
          this.getRepo().path,
          branchHash,
        ]),
    });
  }

  getCommitHistory(
    skip: number,
    activeBranch?: string,
  ): Job<CommitSummaryModel[]> {
    return this.getJob({
      affectedAreas: [],
      command: Channels.GETCOMMITHISTORY,
      reorderable: true,
      execute: () =>
        this.electronService.rpc(Channels.GETCOMMITHISTORY, [
          this.getRepo().path,
          300,
          skip,
          activeBranch,
        ]),
    });
  }

  getDeletedStashes(): Job<CommitSummaryModel[]> {
    return this.getJob({
      affectedAreas: [],
      command: Channels.GETDELETEDSTASHES,
      reorderable: true,
      execute: () =>
        this.electronService.rpc(Channels.GETDELETEDSTASHES, [
          this.getRepo().path,
        ]),
    });
  }

  restoreDeletedStash(stashHash: string): Job<void> {
    return this.getJob({
      affectedAreas: [RepoArea.LOCAL_BRANCHES],
      command: Channels.RESTOREDELETEDSTASH,
      execute: () =>
        this.electronService.rpc(Channels.RESTOREDELETEDSTASH, [
          this.getRepo().path,
          stashHash,
        ]),
    });
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

  getCommitDiff(hash: string): Job<DiffHeaderModel[]> {
    return this.getJob({
      affectedAreas: [],
      command: Channels.COMMITDIFF,
      reorderable: true,
      execute: () =>
        this.electronService.rpc(Channels.COMMITDIFF, [
          this.getRepo().path,
          hash,
        ]),
    });
  }

  getStashDiff(stashIndex: number): Job<DiffHeaderModel[]> {
    return this.getJob({
      affectedAreas: [],
      command: Channels.STASHDIFF,
      execute: () =>
        this.electronService.rpc(Channels.STASHDIFF, [
          this.getRepo().path,
          stashIndex,
        ]),
    });
  }

  cherryPickCommit(hash: string): Job<void> {
    return this.getJob({
      affectedAreas: [RepoArea.LOCAL_CHANGES, RepoArea.COMMIT_HISTORY],
      command: Channels.CHERRYPICKCOMMIT,
      execute: () =>
        this.electronService.rpc(Channels.CHERRYPICKCOMMIT, [
          this.getRepo().path,
          hash,
        ]),
    });
  }

  fastForwardBranch(branch: BranchModel): Job<void> {
    return this.getJob({
      affectedAreas: [RepoArea.LOCAL_BRANCHES, RepoArea.COMMIT_HISTORY],
      command: Channels.FASTFORWARDBRANCH,
      execute: () =>
        this.handleAirplaneMode(
          this.electronService.rpc(Channels.FASTFORWARDBRANCH, [
            this.getRepo().path,
            branch,
          ]),
        ),
    });
  }

  checkout(
    branchOrHash: string,
    toNewBranch: boolean,
    andPull: boolean = false,
  ): Job<void> {
    return this.getJob({
      affectedAreas: [
        RepoArea.LOCAL_BRANCHES,
        RepoArea.LOCAL_CHANGES,
        RepoArea.COMMIT_HISTORY,
      ],
      command: Channels.CHECKOUT,
      execute: () =>
        this._submoduleCheckoutListener.detect(
          this.electronService.rpc(Channels.CHECKOUT, [
            this.getRepo().path,
            branchOrHash,
            toNewBranch,
            andPull,
          ]),
          true,
        ),
    });
  }

  pull(force: boolean): Job<void> {
    return this.getJob({
      affectedAreas: [
        RepoArea.LOCAL_CHANGES,
        RepoArea.LOCAL_BRANCHES,
        RepoArea.COMMIT_HISTORY,
      ],
      command: Channels.PULL,
      execute: () =>
        this.handleAirplaneMode(
          this._submoduleCheckoutListener.detect(
            this.electronService.rpc(Channels.PULL, [
              this.getRepo().path,
              force,
            ]),
            true,
          ),
        ),
    });
  }

  push(branch: BranchModel, force: boolean): Job<void> {
    return this.getJob({
      affectedAreas: [
        RepoArea.LOCAL_BRANCHES,
        RepoArea.COMMIT_HISTORY,
        RepoArea.REMOTE_BRANCHES,
      ],
      command: Channels.PUSH,
      execute: () =>
        this._remoteMessageListener.detect(
          this.handleAirplaneMode(
            this.electronService.rpc(Channels.PUSH, [
              this.getRepo().path,
              branch,
              force,
            ]),
          ),
          true,
        ),
    });
  }

  deleteFiles(files: string[]): Job<void> {
    return this.getJob({
      affectedAreas: [RepoArea.LOCAL_CHANGES],
      command: Channels.DELETEFILES,
      execute: () =>
        this.electronService.rpc(Channels.DELETEFILES, [
          this.getRepo().path,
          files,
        ]),
    });
  }

  setBulkGitSettings(
    config: { [key: string]: string | number },
    useGlobal: boolean,
  ): Job<void> {
    return this.getJob({
      affectedAreas: [RepoArea.SETTINGS],
      command: Channels.SETGITSETTINGS,
      execute: () =>
        this.electronService.rpc(Channels.SETGITSETTINGS, [
          this.getRepo().path,
          config,
          useGlobal,
        ]),
    });
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

  stage(files: string[]): Job<void> {
    return this.getJob({
      affectedAreas: [RepoArea.LOCAL_CHANGES],
      command: Channels.GITSTAGE,
      execute: () =>
        this._crlfListener.detect(
          this.electronService.rpc(Channels.GITSTAGE, [
            this.getRepo().path,
            files,
          ]),
          true,
        ),
    });
  }

  unstage(files: string[]): Job<void> {
    return this.getJob({
      affectedAreas: [RepoArea.LOCAL_CHANGES],
      command: Channels.GITUNSTAGE,
      execute: () =>
        this._crlfListener.detect(
          this.electronService.rpc(Channels.GITUNSTAGE, [
            this.getRepo().path,
            files,
          ]),
          true,
        ),
    });
  }

  createBranch(branchName: string): Job<void> {
    return this.getJob({
      affectedAreas: [RepoArea.LOCAL_BRANCHES, RepoArea.COMMIT_HISTORY],
      command: Channels.CREATEBRANCH,
      execute: () =>
        this.electronService.rpc(Channels.CREATEBRANCH, [
          this.getRepo().path,
          branchName,
        ]),
    });
  }

  deleteBranch(branches: BranchModel[]): Job<void> {
    return this.getJob({
      affectedAreas: [RepoArea.LOCAL_BRANCHES, RepoArea.COMMIT_HISTORY],
      command: Channels.DELETEBRANCH,
      execute: () =>
        this.electronService.rpc(Channels.DELETEBRANCH, [
          this.getRepo().path,
          branches,
        ]),
    });
  }

  mergeFile(file: string, mergetool: string): Job<void> {
    return this.getJob({
      affectedAreas: [RepoArea.LOCAL_CHANGES],
      command: Channels.MERGE,
      execute: () =>
        this.electronService.rpc(Channels.MERGE, [
          this.getRepo().path,
          file,
          mergetool,
        ]),
    });
  }

  deleteWorktree(worktreeName: string): Job<void> {
    return this.getJob({
      affectedAreas: [RepoArea.WORKTREES],
      command: Channels.DELETEWORKTREE,
      execute: () =>
        this.electronService.rpc(Channels.DELETEWORKTREE, [
          this.getRepo().path,
          worktreeName,
        ]),
    });
  }

  stashChanges(onlyUnstaged: boolean, stashName: string): Job<void> {
    return this.getJob({
      affectedAreas: [RepoArea.LOCAL_CHANGES, RepoArea.STASHES],
      command: Channels.STASH,
      execute: () =>
        this._crlfListener.detect(
          this.electronService.rpc(Channels.STASH, [
            this.getRepo().path,
            onlyUnstaged,
            stashName,
          ]),
          true,
        ),
    });
  }

  fetch(refreshAreas: boolean = true): Job<void> {
    return this.getJob({
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
          this.electronService.rpc(Channels.FETCH, [this.getRepo().path]),
        ),
    });
  }

  undoFileChanges(
    file: string[],
    revision: string,
    staged: boolean,
  ): Job<void> {
    return this.getJob({
      affectedAreas: [RepoArea.LOCAL_CHANGES],
      command: Channels.UNDOFILECHANGES,
      execute: () =>
        this._crlfListener.detect(
          this.electronService.rpc(Channels.UNDOFILECHANGES, [
            this.getRepo().path,
            file,
            revision,
            staged,
          ]),
          true,
        ),
    });
  }

  undoSubmoduleChanges(submodules: SubmoduleModel[]): Job<void> {
    return this.getJob({
      affectedAreas: [RepoArea.LOCAL_CHANGES],
      command: Channels.UNDOSUBMODULECHANGES,
      execute: () =>
        this.electronService.rpc(Channels.UNDOSUBMODULECHANGES, [
          this.getRepo().path,
          submodules,
        ]),
    });
  }

  resolveConflictsUsing(file: string, theirs: boolean): Job<void> {
    return this.getJob({
      affectedAreas: [RepoArea.LOCAL_CHANGES],
      command: Channels.RESOLVECONFLICTUSING,
      execute: () =>
        this._crlfListener.detect(
          this.electronService.rpc(Channels.RESOLVECONFLICTUSING, [
            this.getRepo().path,
            file,
            theirs,
          ]),
          true,
        ),
    });
  }

  hardReset(): Job<void> {
    return this.getJob({
      affectedAreas: [RepoArea.LOCAL_CHANGES],
      command: Channels.GETDELETEDSTASHES,
      execute: () =>
        this.electronService.rpc(Channels.HARDRESET, [this.getRepo().path]),
    });
  }

  commit(
    description: string,
    commitAndPush: boolean,
    amend: boolean,
    currentBranch: BranchModel,
  ): Job<void> {
    return this.getJob({
      affectedAreas: [
        RepoArea.LOCAL_CHANGES,
        RepoArea.LOCAL_BRANCHES,
        RepoArea.REMOTE_BRANCHES,
        RepoArea.COMMIT_HISTORY,
      ],
      command: Channels.COMMIT,
      execute: () =>
        this._remoteMessageListener.detect(
          this.electronService.rpc(Channels.COMMIT, [
            this.getRepo().path,
            description,
            commitAndPush,
            currentBranch,
            amend,
          ]),
          true,
        ),
    });
  }

  getWorktrees(): Job<WorktreeModel[]> {
    return this.getJob({
      affectedAreas: [],
      command: Channels.GETWORKTREES,
      execute: () =>
        this.electronService.rpc(Channels.GETWORKTREES, [this.getRepo().path]),
    });
  }

  getSubmodules(): Job<SubmoduleModel[]> {
    return this.getJob({
      affectedAreas: [],
      command: Channels.GETSUBMODULES,
      execute: () =>
        this.electronService.rpc(Channels.GETSUBMODULES, [this.getRepo().path]),
    });
  }

  getLocalBranches(): Job<BranchModel[]> {
    return this.getJob({
      affectedAreas: [],
      command: Channels.GETLOCALBRANCHES,
      execute: () =>
        this.electronService.rpc(Channels.GETLOCALBRANCHES, [
          this.getRepo().path,
        ]),
    });
  }

  getRemoteBranches(): Job<BranchModel[]> {
    return this.getJob({
      affectedAreas: [],
      command: Channels.GETREMOTEBRANCHES,
      execute: () =>
        this.electronService.rpc(Channels.GETREMOTEBRANCHES, [
          this.getRepo().path,
        ]),
    });
  }

  getStashes(): Job<StashModel[]> {
    return this.getJob({
      affectedAreas: [],
      command: Channels.GETSTASHES,
      execute: () =>
        this.electronService.rpc(Channels.GETSTASHES, [this.getRepo().path]),
    });
  }

  getFileChanges(): Job<CommitModel> {
    return this.getJob({
      affectedAreas: [],
      command: Channels.GETFILECHANGES,
      execute: () =>
        this.electronService.rpc(Channels.GETFILECHANGES, [
          this.getRepo().path,
        ]),
    });
  }

  getCommandHistory(): Job<CommandHistoryModel[]> {
    return this.getJob({
      affectedAreas: [],
      command: Channels.GETCOMMANDHISTORY,
      execute: () =>
        this.electronService.rpc(Channels.GETCOMMANDHISTORY, [
          this.getRepo().path,
        ]),
    });
  }

  renameBranch(branch: { oldName: string; newName: string }): Job<void> {
    return this.getJob({
      affectedAreas: [RepoArea.LOCAL_BRANCHES],
      command: Channels.RENAMEBRANCH,
      execute: () =>
        this.electronService.rpc(Channels.RENAMEBRANCH, [
          this.getRepo().path,
          branch.oldName,
          branch.newName,
        ]),
    });
  }

  private isAirplaneMode() {
    return this.settingsService.settings.airplaneMode;
  }

  private swallowError<T>(promise: Promise<T>) {
    return new Promise<T>((resolve, reject) => {
      promise.then(resolve).catch(() => resolve(undefined));
    });
  }

  private getJob<T>(config: Omit<JobConfig<T>, 'repoPath'>): Job<T> {
    return new Job<T>({ ...config, repoPath: this.getRepo().path });
  }
}
