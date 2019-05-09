import {Injectable} from '@angular/core';
import {ipcRenderer} from 'electron';
import {ElectronResponse} from '../../../../shared/common/electron-response';

@Injectable()
export class ElectronService {
  ipcRenderer: typeof ipcRenderer;

  constructor() {
    // Conditional imports
    if (this.isElectron()) {
      this.ipcRenderer = window.require('electron').ipcRenderer;
    }
  }

  isElectron = () => {
    return window && window.process && window.process.type;
  };

  rpc(functionName: string, functionParams: any[] = [], cleanup: boolean = true): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      this.ipcRenderer.send(functionName, [functionName].concat(functionParams));
      this.ipcRenderer.on(functionName + 'reply', (event, args: ElectronResponse) => {
        if (args.success) {
          resolve(args.content);
        } else {
          reject(args.content);
        }
        if (cleanup) {
          this.cleanupChannel(functionName);
        }
      });
    });
  }

  listen(functionName: string, callback: (result: any) => any) {
    this.ipcRenderer.on(functionName + 'reply', (event, args: ElectronResponse) => {
      callback(args.content);
    });
  }

  cleanupChannel(channelName: string) {
    this.ipcRenderer.removeAllListeners(channelName + 'reply');
  }
}
