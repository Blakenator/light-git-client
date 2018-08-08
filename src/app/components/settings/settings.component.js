var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Component, EventEmitter, Output } from '@angular/core';
import { ElectronService } from '../../providers/electron.service';
import { SettingsService } from '../../providers/settings.service';
import { SettingsModel } from '../../../../shared/SettingsModel';
let SettingsComponent = class SettingsComponent {
    constructor(electronService, settingsService) {
        this.electronService = electronService;
        this.settingsService = settingsService;
        this.showSettingsDialog = false;
        this.onSaveAction = new EventEmitter();
    }
    ngOnInit() {
        let callback = () => {
            this.tempSettings = this.settingsService.settings;
        };
        this.settingsService.loadSettings(callback);
        this.settingsService.listenSettings(callback);
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
};
__decorate([
    Output(),
    __metadata("design:type", Object)
], SettingsComponent.prototype, "onSaveAction", void 0);
SettingsComponent = __decorate([
    Component({
        selector: 'app-settings',
        templateUrl: './settings.component.html',
        styleUrls: ['./settings.component.scss']
    }),
    __metadata("design:paramtypes", [ElectronService,
        SettingsService])
], SettingsComponent);
export { SettingsComponent };
//# sourceMappingURL=settings.component.js.map