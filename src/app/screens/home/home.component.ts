import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ElectronService } from '../../common/services/electron.service';
import { HttpClient } from '@angular/common/http';
import { SettingsService } from '../../services/settings.service';
import { GitService } from '../../services/git.service';
import { ErrorModel } from '../../../../shared/common/error.model';
import { ErrorService } from '../../common/services/error.service';
import { LoadingService } from '../../services/loading.service';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { TabDataService } from '../../services/tab-data.service';
import { NgbTooltipConfig } from '@ng-bootstrap/ng-bootstrap';
import { JobSchedulerService } from '../../services/job-system/job-scheduler.service';
import { RepoAreaDefaults } from '../../services/job-system/models';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  editingTab = -1;
  editedTabName = '';

  constructor(
    private electronService: ElectronService,
    public settingsService: SettingsService,
    public errorService: ErrorService,
    private loadingService: LoadingService,
    private http: HttpClient,
    private cd: ChangeDetectorRef,
    public tabService: TabDataService,
    public jobSchedulerService: JobSchedulerService,
    private gitService: GitService,
    config: NgbTooltipConfig,
  ) {
    config.container = 'body';
  }

  get activeTabIndex(): number {
    return this.tabService.activeTabIndex;
  }

  set activeTabIndex(value: number) {
    this.tabService.activeTabIndex = value;
  }

  ngOnInit() {
    this.settingsService.loadSettings((callback) => {
      this.activeTabIndex = this.settingsService.settings.activeTab;
      this.tabService.initializeCache();
      this.jobSchedulerService.scheduleSimpleOperation(
        this.gitService.checkGitBashVersions(),
      );
      this.jobSchedulerService.scheduleSimpleOperation(
        this.gitService.loadRepo(this.tabService.activeRepoCache.path),
      );
    });
  }

  public changeTab(t: number) {
    this.activeTabIndex = t;
    this.cd.detectChanges();
    this.saveOpenRepos();
  }

  addTab(path: string = '') {
    this.tabService.tabData.push({ path, name: TabDataService.basename(path) });
    this.activeTabIndex = this.tabService.tabCount() - 1;
    this.saveOpenRepos();
  }

  closeTab(t: number) {
    if (this.activeTabIndex == t) {
      this.changeTab(this.activeTabIndex - 1);
    }
    this.tabService.tabData.splice(t, 1);
    if (this.tabService.tabCount() == 0) {
      this.addTab();
    }
    this.saveOpenRepos();
  }

  loadRepo(path: string) {
    this.tabService.initializeCacheForPath(path, TabDataService.basename(path));
    this.saveOpenRepos();
    this.jobSchedulerService.scheduleSimpleOperation(
      this.gitService.loadRepo(path),
    );
  }

  saveOpenRepos() {
    this.settingsService.settings.activeTab = this.activeTabIndex;
    this.settingsService.settings.tabNames = this.tabService.tabData.map(
      (t) => t.name,
    );
    this.settingsService.settings.openRepos = this.tabService.tabData.map(
      (t) => t.path,
    );
    this.editingTab = -1;
    this.editedTabName = '';
    this.settingsService.saveSettings();
  }

  editClick($event, t: number) {
    this.editingTab = t;
    this.editedTabName = this.tabService.tabData[t].name;
    $event.stopPropagation();
  }

  repoLoadFailed($event: ErrorModel) {
    this.errorService.receiveError($event);
    // this.tabService.updateTabData(this.tabService.getNewTab('').cache);
    this.cd.detectChanges();
  }

  cancelEdit($event: any) {
    this.editedTabName = '';
    this.editingTab = -1;
    $event.stopPropagation();
  }

  saveEditedName(t: number) {
    this.tabService.updateTabName(this.editedTabName, t);
    this.saveOpenRepos();
  }

  moveTab(event: CdkDragDrop<number[]>) {
    this.tabService.tabData.splice(
      event.currentIndex,
      0,
      this.tabService.tabData.splice(event.previousIndex, 1)[0],
    );
    if (this.activeTabIndex == event.previousIndex) {
      this.changeTab(event.currentIndex);
    } else if (
      this.activeTabIndex > event.currentIndex &&
      this.activeTabIndex < event.previousIndex
    ) {
      this.changeTab(this.activeTabIndex - 1);
    } else if (
      this.activeTabIndex < event.currentIndex &&
      this.activeTabIndex > event.previousIndex
    ) {
      this.changeTab(this.activeTabIndex + 1);
    }
    this.saveOpenRepos();
  }

  getActiveTab() {
    return this.tabService.getActiveTab();
  }
}
