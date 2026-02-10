import { useCallback, useMemo } from 'react';
import { useRepositoryStore, useUiStore } from '../../../stores';
import { useGitService } from '../../../ipc';
import {
  detectRemoteMessage,
  detectSubmoduleCheckout,
  getIpcErrorMessage,
} from '../../../utils/warningDetectors';

/**
 * Hook providing title bar actions: push/pull current branch, refresh, discard, terminal, folder.
 */
export function useRepoTitleActions(
  repoPath: string,
  refreshRepo: () => Promise<void>,
) {
  const gitService = useGitService(repoPath);
  const addAlert = useUiStore((state) => state.addAlert);
  const showModal = useUiStore((state) => state.showModal);

  const repoCache = useRepositoryStore((state) => state.getCacheFor(repoPath));
  const localBranches = useMemo(() => repoCache?.localBranches || [], [repoCache?.localBranches]);
  const currentBranch = useMemo(
    () => localBranches.find((b: any) => b.isCurrentBranch) || null,
    [localBranches],
  );

  const handlePush = useCallback(async (branch: any, force: boolean) => {
    try {
      await gitService.push(branch, force);
      addAlert('Push successful', 'success');
    } catch (error: any) {
      const errorMsg = getIpcErrorMessage(error);
      const remoteMsg = detectRemoteMessage(errorMsg);
      if (remoteMsg) {
        addAlert(remoteMsg.message, 'info', 0);
      } else {
        addAlert(`Push failed: ${errorMsg}`, 'error');
      }
    }
  }, [gitService, addAlert]);

  const handlePull = useCallback(async (branch: any, force: boolean) => {
    try {
      await gitService.pull(force);
      addAlert('Pull successful', 'success');
    } catch (error: any) {
      if (detectSubmoduleCheckout(error.message || '')) {
        addAlert('Pull successful', 'success');
      } else {
        addAlert(`Pull failed: ${error.message}`, 'error');
      }
    }
  }, [gitService, addAlert]);

  const handlePushCurrent = useCallback(() => {
    if (currentBranch) handlePush(currentBranch, false);
  }, [currentBranch, handlePush]);

  const handlePullCurrent = useCallback(() => {
    if (currentBranch) handlePull(currentBranch, false);
  }, [currentBranch, handlePull]);

  const handleForcePushCurrent = useCallback(() => {
    if (currentBranch) handlePush(currentBranch, true);
  }, [currentBranch, handlePush]);

  const handleForcePullCurrent = useCallback(() => {
    if (currentBranch) handlePull(currentBranch, true);
  }, [currentBranch, handlePull]);

  const handleFullRefresh = useCallback(async () => {
    await refreshRepo();
    addAlert('Refreshed', 'info');
  }, [refreshRepo, addAlert]);

  const handleDiscardAll = useCallback(() => {
    showModal('discardAllModal');
  }, [showModal]);

  const handleHardReset = useCallback(async () => {
    try {
      await gitService.hardReset();
      addAlert('All changes discarded', 'info');
    } catch (error: any) {
      addAlert(`Hard reset failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleOpenTerminal = useCallback(async () => {
    try {
      await gitService.openTerminal();
    } catch (error: any) {
      addAlert(`Failed to open terminal: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleOpenFolder = useCallback(async (path?: string) => {
    try {
      await gitService.openFolder(path);
    } catch (error: any) {
      addAlert(`Failed to open folder: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  return {
    currentBranch,
    handlePushCurrent,
    handlePullCurrent,
    handleForcePushCurrent,
    handleForcePullCurrent,
    handleFullRefresh,
    handleDiscardAll,
    handleHardReset,
    handleOpenTerminal,
    handleOpenFolder,
  };
}
