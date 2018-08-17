import {ApplicationRef, Component, OnInit} from '@angular/core';
import {ElectronService} from '../../providers/electron.service';
import {HttpClient} from '@angular/common/http';
import {SettingsService} from '../../providers/settings.service';
import {RepositoryModel} from "../../../../shared/Repository.model";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  isLoading = false;
  tabs: number[] = [0];
  activeTab = 0;
  repoPaths: string[] = [''];
  tabNames: string[] = [''];
  editingTab = -1;
  repoCache: { [key: string]: RepositoryModel } = {};

  constructor(private electronService: ElectronService,
              public settingsService: SettingsService,
              private http: HttpClient,
              private applicationRef: ApplicationRef) {
  }

  ngOnInit() {
    this.settingsService.loadSettings(callback => {
      this.repoPaths = this.settingsService.settings.openRepos;
      this.activeTab = this.settingsService.settings.activeTab;
      this.tabNames = this.settingsService.settings.tabNames.map((x, index) => x || this.basename(this.settingsService.settings.openRepos[index]));
      this.tabs = [...this.repoPaths.keys()];
      this.repoPaths.forEach((p) => {
        this.repoCache[p] = new RepositoryModel();
      });
    });
  }

  changeTab(t: number) {
    this.activeTab = -1;
    this.applicationRef.tick();
    this.activeTab = t;
    this.saveOpenRepos();
  }

  addTab() {
    this.activeTab = this.tabs.length;
    this.tabs.push(this.tabs.length);
    this.repoPaths.push('');
    this.tabNames.push('Tab ' + this.activeTab);
    this.saveOpenRepos();
  }

  closeTab(t: number) {
    if (this.activeTab == t) {
      this.changeTab(--this.activeTab);
    }
    this.tabs.splice(t, 1);
    this.repoPaths.splice(t, 1);
    this.tabNames.splice(t, 1);
    this.tabs = [...this.tabs.keys()];
    if (this.tabs.length == 0) {
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
    this.settingsService.saveSettings();
  }

  editClick($event, t: number) {
    this.editingTab = t;
    $event.stopPropagation();
  }

  private basename(folderPath: string) {
    return folderPath.substring(folderPath.replace(/\\/g, '/').lastIndexOf('/') + 1);
  }
}
