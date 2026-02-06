import { useCallback, useEffect, useRef } from 'react';
import { electronIpcClient as ipcClient } from './electronIpcClient';
import type { IpcClient } from './types';

/**
 * React hook for IPC communication.
 * Uses the abstracted IpcClient which can be swapped for super-ipc.
 */
export function useIpc(): IpcClient {
  return ipcClient;
}

/**
 * Hook for making IPC RPC calls with automatic error handling.
 */
export function useIpcRpc() {
  const rpc = useCallback(async <T>(channel: string, ...args: any[]): Promise<T> => {
    return ipcClient.rpc<T>(channel, ...args);
  }, []);

  return rpc;
}

/**
 * Hook for listening to IPC events with automatic cleanup.
 */
export function useIpcListener(
  channel: string,
  callback: (data: any) => void,
  deps: React.DependencyList = []
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const cleanup = ipcClient.listen(channel, (data) => {
      callbackRef.current(data);
    });

    return cleanup;
  }, [channel, ...deps]);
}

/**
 * Hook for triggering IPC events (fire-and-forget).
 */
export function useIpcTrigger() {
  const trigger = useCallback((channel: string, ...args: any[]) => {
    ipcClient.trigger(channel, ...args);
  }, []);

  return trigger;
}
