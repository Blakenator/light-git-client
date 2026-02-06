/// <reference types="vite/client" />

interface ElectronApi {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, callback: (event: any, ...args: any[]) => void) => void;
  send: (channel: string, ...args: any[]) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronApi: ElectronApi;
    setTheme: (theme: string) => void;
  }
}

export {};
