import { useCallback } from 'react';
import { useUiStore } from '../../../stores';
import { useRepositoryStore } from '../../../stores';
import { useRepoViewStore } from '../../../stores/repoViewStore';
import { useGitService } from '../../../ipc';
import type { WatcherAlert } from '@light-git/shared';

export type { WatcherAlert };

const getRepoCache = (repoPath: string) => useRepositoryStore.getState().repoCache[repoPath];

/**
 * Hook providing code watcher analysis.
 * Reads alerts from the store (populated by useRepoLifecycle) and
 * provides a freshness check via the backend for commit-time verification.
 */
export function useCodeWatcherAnalysis(repoPath: string) {
  const gitService = useGitService(repoPath);
  const addAlert = useUiStore((state) => state.addAlert);
  const showModal = useUiStore((state) => state.showModal);

  const watcherAlerts = useRepoViewStore(
    (state) => state.watcherAlerts[repoPath] || [],
  );

  const checkWatcherAlerts = useCallback(async (): Promise<WatcherAlert[]> => {
    try {
      const stagedChanges = getRepoCache(repoPath)?.changes?.stagedChanges || [];
      if (stagedChanges.length === 0) {
        useRepoViewStore.getState().setWatcherAlerts(repoPath, []);
        return [];
      }

      const stagedFiles = stagedChanges.map((c: any) => c.file);
      const alerts = await gitService.checkCodeWatchers(stagedFiles);
      const result = Array.isArray(alerts) ? alerts : [];
      useRepoViewStore.getState().setWatcherAlerts(repoPath, result);
      return result;
    } catch (error: any) {
      console.error('Code watcher analysis failed:', error);
      useRepoViewStore.getState().setWatcherAlerts(repoPath, []);
      return [];
    }
  }, [gitService, repoPath]);

  const showWatcherAlerts = useCallback(async () => {
    const alerts = await checkWatcherAlerts();
    if (alerts.length > 0) {
      showModal('codeWatcher');
    } else {
      addAlert('No code watcher alerts found', 'info');
    }
  }, [checkWatcherAlerts, showModal, addAlert]);

  return {
    watcherAlerts,
    checkWatcherAlerts,
    showWatcherAlerts,
  };
}
