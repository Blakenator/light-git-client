import {Injectable} from '@angular/core';
import {ElectronService} from '../common/services/electron.service';
import {SettingsModel} from '../../../shared/SettingsModel';
import {Channels} from "../../../shared/Channels";

@Injectable()
export class SettingsService {
  settings: SettingsModel;

  constructor(private electronService: ElectronService) {
  }

  updateSettings(settings, callback: Function = () => {
  }) {
    this.settings = Object.assign(new SettingsModel(), settings);
    callback();
  }

  loadSettings(callback: Function = () => {
  }) {
    if (this.settings === undefined) {
      this.electronService.rpc(Channels.LOADSETTINGS, []).then(settings => this.updateSettings(settings, callback));
    }
  }

  listenSettings(callback: Function = () => {
  }) {
    if (this.settings === undefined) {
      this.electronService.listen(Channels.SETTINGSCHANGED, settings => this.updateSettings(settings, callback));
    }
  }

  saveSettings(tempSettings: SettingsModel = this.settings) {
    this.electronService.rpc(Channels.SAVESETTINGS, [tempSettings]).then(() => {
    });
    this.settings = tempSettings;
  }
}
