import type { BackendResult } from '@superflag/super-ipc-core';
import { AppError } from '@superflag/super-ipc-core';
import type { SYNC_CHANNELS, AppSyncApi } from '@light-git/shared';

/**
 * Gets the Electron API from the global window object.
 * Throws if the preload script hasn't been properly configured.
 */
function getElectronApi() {
  if (!window.electronApi) {
    throw new Error(
      'electronApi not found. Ensure the preload script is correctly configured.',
    );
  }
  return window.electronApi;
}

/**
 * Imperative typed IPC call for use outside React hooks (stores, job scheduler, etc.)
 *
 * Calls the backend handler for the given channel with typed props,
 * handles BackendResult unwrapping and error deserialization.
 *
 * @param channel - The sync channel to invoke
 * @param props - Typed props for the channel (omit for void props)
 * @returns The typed result from the backend handler
 * @throws AppError if the backend handler returned an error
 */
export async function invokeSync<C extends SYNC_CHANNELS>(
  channel: C,
  ...rest: AppSyncApi[C]['props'] extends void ? [] : [AppSyncApi[C]['props']]
): Promise<AppSyncApi[C]['result']> {
  const props = rest[0];
  const electronApi = getElectronApi();
  const raw = await electronApi.invoke(channel, props);
  const response = raw as BackendResult;

  if (response.error) {
    throw AppError.fromJSON(response.error);
  }

  const result = response.content ? JSON.parse(response.content) : undefined;
  return result;
}
