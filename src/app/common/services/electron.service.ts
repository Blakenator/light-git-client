import { Injectable } from '@angular/core';
import { ElectronResponse } from '../../../../shared/common/electron-response';

const electronApi = (window as any).electronApi;

@Injectable()
export class ElectronService {
  constructor() {}

  rpc(
    functionName: string,
    functionParams: any[] = [],
    cleanup: boolean = true,
  ): Promise<any> {
    let replyChannel = functionName + 'reply';
    return new Promise<any>((resolve, reject) => {
      electronApi.send(functionName, [functionName].concat(functionParams));
      electronApi.on(replyChannel, (event, args: ElectronResponse) => {
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
    electronApi.on(functionName + 'reply', (event, args: ElectronResponse) => {
      callback(args.content);
    });
  }

  // FIXME this is broken
  cleanupChannel(channelName: string) {
    electronApi.removeAllListeners(channelName + 'reply');
  }
}
