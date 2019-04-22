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
    if (!this._repoCache[this.activeTab]) {
      this._repoCache[this.activeTab] = new RepositoryModel();
    }
    return this._repoCache[this.activeTab];
  }

  static basename(folderPath: string) {
    return folderPath.substring(folderPath.replace(/\\/g, '/').lastIndexOf('/') + 1);
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
}