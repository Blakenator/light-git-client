import {Injectable} from '@angular/core';
import {SettingsService} from './settings.service';
import {RepositoryModel} from '../../../shared/git/Repository.model';

@Injectable({
  providedIn: 'root',
})
export class TabService {
  tabData: { name: string, cache: RepositoryModel }[] = [{name: '', cache: new RepositoryModel()}];
  private _repoCache: { [key: string]: RepositoryModel } = {};

  constructor(private settingsService: SettingsService) {
  }

  private _activeTab: number;

  get activeTab(): number {
    return this._activeTab;
  }

  set activeTab(value: number) {
    this._activeTab = value;
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
  }

  public updateTabName(name: string, index: number = this.activeTab) {
    this.tabData[index].name = name;
  }
}
