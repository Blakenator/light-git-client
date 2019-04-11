import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {ElectronService} from '../../common/services/electron.service';
import {HttpClient} from '@angular/common/http';
import {SettingsService} from '../../services/settings.service';
import {RepositoryModel} from '../../../../shared/git/Repository.model';
import {GitService} from '../../services/git.service';
import {ErrorModel} from '../../../../shared/common/error.model';
import {ErrorService} from '../../common/services/error.service';
import {LoadingService} from '../../services/loading.service';
import {CdkDragDrop} from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  isLoading = false;
  activeTab = 0;
  repoPaths: string[] = [''];
  tabNames: string[] = [''];
  editingTab = -1;
  editedTabName = '';
  repoCache: { [key: string]: RepositoryModel } = {};

  constructor(private electronService: ElectronService,
              public settingsService: SettingsService,
              public errorService: ErrorService,
              private loadingService: LoadingService,
              private http: HttpClient,
              private cd: ChangeDetectorRef,
              private gitService: GitService) {
  }

  ngOnInit() {
    this.loadingService.onLoadingChanged.subscribe(val => {
      this.isLoading = val;
      this.cd.detectChanges();
    });
    this.settingsService.loadSettings(callback => {
      this.repoPaths = this.settingsService.settings.openRepos;
      this.activeTab = this.settingsService.settings.activeTab;
      this.tabNames = this.settingsService.settings.tabNames.map((x, index) =>
        x || this.basename(this.settingsService.settings.openRepos[index]));
      this.repoPaths.forEach((p) => {
        this.repoCache[p] = new RepositoryModel();
        this.repoCache[p].path = this.repoPaths[p];
      });
      this.gitService.repo = this.repoCache[this.activeTab];
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
    this.activeTab = this.tabNames.length;
    this.repoPaths.push('');
    this.tabNames.push('Tab ' + this.activeTab);
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
    this.repoPaths.splice(t, 1);
    this.tabNames.splice(t, 1);
    if (this.tabNames.length == 0) {
      this.addTab();
    }
    this.saveOpenRepos();
  }

  loadRepo($event: string) {
    this.repoPaths[this.activeTab] = $event;
    this.tabNames[this.activeTab] = this.basename($event);
    this.saveOpenRepos();
  }

  saveOpenRepos() {
    this.settingsService.settings.activeTab = this.activeTab;
    this.settingsService.settings.tabNames = this.tabNames;
    this.settingsService.settings.openRepos = this.repoPaths;
    this.editingTab = -1;
    this.editedTabName = '';
    this.gitService.repo = this.repoCache[this.activeTab];
    this.settingsService.saveSettings();
  }

  editClick($event, t: number) {
    this.editingTab = t;
    this.editedTabName = this.tabNames[t];
    $event.stopPropagation();
  }

  repoLoadFailed($event: ErrorModel) {
    this.errorService.receiveError($event);
    this.repoPaths[this.activeTab] = '';
    this.tabNames[this.activeTab] = 'Tab ' + this.activeTab;
    this.cd.detectChanges();
  }

  cancelEdit($event: any) {
    this.editedTabName = '';
    this.editingTab = -1;
    $event.stopPropagation();
  }

  saveEditedName(t: number) {
    this.tabNames[t] = this.editedTabName;
    this.saveOpenRepos();
  }

  moveTab(event: CdkDragDrop<number[]>) {
    this.tabNames.splice(event.currentIndex, 0, this.tabNames.splice(event.previousIndex, 1)[0]);
    this.repoPaths.splice(event.currentIndex, 0, this.repoPaths.splice(event.previousIndex, 1)[0]);
    this.changeTab(event.currentIndex);
    this.saveOpenRepos();
  }

  private basename(folderPath: string) {
    return folderPath.substring(folderPath.replace(/\\/g, '/').lastIndexOf('/') + 1);
  }
}
