import { useEffect, useRef } from 'react';

/**
 * React hook for listening to push-only IPC channels from the backend.
 *
 * Use this for channels where the backend pushes data to the renderer
 * via `event.sender.send(channel, data)` — e.g. SettingsChanged,
 * CommandHistoryChanged.
 *
 * These channels should NOT be invoked directly; they exist only for
 * backend-initiated pushes.
 */
export function useBackendListener<T = unknown>(
  channel: string,
  callback: (data: T) => void,
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!window.electronApi?.on || !window.electronApi?.removeListener) {
      console.warn(`useBackendListener: electronApi.on not available for channel "${channel}"`);
      return;
    }

    const handler = (_event: unknown, data: T) => {
      callbackRef.current(data);
    };

    window.electronApi.on(channel, handler);
    return () => {
      window.electronApi.removeListener(channel, handler);
    };
  }, [channel]);
}
