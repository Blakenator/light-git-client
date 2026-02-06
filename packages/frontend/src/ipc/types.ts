/**
 * IPC Client interface for communication between renderer and main process.
 * Designed for easy swap to @superflag/super-ipc-react in the future.
 */
export interface IpcClient {
  /**
   * Make a request-response RPC call to the main process.
   * @param channel The IPC channel name
   * @param args Additional arguments to pass
   * @returns Promise resolving to the response content
   */
  rpc<T>(channel: string, ...args: any[]): Promise<T>;

  /**
   * Fire-and-forget trigger to the main process.
   * Used for streaming operations like clone, add worktree.
   * @param channel The IPC channel name
   * @param args Additional arguments to pass
   */
  trigger(channel: string, ...args: any[]): void;

  /**
   * Listen for replies/events from the main process.
   * @param channel The IPC channel name
   * @param callback Function to call when data is received
   * @returns Cleanup function to remove the listener
   */
  listen(channel: string, callback: (data: any) => void): () => void;

  /**
   * Clean up all listeners for a channel.
   * @param channel The IPC channel name
   */
  cleanup(channel: string): void;
}

/**
 * Standard response wrapper from Electron backend
 */
export interface ElectronResponse<T = any> {
  success: boolean;
  content: T;
}
