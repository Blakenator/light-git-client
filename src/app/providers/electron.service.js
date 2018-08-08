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
let ElectronService = class ElectronService {
    constructor() {
        this.isElectron = () => {
            return window && window.process && window.process.type;
        };
        this.rpc = (functionName, functionParams, callback) => {
            this.ipcRenderer.send(functionName, [functionName, ...functionParams]);
            this.ipcRenderer.on(functionName + 'reply', (event, args) => {
                // console.log(args);
                callback(args);
                this.ipcRenderer.removeAllListeners(functionName + 'reply');
            });
        };
        this.listen = (functionName, callback) => {
            this.ipcRenderer.on(functionName + 'reply', (event, args) => {
                // console.log(args);
                callback(args);
            });
        };
        // Conditional imports
        if (this.isElectron()) {
            this.ipcRenderer = window.require('electron').ipcRenderer;
            this.webFrame = window.require('electron').webFrame;
            this.remote = window.require('electron').remote;
            this.childProcess = window.require('child_process');
            this.fs = window.require('fs');
        }
    }
};
ElectronService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [])
], ElectronService);
export { ElectronService };
//# sourceMappingURL=electron.service.js.map