import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {ElectronService} from '../../providers/electron.service';
import {SettingsService} from '../../providers/settings.service';
import {SettingsModel} from '../../../../shared/SettingsModel';
import {Channels} from '../../../../shared/Channels';
import {CodeWatcherModel} from '../../../../shared/code-watcher.model';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  showSettingsDialog = false;
  tempSettings: SettingsModel;
  version: string;
  advanced: boolean;
  currentTab = 0;
  @Output() onSaveAction = new EventEmitter<SettingsModel>();

  constructor(private electronService: ElectronService,
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
    this.setThemeTemp();
    this.settingsService.saveSettings(this.tempSettings);
    this.tempSettings = this.settingsService.settings;
    this.showSettingsDialog = false;
    setTimeout(() => this.onSaveAction.emit(this.tempSettings), 100);
  }

  setThemeTemp() {
    (<any>window).setTheme(this.tempSettings.darkMode ? 'dark' : 'light');
  }

  copyTempSettings() {
    this.tempSettings = this.settingsService.settings.clone();
    this.showSettingsDialog = true;
  }

  cancelChanges() {
    this.showSettingsDialog = false;
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
