import {Injectable} from '@angular/core';
import {Channels} from '../../../shared/Channels';
import {RepositoryModel} from '../../../shared/git/Repository.model';
import {ElectronService} from '../common/services/electron.service';
import {ConfigItemModel} from '../../../shared/git/config-item.model';
import {DiffHeaderModel} from '../../../shared/git/diff.header.model';
import {Subject} from 'rxjs';
import {CommandHistoryModel} from '../../../shared/git/command-history.model';
import {DiffHunkModel} from '../../../shared/git/diff.hunk.model';
import {ErrorModel} from '../../../shared/common/error.model';
import {ErrorService} from '../common/services/error.service';
import {CommitModel} from '../../../shared/git/Commit.model';
import {CommitSummaryModel} from '../../../shared/git/CommitSummary.model';
import {SettingsService} from './settings.service';
import {AlertService} from '../common/services/alert.service';
import {NotificationModel} from '../../../shared/notification.model';
import {BranchModel} from '../../../shared/git/Branch.model';
import {SubmoduleModel} from '../../../shared/git/submodule.model';
import {CrlfListener} from './warning-listeners/crlf.listener';
import {RemoteMessageListener} from './warning-listeners/remote-message.listener';
import {SubmoduleCheckoutListener} from './warning-listeners/submodule-checkout.listener';
import {TabDataService} from './tab-data.service';

@Injectable({
  providedIn: 'root',
})
export class GitService {
  public repo: RepositoryModel;
  public onCommandHistoryUpdated = new Subject<CommandHistoryModel[]>();
  public isRepoLoaded = false;
  private _onCrlfError = new Subject<{ start: string, end: string }>();
  public readonly onCrlfError = this._onCrlfError.asObservable();
  private _onRemoteMessage = new Subject<NotificationModel>();
  private _repoLoaded = new Subject<void>();
  public readonly onRepoLoaded = this._repoLoaded.asObservable();
  private _crlfListener = new CrlfListener(this._onCrlfError);
  private _remoteMessageListener = new RemoteMessageListener(this._onRemoteMessage);
  private _submoduleCheckoutListener = new SubmoduleCheckoutListener();

  constructor(private electronService: ElectronService,
              private errorService: ErrorService,
              private settingsService: SettingsService,
              private alertService: AlertService,
  private tabDataService:TabDataService) {
    electronService.listen(Channels.COMMANDHISTORYCHANGED, resp => this.onCommandHistoryUpdated.next(resp));
    this._onRemoteMessage.asObservable().subscribe(notification => this.alertService.showNotification(notification));
  }

  handleAirplaneMode<T>(promise: Promise<T>, airplaneDefault?: T) {
    if (this.isAirplaneMode()) {
      return Promise.resolve(airplaneDefault);
    } else {
      return promise;
    }
  }

  getConfigItems(): Promise<ConfigItemModel[]> {
    return this.electronService.rpc(Channels.GETCONFIGITEMS, [this.repo.path]);
  }

  setConfigItem(item: ConfigItemModel, rename?: ConfigItemModel): Promise<ConfigItemModel[]> {
    if (rename) {
      rename.value = '';
      return this.electronService.rpc(Channels.SETCONFIGITEM, [this.repo.path, rename])
                 .then(ignore => this.electronService.rpc(
                   Channels.SETCONFIGITEM,
                   [this.repo.path, item]));
    }
    return this.electronService.rpc(Channels.SETCONFIGITEM, [this.repo.path, item]);
  }

  mergeBranch(branch: string): Promise<void> {
    return this.swallowError(this.electronService.rpc(Channels.MERGEBRANCH, [this.repo.path, branch]));
  }

  addWorktree(location: string, branch: string, callback: (out: string, err: string, done: boolean) => any) {
    this.electronService.rpc(Channels.ADDWORKTREE, [this.repo.path, location, branch], false);
    this.electronService.listen(Channels.ADDWORKTREE, (result: { out: string, err: string, done: boolean }) => {
      callback(result.out, result.err, result.done);
      if (result.done) {
        this.electronService.cleanupChannel(Channels.ADDWORKTREE);
      }
    });
  }

  clone(location: string, url: string, callback: (out: string, err: string, done: boolean) => any) {
    if (this.isAirplaneMode()) {
      return;
    }
    this.electronService.rpc(Channels.CLONE, ['./', location, url], false);
    this.electronService.listen(Channels.CLONE, (result: { out: string, err: string, done: boolean }) => {
      callback(result.out, result.err, result.done);
      if (result.done) {
        this.electronService.cleanupChannel(Channels.CLONE);
      }
    });
  }

  changeHunk(filename: string, hunk: DiffHunkModel, changedText: string): Promise<void> {
    return this.electronService.rpc(Channels.CHANGEHUNK, [this.repo.path, filename, hunk, changedText]);
  }

  applyStash(index: number): Promise<void> {
    return this.electronService.rpc(Channels.APPLYSTASH, [this.repo.path, index]);
  }

  deleteStash(index: number): Promise<void> {
    return this.electronService.rpc(Channels.DELETESTASH, [this.repo.path, index]);
  }

  updateSubmodules(branch: string, recursive: boolean): Promise<void> {
    return this.handleAirplaneMode(this.electronService.rpc(
      Channels.UPDATESUBMODULES,
      [this.repo.path, recursive, branch]));
  }

  addSubmodule(url: string, path: string): Promise<void> {
    return this.handleAirplaneMode(this.electronService.rpc(Channels.ADDSUBMODULE, [this.repo.path, url, path]));
  }

  getFileDiff(unstaged: string[], staged: string[]): Promise<DiffHeaderModel[]> {
    return this._crlfListener.detect(
      this.electronService.rpc(Channels.GETFILEDIFF, [this.repo.path, unstaged, staged]),
      false);
  }

  getBranchPremerge(branchHash: string): Promise<DiffHeaderModel[]> {
    return this.electronService.rpc(Channels.GETBRANCHPREMERGE, [this.repo.path, branchHash]);
  }

  getCommitHistory(skip: number, activeBranch?: string): Promise<CommitSummaryModel[]> {
    return this.electronService.rpc(Channels.GETCOMMITHISTORY, [this.repo.path, 300, skip, activeBranch]);
  }

  getDeletedStashes(): Promise<CommitSummaryModel[]> {
    return this.electronService.rpc(Channels.GETDELETEDSTASHES, [this.repo.path]);
  }

  restoreDeletedStash(stashHash:string): Promise<void> {
    return this.electronService.rpc(Channels.RESTOREDELETEDSTASH, [this.repo.path,stashHash]);
  }

  loadRepo(repoPath: string): Promise<RepositoryModel> {
    this.repo = new RepositoryModel();
    this.repo.path = repoPath;
    return this.electronService.rpc(Channels.LOADREPO, [repoPath]).then(repo => {
      this.repo.copy(repo);
      this.isRepoLoaded = true;
      this._repoLoaded.next();
      return Promise.resolve(this.repo);
    });
  }

  getCommitDiff(hash: string): Promise<DiffHeaderModel[]> {
    return this.electronService.rpc(Channels.COMMITDIFF, [this.repo.path, hash]);
  }

  getStashDiff(stashIndex: number): Promise<DiffHeaderModel[]> {
    return this.electronService.rpc(Channels.STASHDIFF, [this.repo.path, stashIndex]);
  }

  cherryPickCommit(hash: string): Promise<void> {
    return this.electronService.rpc(Channels.CHERRYPICKCOMMIT, [this.repo.path, hash]);
  }

  fastForwardBranch(branch: BranchModel): Promise<void> {
    return this.handleAirplaneMode(this.electronService.rpc(Channels.FASTFORWARDBRANCH, [this.repo.path, branch]));
  }

  checkout(branchOrHash: string, toNewBranch: boolean, andPull: boolean = false): Promise<void> {
    return this._submoduleCheckoutListener.detect(this.electronService.rpc(
      Channels.CHECKOUT,
      [this.repo.path, branchOrHash, toNewBranch, andPull]), true);
  }

  pull(force: boolean): Promise<void> {
    return this.handleAirplaneMode(this._submoduleCheckoutListener.detect(this.electronService.rpc(
      Channels.PULL,
      [this.repo.path, force]), true));
  }

  push(branch: BranchModel, force: boolean): Promise<void> {
    return this._remoteMessageListener.detect(this.handleAirplaneMode(this.electronService.rpc(
      Channels.PUSH,
      [this.repo.path, branch, force])), true);
  }

  deleteFiles(files: string[]): Promise<void> {
    return this.electronService.rpc(Channels.DELETEFILES, [this.repo.path, files]);
  }

  setBulkGitSettings(config: { [key: string]: string | number }, useGlobal: boolean): Promise<void> {
    return this.electronService.rpc(Channels.SETGITSETTINGS, [this.repo.path, config, useGlobal]);
  }

  checkGitBashVersions() {
    const handleResult = (err: { git: boolean, bash: boolean }) => {
      let errors = [];
      if (!err.git) {
        errors.push('git');
      }
      if (!err.bash) {
        errors.push('bash');
      }
      if (errors.length > 0) {
        this.errorService.receiveError(new ErrorModel(
          'home component, git bash version check',
          'checking the versions of Git and Bash',
          'Invalid path configuration(s) detected:\n\t' + errors.join('\n\t') +
          '\n\nPlease configure your paths correctly in the Settings menu'));
      }
    };
    this.electronService.rpc(Channels.CHECKGITBASHVERSIONS, ['./']).then(handleResult).catch(handleResult);
  }

  stage(files: string[]): Promise<void> {
    return this._crlfListener.detect(this.electronService.rpc(Channels.GITSTAGE, [this.repo.path, files]), true);
  }

  unstage(files: string[]): Promise<void> {
    return this._crlfListener.detect(this.electronService.rpc(Channels.GITUNSTAGE, [this.repo.path, files]), true);
  }

  createBranch(branchName: string): Promise<void> {
    return this.electronService.rpc(Channels.CREATEBRANCH, [this.repo.path, branchName]);
  }

  deleteBranch(branches: BranchModel[]): Promise<void> {
    return this.electronService.rpc(Channels.DELETEBRANCH, [this.repo.path, branches]);
  }

  mergeFile(file: string, mergetool: string): Promise<void> {
    return this.electronService.rpc(Channels.MERGE, [this.repo.path, file, mergetool]);
  }

  deleteWorktree(worktreeName: string): Promise<void> {
    return this.electronService.rpc(Channels.DELETEWORKTREE, [this.repo.path, worktreeName]);
  }

  stashChanges(onlyUnstaged: boolean, stashName: string): Promise<void> {
    return this._crlfListener.detect(this.electronService.rpc(
      Channels.STASH,
      [this.repo.path, onlyUnstaged, stashName]), true);
  }

  fetch(): Promise<void> {
    return this.handleAirplaneMode(this.electronService.rpc(Channels.FETCH, [this.repo.path]));
  }

  undoFileChanges(file: string[], revision: string, staged: boolean): Promise<void> {
    return this._crlfListener.detect(this.electronService.rpc(
      Channels.UNDOFILECHANGES,
      [this.repo.path, file, revision, staged]), true);
  }

  undoSubmoduleChanges(submodules: SubmoduleModel[]): Promise<void> {
    return this.electronService.rpc(
      Channels.UNDOSUBMODULECHANGES,
      [this.repo.path, submodules]);
  }

  resolveConflictsUsing(file: string, theirs: boolean): Promise<void> {
    return this._crlfListener.detect(this.electronService.rpc(
      Channels.RESOLVECONFLICTUSING,
      [this.repo.path, file, theirs]), true);
  }

  hardReset(): Promise<void> {
    return this.electronService.rpc(Channels.HARDRESET, [this.repo.path]);
  }

  commit(description: string, commitAndPush: boolean, amend: boolean): Promise<void> {
    return this._remoteMessageListener.detect(this.electronService.rpc(
      Channels.COMMIT,
      [this.repo.path, description, commitAndPush, this.tabDataService.getCurrentBranch(), amend]),
      true);
  }

  getBranchChanges(): Promise<RepositoryModel> {
    return this.electronService.rpc(Channels.GETBRANCHES, [this.repo.path]);
  }

  getFileChanges(): Promise<CommitModel> {
    return this.electronService.rpc(Channels.GETFILECHANGES, [this.repo.path]);
  }

  getCommandHistory(): Promise<CommandHistoryModel[]> {
    return this.electronService.rpc(Channels.GETCOMMANDHISTORY, [this.repo.path]);
  }

  renameBranch(branch: { oldName: string, newName: string }): Promise<void> {
    return this.electronService.rpc(Channels.RENAMEBRANCH, [this.repo.path, branch.oldName, branch.newName]);
  }

  private isAirplaneMode() {
    return this.settingsService.settings.airplaneMode;
  }

  private swallowError<T>(promise: Promise<T>) {
    return new Promise<T>((resolve, reject) => {
      promise.then(resolve).catch(() => resolve());
    });
  }
}
