/**
 * IPC Client - powered by @superflag/super-ipc
 *
 * Provides typed React hooks and an imperative utility for IPC communication.
 */

import {
  createUseBackendSyncHook,
  createUseBackendMutationSyncHook,
  createUseBackendAsyncHook,
} from '@superflag/super-ipc-react';
import type {
  SYNC_CHANNELS,
  ASYNC_CHANNELS,
  AppSyncApi,
  AppAsyncApi,
} from '@light-git/shared';

// --- React Hooks (declarative data fetching) ---

/** Hook for sync IPC calls that execute on mount */
export const useBackend = createUseBackendSyncHook<SYNC_CHANNELS, AppSyncApi>();

/** Hook for sync IPC mutations (execute on demand, not on mount) */
export const useBackendMutation = createUseBackendMutationSyncHook<SYNC_CHANNELS, AppSyncApi>();

/** Hook for async IPC calls with init/progress/complete tracking */
export const useBackendAsync = createUseBackendAsyncHook<ASYNC_CHANNELS, AppAsyncApi>();

// --- Imperative IPC (for stores, non-hook code, job scheduler) ---

export { invokeSync } from './invokeSync';

// --- Push-only channel listener ---

export { useBackendListener } from './useBackendListener';

// --- Re-exports ---

export type { AppSyncApi, AppAsyncApi } from '@light-git/shared';
export { SYNC_CHANNELS, ASYNC_CHANNELS } from '@light-git/shared';

// Git service hook (uses job scheduler for sequential operations)
export { useGitService } from './useGitService';
