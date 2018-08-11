import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {ElectronService} from '../../providers/electron.service';
import {SettingsService} from '../../providers/settings.service';
import {SettingsModel} from '../../../../shared/SettingsModel';
import {Channels} from "../../../../shared/Channels";

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
  @Output() onSaveAction = new EventEmitter<SettingsModel>();

  constructor(private electronService: ElectronService,
              private settingsService: SettingsService) {
  }

  ngOnInit() {
    let callback = () => {
      this.tempSettings = this.settingsService.settings;
      (<any>window).setTheme(this.settingsService.settings.darkMode ? 'dark' : 'light');
    };
    this.settingsService.loadSettings(callback);
    this.settingsService.listenSettings(callback);
    this.electronService.rpc(Channels.GETVERSION, []).then(version => this.version = version);
  }

  saveSettings() {
    this.settingsService.saveSettings(this.tempSettings);
    this.tempSettings = this.settingsService.settings;
    this.showSettingsDialog = false;
    setTimeout(() => this.onSaveAction.emit(this.tempSettings), 100);
  }

  copyTempSettings() {
    this.tempSettings = Object.assign(new SettingsModel(), this.settingsService.settings);
    this.showSettingsDialog = true;
  }

  cancelChanges() {
    this.showSettingsDialog = false;
  }

  checkForUpdates() {
    this.electronService.rpc(Channels.CHECKFORUPDATES, []);
  }
}
