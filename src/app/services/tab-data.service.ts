import { Injectable } from '@angular/core';
import { SettingsService } from './settings.service';
import { RepositoryModel } from '../../../shared/git/Repository.model';
import { BranchModel } from '../../../shared/git/Branch.model';
import { JobSchedulerService } from './job-system/job-scheduler.service';
import { Job, RepoArea } from './job-system/models';
import { GitService } from './git.service';
import { ErrorService } from '../common/services/error.service';
import { Subject } from 'rxjs';

export interface ITabInfo {
  name: string;
  path: string;
}

export interface RepoMetadata {
  commitHistoryActiveBranch?: BranchModel;
  selectedUnstagedChanges?: { [key: string]: boolean };
  selectedStagedChanges?: { [key: string]: boolean };
}

@Injectable({
  providedIn: 'root',
})
export class TabDataService {
  tabData: ITabInfo[] = [{ name: '', path: '' }];
  private _repoCache: { [key: string]: RepositoryModel & RepoMetadata } = {};
  private _localBranchMap: Map<string, Map<string, BranchModel>> = new Map();
  private _remoteBranchMap: Map<string, Map<string, BranchModel>> = new Map();
  private _currentBranchMap: Map<string, BranchModel> = new Map();
  private _isInitialized = false;

  private _onFileDiff = new Subject<string>();
  public onFileDiff = this._onFileDiff.asObservable();

  constructor(
    private settingsService: SettingsService,
    private jobSchedulerService: JobSchedulerService,
    private gitService: GitService,
    private errorService: ErrorService,
  ) {
    this.jobSchedulerService.onFinishQueue.subscribe(
      ({ affectedAreas, path }) => {
        this.updateAreas(affectedAreas, path);
      },
    );
    // TODO: fix this
    this.gitService.tabDataService = this;
  }

  private _activeTabIndex: number;

  get activeTabIndex(): number {
    return this._activeTabIndex;
  }

  set activeTabIndex(value: number) {
    let newTabIndex = Math.max(0, value);
    if (this._isInitialized && newTabIndex !== this._activeTabIndex) {
      this.jobSchedulerService.scheduleSimpleOperation(
        this.gitService.loadRepo(this.tabData[newTabIndex].path),
      );
    }
    this._activeTabIndex = newTabIndex;
  }

  get activeRepoCache(): RepositoryModel {
    let path = this.getActiveTab().path;
    this.initializeCacheForPath(path);
    return this._repoCache[path];
  }

  static basename(folderPath: string) {
    return folderPath.substring(
      folderPath.replace(/\\/g, '/').lastIndexOf('/') + 1,
    );
  }

  public tabCount(): number {
    return this.tabData.length;
  }

  getActiveTab(): ITabInfo {
    return this.tabData[this.activeTabIndex];
  }

  public initializeCache() {
    this.tabData = this.settingsService.settings.tabNames.map(
      (name, index) => ({
        path: this.settingsService.settings.openRepos[index],
        name,
      }),
    );
    this.tabData.forEach(({ path }) => {
      this.initializeCacheForPath(path);
    });
    this._isInitialized = true;
  }

  public updateTabName(name: string, index: number = this.activeTabIndex) {
    this.tabData[index].name = name;
  }

  public getRemoteBranchMap() {
    return this._remoteBranchMap.get(this.activeRepoCache.path) ?? new Map();
  }

  public getLocalBranchMap() {
    return this._localBranchMap.get(this.activeRepoCache.path) ?? new Map();
  }

  public getCurrentBranch() {
    return this._currentBranchMap.get(this.activeRepoCache.path);
  }

  public updateAreas(affectedAreas: Set<RepoArea>, path: string) {
    if (affectedAreas.size === 0) {
      return;
    }
    let cache = this.getCacheFor(path);
    if (!cache) {
      return;
    }
    if (affectedAreas.has(RepoArea.COMMIT_HISTORY)) {
      this.jobSchedulerService
        .scheduleSimpleOperation(
          this.gitService.getCommitHistory(
            0,
            cache.commitHistoryActiveBranch?.name,
          ),
        )
        .result.then((result) => (cache.commitHistory = result))
        .catch((err) => this.errorService.receiveError(err));
    }
    if (affectedAreas.has(RepoArea.STASHES)) {
      this.jobSchedulerService
        .scheduleSimpleOperation(this.gitService.getStashes())
        .result.then((result) => (cache.stashes = result))
        .catch((err) => this.errorService.receiveError(err));
    }
    if (affectedAreas.has(RepoArea.WORKTREES)) {
      this.jobSchedulerService
        .scheduleSimpleOperation(this.gitService.getWorktrees())
        .result.then((result) => (cache.worktrees = result))
        .catch((err) => this.errorService.receiveError(err));
    }
    if (affectedAreas.has(RepoArea.REMOTE_BRANCHES)) {
      this.jobSchedulerService
        .scheduleOperation<BranchModel[]>({
          name: 'get remote branches and fetch',
          jobs: [
            this.gitService.fetch(false) as Job,
            this.gitService.getRemoteBranches(),
          ],
        })
        .result.then((result) => {
          cache.remoteBranches = result;
          this._remoteBranchMap.set(
            path,
            new Map<string, BranchModel>(
              cache.remoteBranches.map((branch) => [branch.name, branch]),
            ),
          );
        })
        .catch((err) => this.errorService.receiveError(err));
    }
    if (affectedAreas.has(RepoArea.LOCAL_BRANCHES)) {
      this.jobSchedulerService
        .scheduleSimpleOperation(this.gitService.getLocalBranches())
        .result.then((result) => {
          cache.localBranches = result;
          this._localBranchMap.set(
            path,
            new Map<string, BranchModel>(
              cache.localBranches.map((branch) => [branch.name, branch]),
            ),
          );
          this._currentBranchMap.set(
            path,
            cache.localBranches.find((branch) => branch.isCurrentBranch),
          );
        })
        .catch((err) => this.errorService.receiveError(err));
    }
    if (affectedAreas.has(RepoArea.SUBMODULES)) {
      this.jobSchedulerService
        .scheduleSimpleOperation(this.gitService.getSubmodules())
        .result.then((result) => (cache.submodules = result))
        .catch((err) => this.errorService.receiveError(err));
    }
    if (affectedAreas.has(RepoArea.LOCAL_CHANGES)) {
      this.jobSchedulerService
        .scheduleSimpleOperation(this.gitService.getFileChanges())
        .result.then((result) => {
          cache.changes = { ...result, description: cache.changes.description };
          this._onFileDiff.next(path);
        })
        .catch((err) => this.errorService.receiveError(err));
    }
  }

  public getCacheFor(currentPath: string) {
    return this._repoCache[currentPath];
  }

  public setMetadataForPath(
    currentPath: string,
    metadata: Partial<RepoMetadata>,
  ) {
    Object.assign(this._repoCache[currentPath], metadata);
  }

  public initializeCacheForPath(path: string) {
    if (!this.getCacheFor(path)) {
      this._repoCache[path] = new RepositoryModel();
      this._repoCache[path].path = path;
      this._repoCache[path].selectedStagedChanges = {};
      this._repoCache[path].selectedUnstagedChanges = {};
    }
  }

  public setActiveTabData(path: string, name?: string) {
    let activeTab = this.getActiveTab();
    activeTab.name = name || activeTab.name || TabDataService.basename(path);
    activeTab.path = path;
  }
}
