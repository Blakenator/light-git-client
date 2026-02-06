import { IpcClient, ElectronResponse } from './types';

/**
 * Electron IPC client implementation using window.electronApi
 * exposed via preload.js contextBridge.
 */
export const electronIpcClient: IpcClient = {
  async rpc<T>(channel: string, ...args: any[]): Promise<T> {
    if (!window.electronApi) {
      throw new Error('electronApi not available - not running in Electron');
    }

    const response: ElectronResponse<T> = await window.electronApi.invoke(
      channel,
      channel,
      ...args
    );

    if (!response.success) {
      throw new Error(
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content)
      );
    }

    return response.content;
  },

  trigger(channel: string, ...args: any[]): void {
    if (!window.electronApi) {
      console.warn('electronApi not available - not running in Electron');
      return;
    }

    window.electronApi.send(channel, channel, ...args);
  },

  listen(channel: string, callback: (data: any) => void): () => void {
    if (!window.electronApi) {
      console.warn('electronApi not available - not running in Electron');
      return () => {};
    }

    const replyChannel = channel + 'reply';
    
    const handler = (_event: any, response: ElectronResponse) => {
      callback(response);
    };

    window.electronApi.on(replyChannel, handler);

    return () => {
      window.electronApi.removeAllListeners(replyChannel);
    };
  },

  cleanup(channel: string): void {
    if (!window.electronApi) {
      return;
    }

    window.electronApi.removeAllListeners(channel + 'reply');
  },
};
