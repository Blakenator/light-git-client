import {Injectable} from '@angular/core';
// If you import a module but never use any of the imported values other than as TypeScript types,
// the resulting javascript file will look as if you never imported the module at all.
import {ipcRenderer, remote, webFrame} from 'electron';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import {ElectronResponse} from '../../../../shared/common/electron-response';

@Injectable()
export class ElectronService {

  ipcRenderer: typeof ipcRenderer;
  webFrame: typeof webFrame;
  remote: typeof remote;
  childProcess: typeof childProcess;
  fs: typeof fs;
  isElectron = () => {
    return window && window.process && window.process.type;
  };

  constructor() {
    // Conditional imports
    if (this.isElectron()) {
      this.ipcRenderer = window.require('electron').ipcRenderer;
      this.webFrame = window.require('electron').webFrame;
      this.remote = window.require('electron').remote;

      this.childProcess = window.require('child_process');
      this.fs = window.require('fs');
    }
  }

  rpc(functionName: string, functionParams: any[], cleanup: boolean = true): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      this.ipcRenderer.send(functionName, [functionName, ...functionParams]);
      this.ipcRenderer.on(functionName + 'reply', (event, args: ElectronResponse) => {
        // console.log(args);
        if (args.success) {
          resolve(args.content);
        } else {
          reject(args.content);
        }
        if (cleanup) {
          this.ipcRenderer.removeAllListeners(functionName + 'reply');
        }
      });
    });
  }

  listen(functionName: string, callback: (result: any) => any) {
    this.ipcRenderer.on(functionName + 'reply', (event, args: ElectronResponse) => {
      // console.log(args);
      callback(args.content);
    });
  }

  cleanupChannel(channelName: string) {
    this.ipcRenderer.removeAllListeners(channelName + 'reply');
  }
}
