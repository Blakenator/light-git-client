import {ApplicationRef, Component, EventEmitter, OnInit, Output} from '@angular/core';
import {ElectronService} from '../../common/services/electron.service';
import {SettingsService} from '../../services/settings.service';
import {SettingsModel} from '../../../../shared/SettingsModel';
import {Channels} from '../../../../shared/Channels';
import {CodeWatcherModel} from '../../../../shared/code-watcher.model';
import {GitService} from '../../services/git.service';
import {ConfigItemModel} from '../../../../shared/git/config-item.model';
import {ModalService} from '../../common/services/modal.service';

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
  setGlobalDefaultUserConfig = false;
  setGlobalDefaultMergetoolConfig = false;

  mergetoolName = '';
  mergetoolCommand = '';
  credentialHelper: string;
  cacheHelperSeconds: string;
  private mergetoolConfig: ConfigItemModel;
  private mergetoolCommandConfig: ConfigItemModel;
  private credentialHelperConfig: ConfigItemModel;

  constructor(private electronService: ElectronService,
              private gitService: GitService,
              private modalService: ModalService,
              private applicationRef: ApplicationRef,
              public settingsService: SettingsService) {
  }

  ngOnInit() {
    let callback = (set = false) => {
      if ((this.tempSettings && this.tempSettings.darkMode != this.settingsService.settings.darkMode) || set) {
        (<any>window).setTheme(this.settingsService.settings.darkMode ? 'dark' : 'light');
      }
      this.tempSettings = this.settingsService.settings;
      if (!this.settingsService.settings.allowStats) {
        this.modalService.setModalVisible('stats', true);
      }
    };
    this.settingsService.loadSettings(() => callback(true));
    this.settingsService.listenSettings(() => callback());
    this.electronService.rpc(Channels.GETVERSION, []).then(version => this.version = version);
  }

  saveDisabledReason() {
    return this.credentialHelper == 'cache' &&
           this.cacheHelperSeconds &&
           !this.cacheHelperSeconds.match(/^\d+$/) ? 'Cache timeout must be a number' : '';
  }

  saveSettings() {
    if (this.tempSettings.username != this.settingsService.settings.username || this.tempSettings.email != this.settingsService.settings.email) {
      this.gitService.setBulkGitSettings({
        'user.name': this.tempSettings.username,
        'user.email': this.tempSettings.email,
      }, this.setGlobalDefaultUserConfig);
    }
    if (this.mergetoolName.trim() && (!this.mergetoolConfig || this.mergetoolName != this.mergetoolConfig.value || this.mergetoolCommandConfig.value != this.mergetoolCommand)) {
      this.gitService.setBulkGitSettings({
        'merge.tool': this.mergetoolName,
        ['mergetool.' + this.mergetoolName + '.cmd']: this.mergetoolCommand,
      }, this.setGlobalDefaultMergetoolConfig);
    }
    if (!this.credentialHelperConfig || this.credentialHelper != this.credentialHelperConfig.value || this.credentialHelper == 'cache') {
      this.gitService.setBulkGitSettings({
        'credential.helper': this.credentialHelper + (this.credentialHelper == 'cache' ? ' --timeout ' + this.cacheHelperSeconds : ''),
      }, true);
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
      let username = this.configItems.find(item => item.key == 'user.name');
      this.mergetoolConfig = this.configItems.find(item => item.key == 'merge.tool');
      if (this.mergetoolConfig) {
        this.mergetoolName = this.mergetoolConfig.value;
        this.mergetoolCommandConfig = this.configItems.find(
          item => item.key == 'mergetool.' + this.mergetoolName + '.cmd');
        this.mergetoolCommand = this.mergetoolCommandConfig.value;
      }
      this.credentialHelperConfig = this.configItems.find(item => item.key == 'credential.helper');
      if (this.credentialHelperConfig) {
        this.credentialHelper = this.credentialHelperConfig.value.split(' ')[0];
        this.cacheHelperSeconds = this.credentialHelper == 'cache' ? this.credentialHelperConfig.value.split(' ')[2] : 15 * 60 + '';
      } else {
        this.credentialHelper = 'cache';
        this.cacheHelperSeconds = 15 * 60 + '';
      }
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
