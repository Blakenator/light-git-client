import { Injectable } from '@angular/core';
import { ElectronResponse } from '../../../../shared/common/electron-response';

const electronApi = (window as any).electronApi;

@Injectable()
export class ElectronService {
  constructor() {}

  rpc(channelName: string, functionParams: any[] = []): Promise<any> {
    return electronApi
      .invoke(channelName, [channelName].concat(functionParams))
      .then((args) => {
        if (args.success) {
          return args.content;
        } else {
          throw args.content;
        }
      });
  }

  trigger(channelName: string, functionParams: any[] = []) {
    electronApi.send(channelName, [channelName].concat(functionParams));
  }

  listen(channelName: string, callback: (result: any) => any) {
    electronApi.on(channelName + 'reply', (event, args: ElectronResponse) => {
      callback(args.content);
    });
  }

  cleanupChannel(channelName: string) {
    electronApi.removeAllListeners(channelName + 'reply');
  }
}
