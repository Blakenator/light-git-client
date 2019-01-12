var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ApplicationRef, Component } from '@angular/core';
import { ElectronService } from '../../providers/electron.service';
import { HttpClient } from '@angular/common/http';
import { SettingsService } from '../../providers/settings.service';
let HomeComponent = class HomeComponent {
    constructor(electronService, settingsService, http, applicationRef) {
        this.electronService = electronService;
        this.settingsService = settingsService;
        this.http = http;
        this.applicationRef = applicationRef;
        this.isLoading = false;
    }
    ngOnInit() {
    }
};
HomeComponent = __decorate([
    Component({
        selector: 'app-home',
        templateUrl: './home.component.html',
        styleUrls: ['./home.component.scss']
    }),
    __metadata("design:paramtypes", [ElectronService,
        SettingsService,
        HttpClient,
        ApplicationRef])
], HomeComponent);
export { HomeComponent };
//# sourceMappingURL=home.component.js.map