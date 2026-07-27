/// <reference types="vite/client" />

/**
 * Raw bridge exposed by the preload script via registerElectronApiBridge.
 * Type safety is provided by invokeSync, useBackend, useBackendAsync, etc.
 */
interface ElectronApiBridge {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  on(channel: string, callback: (...args: unknown[]) => void): number;
  removeListener(id: number): void;
}

declare global {
  interface Window {
    electronApi: ElectronApiBridge;
    setTheme: (theme: string) => void;
  }
}

export {};
