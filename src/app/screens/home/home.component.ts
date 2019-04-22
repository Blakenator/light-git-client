import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {ElectronService} from '../../common/services/electron.service';
import {HttpClient} from '@angular/common/http';
import {SettingsService} from '../../services/settings.service';
import {GitService} from '../../services/git.service';
import {ErrorModel} from '../../../../shared/common/error.model';
import {ErrorService} from '../../common/services/error.service';
import {LoadingService} from '../../services/loading.service';
import {CdkDragDrop} from '@angular/cdk/drag-drop';
import {TabService} from '../../services/tab.service';
import {RepositoryModel} from '../../../../shared/git/Repository.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  isLoading = false;
  editingTab = -1;
  editedTabName = '';

  constructor(private electronService: ElectronService,
              public settingsService: SettingsService,
              public errorService: ErrorService,
              private loadingService: LoadingService,
              private http: HttpClient,
              private cd: ChangeDetectorRef,
              private tabService: TabService,
              private gitService: GitService) {
  }

  get tabData(): { name: string; cache: RepositoryModel }[] {
    return this.tabService.tabData;
  }

  set tabData(value: { name: string; cache: RepositoryModel }[]) {
    this.tabService.tabData = value;
  }

  get activeTab(): number {
    return this.tabService.activeTab;
  }

  set activeTab(value: number) {
    this.tabService.activeTab = value;
  }

  ngOnInit() {
    this.loadingService.onLoadingChanged.subscribe(val => {
      this.isLoading = val;
      this.cd.detectChanges();
    });
    this.settingsService.loadSettings(callback => {
      this.activeTab = this.settingsService.settings.activeTab;
      this.tabData = this.settingsService.settings.tabNames.map((x, index) =>
        this.tabService.getNewTab(
          this.settingsService.settings.openRepos[index],
          x || TabService.basename(this.settingsService.settings.openRepos[index])));
      this.tabService.initializeCache();
      this.gitService.repo = this.tabService.activeRepoCache;
      this.gitService.checkGitBashVersions();
    });
  }

  changeTab(t: number) {
    this.activeTab = -1;
    this.cd.detectChanges();
    this.activeTab = t;
    this.saveOpenRepos();
  }

  addTab(path: string = '') {
    this.activeTab = this.tabData.length;
    this.tabData.push(this.tabService.getNewTab(path));
    if (path) {
      setTimeout(() => {
        this.loadRepo(path);
        this.cd.detectChanges();
      }, 100);
    }
    this.saveOpenRepos();
  }

  closeTab(t: number) {
    if (this.activeTab == t) {
      this.changeTab(--this.activeTab);
    }
    this.tabData.splice(t, 1);
    if (this.tabData.length == 0) {
      this.addTab();
    }
    this.saveOpenRepos();
  }

  loadRepo(path: string) {
    this.tabData[this.activeTab] = this.tabService.getNewTab(path, TabService.basename(path));
    this.saveOpenRepos();
  }

  saveOpenRepos() {
    this.settingsService.settings.activeTab = this.activeTab;
    this.settingsService.settings.tabNames = this.tabData.map(t => t.name);
    this.settingsService.settings.openRepos = this.tabData.map(t => t.cache.path);
    this.editingTab = -1;
    this.editedTabName = '';
    this.gitService.repo = this.tabService.activeRepoCache;
    this.settingsService.saveSettings();
  }

  editClick($event, t: number) {
    this.editingTab = t;
    this.editedTabName = this.tabData[t].name;
    $event.stopPropagation();
  }

  repoLoadFailed($event: ErrorModel) {
    this.errorService.receiveError($event);
    this.tabData[this.activeTab] = this.tabService.getNewTab('');
    this.cd.detectChanges();
  }

  cancelEdit($event: any) {
    this.editedTabName = '';
    this.editingTab = -1;
    $event.stopPropagation();
  }

  saveEditedName(t: number) {
    this.tabData[t].name = this.editedTabName;
    this.saveOpenRepos();
  }

  moveTab(event: CdkDragDrop<number[]>) {
    this.tabData.splice(event.currentIndex, 0, this.tabData.splice(event.previousIndex, 1)[0]);
    this.changeTab(event.currentIndex);
    this.saveOpenRepos();
  }

  getActiveTabData() {
    return this.tabData[this.activeTab];
  }
}
