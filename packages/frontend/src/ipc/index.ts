/**
 * IPC Client Export - Swap Point for Future Migration
 * 
 * Current: Using electron IPC client
 * Future: Swap to @superflag/super-ipc-react
 * 
 * To migrate:
 * 1. Install @superflag/super-ipc-react
 * 2. Uncomment the super-ipc import below
 * 3. Comment out the electron client export
 * 4. All consumers will automatically use the new client
 */

// Current: Use electron IPC client
export { electronIpcClient as ipcClient } from './electronIpcClient';

// Hook for easy IPC access
export { useIpc } from './useIpc';

// Future: Swap to super-ipc
// import { createSuperIpcClient } from '@superflag/super-ipc-react';
// export const ipcClient = createSuperIpcClient({
//   // Configuration options here
// });

// Re-export types for consumers
export type { IpcClient, ElectronResponse } from './types';

// Git service hook (uses job scheduler for sequential operations)
export { useGitService } from './useGitService';
