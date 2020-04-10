import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {ElectronService} from '../../common/services/electron.service';
import {HttpClient} from '@angular/common/http';
import {SettingsService} from '../../services/settings.service';
import {GitService} from '../../services/git.service';
import {ErrorModel} from '../../../../shared/common/error.model';
import {ErrorService} from '../../common/services/error.service';
import {LoadingService} from '../../services/loading.service';
import {CdkDragDrop} from '@angular/cdk/drag-drop';
import {TabDataService} from '../../services/tab-data.service';
import {NgbTooltipConfig} from '@ng-bootstrap/ng-bootstrap';
import {JobSchedulerService} from '../../services/job-system/job-scheduler.service';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
    editingTab = -1;
    editedTabName = '';

    constructor(private electronService: ElectronService,
                public settingsService: SettingsService,
                public errorService: ErrorService,
                private loadingService: LoadingService,
                private http: HttpClient,
                private cd: ChangeDetectorRef,
                public tabService: TabDataService,
                public jobSchedulerService: JobSchedulerService,
                private gitService: GitService,
                config: NgbTooltipConfig) {
        config.container = 'body';
    }

    get activeTab(): number {
        return this.tabService.activeTab;
    }

    set activeTab(value: number) {
        this.tabService.activeTab = value;
    }

    ngOnInit() {
        this.loadingService.onLoadingChanged.subscribe(val => {
            this.cd.detectChanges();
        });
        this.settingsService.loadSettings(callback => {
            this.activeTab = this.settingsService.settings.activeTab;
            this.tabService.tabData = this.settingsService.settings.tabNames.map((x, index) =>
                this.tabService.getNewTab(
                    this.settingsService.settings.openRepos[index],
                    x || TabDataService.basename(this.settingsService.settings.openRepos[index])));
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
        this.activeTab = this.tabService.tabCount();
        this.tabService.tabData.push(this.tabService.getNewTab(path, TabDataService.basename(path)));
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
        this.tabService.tabData.splice(t, 1);
        if (this.tabService.tabCount() == 0) {
            this.addTab();
        }
        this.saveOpenRepos();
    }

    loadRepo(path: string) {
        if (!this.tabService.getActiveTabData().cache.path || this.tabService.getActiveTabData().cache.path === path) {
            this.tabService.updateTabData(this.tabService.getNewTab(path).cache);
            this.tabService.updateTabName(TabDataService.basename(path));
            this.saveOpenRepos();
        }
    }

    saveOpenRepos() {
        this.settingsService.settings.activeTab = this.activeTab;
        this.settingsService.settings.tabNames = this.tabService.tabData.map(t => t.name);
        this.settingsService.settings.openRepos = this.tabService.tabData.map(t => t.cache.path);
        this.editingTab = -1;
        this.editedTabName = '';
        this.gitService.repo = this.tabService.activeRepoCache;
        this.settingsService.saveSettings();
    }

    editClick($event, t: number) {
        this.editingTab = t;
        this.editedTabName = this.tabService.tabData[t].name;
        $event.stopPropagation();
    }

    repoLoadFailed($event: ErrorModel) {
        this.errorService.receiveError($event);
        this.tabService.updateTabData(this.tabService.getNewTab('').cache);
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
            this.tabService.tabData.splice(event.previousIndex, 1)[0]);
        if (this.activeTab == event.previousIndex) {
            this.activeTab = event.currentIndex;
        } else if (this.activeTab > event.currentIndex && this.activeTab < event.previousIndex) {
            this.activeTab++;
        } else if (this.activeTab < event.currentIndex && this.activeTab > event.previousIndex) {
            this.activeTab--;
        }
        this.saveOpenRepos();
    }

    getActiveTabData() {
        return this.tabService.getActiveTabData();
    }
}
