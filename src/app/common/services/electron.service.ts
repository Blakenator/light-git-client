import {Injectable} from '@angular/core';
import {ElectronResponse} from '../../../../shared/common/electron-response';

const {ipcRenderer} = (window as any).require('electron');

@Injectable()
export class ElectronService {
  constructor() {
  }

  rpc(functionName: string, functionParams: any[] = [], cleanup: boolean = true): Promise<any> {
          let replyChannel = functionName+'reply';
    return new Promise<any>((resolve, reject) => {
      ipcRenderer.send(functionName, [functionName].concat(functionParams));
      ipcRenderer.on(replyChannel, (event, args: ElectronResponse) => {
        if (args.success) {
          resolve(args.content);
        } else {
          reject(args.content);
        }
        if (cleanup) {
          this.cleanupChannel(functionName);
          this.cleanupChannel(replyChannel);
        }
      });
    });
  }

  listen(functionName: string, callback: (result: any) => any) {
    ipcRenderer.on(functionName + 'reply', (event, args: ElectronResponse) => {
      callback(args.content);
    });
  }

  cleanupChannel(channelName: string) {
    ipcRenderer.removeAllListeners(channelName + 'reply');
  }
}
