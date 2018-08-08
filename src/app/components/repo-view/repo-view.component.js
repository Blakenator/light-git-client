var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Component } from '@angular/core';
import { ElectronService } from "../../providers/electron.service";
import { SettingsService } from "../../providers/settings.service";
import { RepositoryModel } from "../../../../shared/Repository.model";
let RepoViewComponent = class RepoViewComponent {
    constructor(electronService, settingsService) {
        this.electronService = electronService;
        this.settingsService = settingsService;
    }
    ngOnInit() {
        this.electronService.rpc("loadRepo", [], repo => {
            this.repo = new RepositoryModel().copy(repo);
        });
    }
};
RepoViewComponent = __decorate([
    Component({
        selector: 'app-repo-view',
        templateUrl: './repo-view.component.html',
        styleUrls: ['./repo-view.component.scss']
    }),
    __metadata("design:paramtypes", [ElectronService,
        SettingsService])
], RepoViewComponent);
export { RepoViewComponent };
//# sourceMappingURL=repo-view.component.js.map