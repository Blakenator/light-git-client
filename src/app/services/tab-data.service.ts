import {Injectable} from '@angular/core';
import {SettingsService} from './settings.service';
import {RepositoryModel} from '../../../shared/git/Repository.model';
import {BranchModel} from '../../../shared/git/Branch.model';
import {JobSchedulerService} from './job-system/job-scheduler.service';
import {RepoArea} from './job-system/models';
import {GitService} from './git.service';
import {ErrorService} from '../common/services/error.service';

@Injectable({
  providedIn: 'root',
})
export class TabDataService {
  tabData: { name: string, path: string }[] = [{name: '', path: ''}];
  private _repoCache: { [key: string]: RepositoryModel } = {};
  private _localBranchMap: Map<string, Map<string, BranchModel>> = new Map();
  private _remoteBranchMap: Map<string, Map<string, BranchModel>> = new Map();
  private _currentBranchMap: Map<string, BranchModel> = new Map();
  private _isInitialized = false;

  constructor(private settingsService: SettingsService,
              private jobSchedulerService: JobSchedulerService,
              private gitService: GitService,
              private errorService: ErrorService) {
    this.jobSchedulerService.onFinishQueue.subscribe(({affectedAreas, path}) => {
      this.updateAreas(affectedAreas, path);
    });
    // TODO: fix this
    this.gitService.tabDataService = this;
  }

  private _activeTab: number;

  get activeTab(): number {
    return this._activeTab;
  }

  set activeTab(value: number) {
    let newTabIndex = Math.max(0, value);
    if (this._isInitialized && newTabIndex !== this._activeTab) {
      this.jobSchedulerService.scheduleSimpleOperation(this.gitService.loadRepo(this.tabData[newTabIndex].path));
    }
    this._activeTab = newTabIndex;
  }

  get activeRepoCache(): RepositoryModel {
    if (!this._repoCache[this.getActiveTabData().path]) {
      this._repoCache[this.getActiveTabData().path] = new RepositoryModel();
    }
    return this._repoCache[this.getActiveTabData().path];
  }

  static basename(folderPath: string) {
    return folderPath.substring(folderPath.replace(/\\/g, '/').lastIndexOf('/') + 1);
  }

  public tabCount(): number {
    return this.tabData.length;
  }

  getActiveTabData() {
    return this.tabData[this.activeTab];
  }

  public initializeCache() {
    this.tabData = this.settingsService.settings.tabNames.map((name, index) => ({
      path: this.settingsService.settings.openRepos[index],
      name,
    }));
    this.tabData.forEach(({path, name}) => {
      this._repoCache[path] = new RepositoryModel();
      this._repoCache[path].path = path;
      this._repoCache[path].name = name;
    });
    this._isInitialized = true;
  }

  public updateTabName(name: string, index: number = this.activeTab) {
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
    // TODO: actually use original path (need to update how gitservice works)
    let cache = this.getCacheFor(this.activeRepoCache.path);
    if (affectedAreas.has(RepoArea.COMMIT_HISTORY)) {
      this.jobSchedulerService.scheduleSimpleOperation(this.gitService.getCommitHistory(0))
          .result
          .then(result => cache.commitHistory = result).catch(err => this.errorService.receiveError(err));
    }
    if (affectedAreas.has(RepoArea.STASHES)) {
      this.jobSchedulerService.scheduleSimpleOperation(this.gitService.getStashes())
          .result
          .then(result => cache.stashes = result).catch(err => this.errorService.receiveError(err));
    }
    if (affectedAreas.has(RepoArea.WORKTREES)) {
      this.jobSchedulerService.scheduleSimpleOperation(this.gitService.getWorktrees())
          .result
          .then(result => cache.worktrees = result).catch(err => this.errorService.receiveError(err));
    }
    if (affectedAreas.has(RepoArea.LOCAL_BRANCHES)) {
      this.jobSchedulerService.scheduleSimpleOperation(this.gitService.getLocalBranches())
          .result
          .then(result => cache.localBranches = result).catch(err => this.errorService.receiveError(err));
      this._localBranchMap.set(cache.path, new Map<string, BranchModel>(cache.localBranches.map(branch => [
        branch.name,
        branch,
      ])));
      this._currentBranchMap.set(this.activeRepoCache.path, cache.localBranches.find(branch => branch.isCurrentBranch));
    }
    if (affectedAreas.has(RepoArea.REMOTE_BRANCHES)) {
      this.jobSchedulerService.scheduleSimpleOperation(this.gitService.getRemoteBranches())
          .result
          .then(result => cache.remoteBranches = result).catch(err => this.errorService.receiveError(err));
      this._remoteBranchMap.set(cache.path, new Map<string, BranchModel>(cache.remoteBranches.map(branch => [
        branch.name,
        branch,
      ])));
    }
    if (affectedAreas.has(RepoArea.SUBMODULES)) {
      this.jobSchedulerService.scheduleSimpleOperation(this.gitService.getSubmodules())
          .result
          .then(result => cache.submodules = result).catch(err => this.errorService.receiveError(err));
    }
    if (affectedAreas.has(RepoArea.LOCAL_CHANGES)) {
      this.jobSchedulerService.scheduleSimpleOperation(this.gitService.getFileChanges())
          .result
          .then(result => cache.changes = result).catch(err => this.errorService.receiveError(err));
    }
  }

  public getCacheFor(currentPath: string) {
    return this._repoCache[currentPath];
  }
}
