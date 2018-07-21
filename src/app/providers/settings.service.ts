import {Injectable} from '@angular/core';
import {ElectronService} from './electron.service';
import {SettingsModel} from '../../../shared/SettingsModel';

@Injectable()
export class SettingsService {
  settings: SettingsModel;

  constructor(private electronService: ElectronService) {
  }

  updateSettings(settings, callback: Function = () => {}) {
    this.settings = Object.assign(new SettingsModel(), settings);
    callback();
  }

  loadSettings(callback: Function = () => {
  }) {
    if (this.settings === undefined) {
      this.electronService.rpc('loadSettings', [], settings => this.updateSettings(settings, callback));
    }
  }

  listenSettings(callback: Function = () => {
  }) {
    if (this.settings === undefined) {
      this.electronService.listen('settingsChanged', settings => this.updateSettings(settings, callback));
    }
  }

  saveSettings(tempSettings: SettingsModel = this.settings) {
    this.electronService.rpc('saveSettings', [tempSettings], () => {
    });
    this.settings = tempSettings;
  }
}
