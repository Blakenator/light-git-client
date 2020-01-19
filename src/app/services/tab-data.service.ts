import {Injectable} from '@angular/core';
import {SettingsService} from './settings.service';
import {RepositoryModel} from '../../../shared/git/Repository.model';
import {BranchModel} from '../../../shared/git/Branch.model';

@Injectable({
  providedIn: 'root',
})
export class TabDataService {
  tabData: { name: string, cache: RepositoryModel }[] = [{name: '', cache: new RepositoryModel()}];
  private _repoCache: { [key: string]: RepositoryModel } = {};
  private _localBranchMap: Map<string, Map<string, BranchModel>> = new Map();
  private _remoteBranchMap: Map<string, Map<string, BranchModel>> = new Map();
  private _currentBranchMap:Map<string,BranchModel>=new Map();

  constructor(private settingsService: SettingsService) {
  }

  private _activeTab: number;

  get activeTab(): number {
    return this._activeTab;
  }

  set activeTab(value: number) {
    this._activeTab = Math.max(0, value);
  }

  get activeRepoCache(): RepositoryModel {
    if (!this._repoCache[this.getActiveTabData().cache.path]) {
      this._repoCache[this.getActiveTabData().cache.path] = new RepositoryModel();
    }
    return this._repoCache[this.getActiveTabData().cache.path];
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
    this.settingsService.settings.openRepos.forEach((p) => {
      this._repoCache[p] = new RepositoryModel();
      this._repoCache[p].path = p;
    });
  }

  public getNewTab(path?: string, name?: string) {
    return {name: name || 'Tab ' + this.activeTab, cache: Object.assign(new RepositoryModel(), {path: path || ''})};
  }

  public updateTabData(data: RepositoryModel, index: number = this.activeTab) {
    this.tabData[index].cache = data;
    this._localBranchMap.set(data.path,new Map<string, BranchModel>(data.localBranches.map(branch => [
      branch.name,
      branch
    ])));
    this._remoteBranchMap.set(data.path, new Map<string, BranchModel>(data.remoteBranches.map(branch => [
      branch.name,
      branch,
    ])));
    this._currentBranchMap.set(this.activeRepoCache.path, data.localBranches.find(branch => branch.isCurrentBranch));
  }

  public updateTabName(name: string, index: number = this.activeTab) {
    this.tabData[index].name = name;
  }

  public getRemoteBranchMap(){
    return this._remoteBranchMap.get(this.activeRepoCache.path) ?? new Map();
  }

  public getLocalBranchMap(){
    return this._localBranchMap.get(this.activeRepoCache.path) ?? new Map();
  }

  public getCurrentBranch(){
    return this._currentBranchMap.get(this.activeRepoCache.path);
  }
}
