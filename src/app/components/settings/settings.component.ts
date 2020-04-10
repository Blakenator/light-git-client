import {ApplicationRef, Component, EventEmitter, OnInit, Output} from '@angular/core';
import {ElectronService} from '../../common/services/electron.service';
import {SettingsService} from '../../services/settings.service';
import {SettingsModel} from '../../../../shared/SettingsModel';
import {Channels} from '../../../../shared/Channels';
import {GitService} from '../../services/git.service';
import {ConfigItemModel} from '../../../../shared/git/config-item.model';
import {ModalService} from '../../common/services/modal.service';
import {ErrorModel} from '../../../../shared/common/error.model';
import {ErrorService} from '../../common/services/error.service';
import {JobSchedulerService} from '../../services/job-system/job-scheduler.service';

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
  tabs: string[] = ['General', 'Code Watchers', 'Config Shortcuts', 'Git Config'];
  configItems: ConfigItemModel[];
  @Output() onSaveAction = new EventEmitter<SettingsModel>();
  setGlobalDefaultUserConfig = false;
  setGlobalDefaultMergetoolConfig = false;

  mergetoolName = '';
  mergetoolCommand = '';
  credentialHelper: string;
  cacheHelperSeconds: string;
  currentEdit: ConfigItemModel;
  editedItem: ConfigItemModel;
  clickedKey = true;
  filter: string;
  isUpdateDownloaded = false;
  downloadedUpdateVersion: string;
  private mergetoolConfig: ConfigItemModel;
  private mergetoolCommandConfig: ConfigItemModel;
  private credentialHelperConfig: ConfigItemModel;

  constructor(private electronService: ElectronService,
              private gitService: GitService,
              private modalService: ModalService,
              private errorService: ErrorService,
              private applicationRef: ApplicationRef,
              public settingsService: SettingsService,
              private jobSchedulerService: JobSchedulerService,
  ) {
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
    this.electronService.rpc(Channels.GETVERSION).then(version => this.version = version);
  }

  saveDisabledReason() {
    return this.credentialHelper == 'cache' &&
           this.cacheHelperSeconds &&
           !this.cacheHelperSeconds.match(/^\d+$/) ? 'Cache timeout must be a number' : '';
  }

  saveSettings() {
    if (this.gitService.repo && this.gitService.repo.path) {
      if (this.tempSettings.username != this.settingsService.settings.username ||
        this.tempSettings.email != this.settingsService.settings.email) {
        this.gitService.setBulkGitSettings({
          'user.name': this.tempSettings.username || '',
          'user.email': this.tempSettings.email || '',
        }, this.setGlobalDefaultUserConfig);
      }
      if (this.mergetoolName.trim() &&
        (!this.mergetoolConfig ||
          this.mergetoolName != this.mergetoolConfig.value ||
          this.mergetoolCommandConfig.value != this.mergetoolCommand) &&
        this.mergetoolName) {
        this.gitService.setBulkGitSettings({
          'merge.tool': this.mergetoolName,
          ['mergetool.' + this.mergetoolName + '.cmd']: this.mergetoolCommand,
        }, this.setGlobalDefaultMergetoolConfig);
        this.tempSettings.mergetool = this.mergetoolName;
      }
      if (this.credentialHelper &&
        (!this.credentialHelperConfig ||
          this.credentialHelper != this.credentialHelperConfig.value ||
          (this.credentialHelper == 'cache' && this.cacheHelperSeconds))) {
        this.gitService.setBulkGitSettings({
          'credential.helper': this.credentialHelper +
            (this.credentialHelper == 'cache' ? ' --timeout ' + this.cacheHelperSeconds : ''),
        }, true);
      }
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
    this.electronService.rpc(Channels.ISUPDATEDOWNLOADED).then((info: { downloaded: boolean, version: string }) => {
      this.isUpdateDownloaded = info.downloaded;
      this.downloadedUpdateVersion = info.version;
    });

    this.tempSettings = this.settingsService.settings.clone();
    this.modalService.setModalVisible('settings', true);
    if (this.gitService.repo) {
      this.jobSchedulerService.scheduleSimpleOperation(this.gitService.getConfigItems())
          .result
          .then(configItems => {
            this.configItems = configItems;
            this.handleItemsUpdate(this.configItems);
            let username = this.configItems.find(item => item.key == 'user.name');
            this.mergetoolConfig = this.configItems.find(item => item.key == 'merge.tool');
            if (this.mergetoolConfig) {
              this.mergetoolName = this.mergetoolConfig.value;
              this.mergetoolCommandConfig = this.configItems.find(
                item => item.key == 'mergetool.' + this.mergetoolName + '.cmd');
              this.mergetoolCommand = this.mergetoolCommandConfig ? this.mergetoolCommandConfig.value : '';
            }
        this.credentialHelperConfig = this.configItems.find(item => item.key == 'credential.helper');
        if (this.credentialHelperConfig) {
          this.credentialHelper = this.credentialHelperConfig.value.split(' ')[0];
          this.cacheHelperSeconds = this.credentialHelper ==
                                    'cache' ? this.credentialHelperConfig.value.split(' ')[2] : 15 * 60 + '';
        } else {
          this.credentialHelper = 'cache';
          this.cacheHelperSeconds = 15 * 60 + '';
        }
        this.tempSettings.username = username ? username.value + '' : '';
        this.settingsService.settings.username = username ? username.value + '' : '';
        let email = this.configItems.find(x => x.key == 'user.email');
        this.tempSettings.email = email ? email.value + '' : '';
        this.settingsService.settings.email = email ? email.value + '' : '';
      })
          .catch(error => this.errorService.receiveError(
            new ErrorModel(
              'Git config component, getConfigItems',
              'getting config items',
              error)));
    }
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

  // CONFIG

  newItem() {
    let index = 0;
    while (this.configItems.find(x => x.key == 'newKey' + index)) {
      index++;
    }
    const newKey = 'newKey' + index;
    this.editedItem = new ConfigItemModel(newKey, 'newValue');
    this.configItems.push(this.editedItem);
    this.currentEdit = this.editedItem;
    this.clickedKey = true;
  }

  startEdit(item: ConfigItemModel, clickedKey: boolean) {
    this.clickedKey = clickedKey;
    this.editedItem = Object.assign({}, item);
    this.currentEdit = this.editedItem;
  }

  deleteConfigItem(item: ConfigItemModel) {
    if (item.sourceFile) {
      this.editedItem = Object.assign({}, item, {value: ''});
      this.doSaveItem(item);
    } else {
      this.configItems.splice(this.configItems.indexOf(item), 1);
    }
  }

  saveConfigItem(originalItem: ConfigItemModel, rename?: ConfigItemModel) {
    if (!this.editedItem ||
      !(this.editedItem.key || '').trim() ||
      !this.currentEdit ||
      ((!this.clickedKey && this.editedItem.value == originalItem.value) ||
        (this.clickedKey && this.editedItem.key == originalItem.key)) ||
      (!this.currentEdit.sourceFile && !this.currentEdit.value)) {
      return;
    }
    this.currentEdit = undefined;
    this.doSaveItem(originalItem, rename);
  }

  isEditing(item: ConfigItemModel) {
    return this.currentEdit && this.currentEdit.sourceFile == item.sourceFile && this.currentEdit.key == item.key;
  }

  cancelEdit() {
    this.currentEdit = undefined;
  }

  getConfigFileDisplay(sourceFile: string) {
    return sourceFile.replace(/^.*?:/, '').replace(/['"]/g, '').replace(/\\\\/g, '\\');
  }

  nextTabRow(item: ConfigItemModel) {
    if (!item.sourceFile) {
      setTimeout(() => {
        this.newItem();
        this.applicationRef.tick();
      }, 100);
    }
  }

  restartAndInstall() {
    this.electronService.rpc(Channels.RESTARTANDINSTALLUPDATE);
  }

  private doSaveItem(originalItem: ConfigItemModel, rename?: ConfigItemModel) {
   this.jobSchedulerService.scheduleOperation({
     name:Channels.SETCONFIGITEM,
     jobs:this.gitService.setConfigItem(this.editedItem, rename)
   }).result
        .then(items => this.handleItemsUpdate(items))
        .catch(error => {
          if (!this.editedItem.sourceFile) {
            this.configItems.pop();
          }
          this.editedItem = originalItem;
          this.errorService.receiveError(
            new ErrorModel(
              'Git config component, setConfigItem',
              'setting the config item',
              error || 'the section or key is invalid'));
        });
  }

  private handleItemsUpdate(items) {
    this.configItems = items;
    this.applicationRef.tick();
  }
}
