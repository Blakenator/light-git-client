var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@angular/core';
import { ElectronService } from './electron.service';
import { SettingsModel } from '../../../shared/SettingsModel';
let SettingsService = class SettingsService {
    constructor(electronService) {
        this.electronService = electronService;
    }
    updateSettings(settings, callback = () => { }) {
        this.settings = Object.assign(new SettingsModel(), settings);
        callback();
    }
    loadSettings(callback = () => {
    }) {
        if (this.settings === undefined) {
            this.electronService.rpc('loadSettings', [], settings => this.updateSettings(settings, callback));
        }
    }
    listenSettings(callback = () => {
    }) {
        if (this.settings === undefined) {
            this.electronService.listen('settingsChanged', settings => this.updateSettings(settings, callback));
        }
    }
    saveSettings(tempSettings = this.settings) {
        this.electronService.rpc('saveSettings', [tempSettings], () => {
        });
        this.settings = tempSettings;
    }
};
SettingsService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ElectronService])
], SettingsService);
export { SettingsService };
//# sourceMappingURL=settings.service.js.map