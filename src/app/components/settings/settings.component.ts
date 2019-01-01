import {ApplicationRef, Component, EventEmitter, OnInit, Output} from '@angular/core';
import {ElectronService} from '../../services/electron.service';
import {SettingsService} from '../../services/settings.service';
import {SettingsModel} from '../../../../shared/SettingsModel';
import {Channels} from '../../../../shared/Channels';
import {CodeWatcherModel} from '../../../../shared/code-watcher.model';
import {GitService} from '../../services/git.service';
import {ConfigItemModel} from '../../../../shared/git/config-item.model';
import {ModalService} from '../../services/modal.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {
  tempSettings: SettingsModel;
  version: string;
  advanced: boolean;
  currentTab = 0;
  tabs: string[] = ['General', 'Code Watchers', 'Config Shortcuts'];
  configItems: ConfigItemModel[];
  @Output() onSaveAction = new EventEmitter<SettingsModel>();

  constructor(private electronService: ElectronService,
              private gitService: GitService,
              private modalService: ModalService,
              private applicationRef: ApplicationRef,
              private settingsService: SettingsService) {
  }

  ngOnInit() {
    let callback = (set = false) => {
      if ((this.tempSettings && this.tempSettings.darkMode != this.settingsService.settings.darkMode) || set) {
        (<any>window).setTheme(this.settingsService.settings.darkMode ? 'dark' : 'light');
      }
      this.tempSettings = this.settingsService.settings;
    };
    this.settingsService.loadSettings(() => callback(true));
    this.settingsService.listenSettings(() => callback());
    this.electronService.rpc(Channels.GETVERSION, []).then(version => this.version = version);
  }

  saveSettings() {
    if (this.tempSettings.username != this.settingsService.settings.username || this.tempSettings.email != this.settingsService.settings.email) {
      this.gitService.setBulkGitSettings({
        ['user.name']: this.tempSettings.username,
        ['user.email']: this.tempSettings.email,
      });
    }
    this.setThemeTemp();
    this.settingsService.saveSettings(this.tempSettings);
    this.tempSettings = this.settingsService.settings;
    this.modalService.setModalVisible('settings', false);
    this.gitService.checkGitBashVersions();
    setTimeout(() => this.onSaveAction.emit(this.tempSettings), 100);
  }

  setThemeTemp() {
    (<any>window).setTheme(this.tempSettings.darkMode ? 'dark' : 'light');
  }

  copyTempSettings() {
    this.tempSettings = this.settingsService.settings.clone();
    this.modalService.setModalVisible('settings', true);
    this.gitService.getConfigItems().then(configItems => {
      this.configItems = configItems;
      let username = this.configItems.find(x => x.key == 'user.name');
      this.tempSettings.username = username ? username.value + '' : '';
      this.settingsService.settings.username = username ? username.value + '' : '';
      let email = this.configItems.find(x => x.key == 'user.email');
      this.tempSettings.email = email ? email.value + '' : '';
      this.settingsService.settings.email = email ? email.value + '' : '';
    });
  }

  cancelChanges() {
    this.modalService.setModalVisible('settings', false);
  }

  checkForUpdates() {
    this.electronService.rpc(Channels.CHECKFORUPDATES, []);
  }

  openDevTools() {
    this.electronService.rpc(Channels.OPENDEVTOOLS, []);
  }

  addWatcher() {
    this.tempSettings.codeWatchers.push(new CodeWatcherModel());
  }
}
