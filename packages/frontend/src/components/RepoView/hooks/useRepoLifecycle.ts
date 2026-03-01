import { useCallback, useEffect, useRef } from 'react';
import {
  useRepositoryStore,
  useJobStore,
  RepoArea,
  useUiStore,
} from '../../../stores';
import { useRepoViewStore } from '../../../stores/repoViewStore';
import { useGitService } from '../../../ipc';
import { useBackendListener } from '../../../ipc/useBackendListener';
import { SYNC_CHANNELS } from '@light-git/shared';
import type { DiffStatsResult, WatcherAlert } from '@light-git/shared';

/**
 * Manages repo lifecycle: initial loading, auto-refresh on focus, and
 * job queue auto-refresh for affected areas.
 */
export function useRepoLifecycle(
  repoPath: string,
  onLoadRepoFailed?: (error: any) => void,
) {
  const gitService = useGitService(repoPath);
  const updateRepoCache = useRepositoryStore((state) => state.updateRepoCache);
  const addAlert = useUiStore((state) => state.addAlert);
  const onFinishQueue = useJobStore((state) => state.onFinishQueue);

  // Refs to avoid stale closures
  const onLoadRepoFailedRef = useRef(onLoadRepoFailed);
  onLoadRepoFailedRef.current = onLoadRepoFailed;

  // Pagination guard ref (shared with commit history)
  const noMoreCommits = useRef(false);

  const refreshRepo = useCallback(async () => {
    noMoreCommits.current = false;
    try {
      const data = await gitService.refreshAll();

      // Filter out undefined values - these can occur when overlapping refreshes
      // cause the job scheduler to supersede (deduplicate) pending read jobs.
      const update: Record<string, any> = {};
      if (data.changes !== undefined) update.changes = data.changes;
      if (data.localBranches !== undefined)
        update.localBranches = data.localBranches;
      if (data.remoteBranches !== undefined)
        update.remoteBranches = data.remoteBranches;
      if (data.stashes !== undefined) update.stashes = data.stashes;
      if (data.worktrees !== undefined) update.worktrees = data.worktrees;
      if (data.submodules !== undefined) update.submodules = data.submodules;
      if (data.commitHistory !== undefined)
        update.commitHistory = data.commitHistory;

      if (Object.keys(update).length > 0) {
        updateRepoCache(repoPath, update);
      }

      // Fetch diff stats and code watcher alerts for the file lists.
      // Use data.changes if available, otherwise fall back to the repo cache
      // (data.changes may be undefined when the job was superseded by deduplication).
      const changes = data.changes
        ?? useRepositoryStore.getState().repoCache[repoPath]?.changes;
      if (changes) {
        const allStaged = (changes.stagedChanges || [])
          .map((c: any) => (c.path || c.file || '').replace(/.*?->\s*/, ''))
          .filter(Boolean);
        const allUnstaged = (changes.unstagedChanges || [])
          .map((c: any) => (c.path || c.file || '').replace(/.*?->\s*/, ''))
          .filter(Boolean);
        if (allStaged.length > 0 || allUnstaged.length > 0) {
          gitService
            .getDiffStats(allUnstaged, allStaged)
            .then((stats: DiffStatsResult) => {
              useRepoViewStore.getState().setDiffStats(repoPath, stats);
            })
            .catch(() => {});
        } else {
          useRepoViewStore.getState().setDiffStats(repoPath, null);
        }

        if (allStaged.length > 0) {
          gitService
            .checkCodeWatchers(allStaged)
            .then((alerts: WatcherAlert[]) => {
              useRepoViewStore.getState().setWatcherAlerts(
                repoPath,
                Array.isArray(alerts) ? alerts : [],
              );
            })
            .catch((err) => {
              console.error('Code watcher check failed:', err);
            });
        } else {
          useRepoViewStore.getState().setWatcherAlerts(repoPath, []);
        }
      }
    } catch (error) {
      console.error('Failed to refresh repo:', error);
      addAlert('Failed to refresh repository', 'error');
      onLoadRepoFailedRef.current?.(error);
    }
  }, [gitService, repoPath, updateRepoCache, addAlert]);

  // Load repo data on mount or when repoPath changes
  const lastRefreshedPath = useRef<string | null>(null);

  useEffect(() => {
    if (repoPath && repoPath !== lastRefreshedPath.current) {
      lastRefreshedPath.current = repoPath;
      refreshRepo();
      // Also load command history on initial load
      const setCommandHistory = useRepoViewStore.getState().setCommandHistory;
      gitService
        .getCommandHistory()
        .then((history) => {
          setCommandHistory(repoPath, history || []);
        })
        .catch(console.error);
    }
  }, [repoPath, refreshRepo, gitService]);

  // Refresh repo state when the window regains focus.
  // Uses BrowserWindow 'focus' from the main process (pushed via IPC) which
  // is reliable across all platforms — the renderer-side window 'focus' event
  // does not fire consistently on macOS alt-tab.
  // Throttle: multiple listeners and rapid macOS focus events are collapsed
  // into a single refreshRepo per repoPath via a Zustand timestamp check.
  useBackendListener(SYNC_CHANNELS.WindowFocused, () => {
    if (!useUiStore.getState().shouldRefreshOnFocus(repoPath)) return;
    refreshRepo();
  });

  // Auto-refresh affected areas when the job queue finishes
  useEffect(() => {
    const unsubscribe = onFinishQueue(({ affectedAreas, path }) => {
      if (path !== repoPath) return;

      // Refresh command history after any queued operation (regardless of affectedAreas)
      gitService
        .getCommandHistory()
        .then((history: any) => {
          const sorted = (history || []).sort((a: any, b: any) => {
            const dateA = new Date(a.executedAt ?? a.timestamp).getTime() || 0;
            const dateB = new Date(b.executedAt ?? b.timestamp).getTime() || 0;
            return dateB - dateA;
          });
          useRepoViewStore.getState().setCommandHistory(repoPath, sorted);
        })
        .catch(() => {});

      if (affectedAreas.size === 0) return;

      const activeBranches = useRepoViewStore
        .getState()
        .getActiveBranches(repoPath);
      const promises: Promise<any>[] = [];

      if (affectedAreas.has(RepoArea.LOCAL_BRANCHES)) {
        promises.push(
          gitService
            .getLocalBranches()
            .then((result: any) =>
              result !== undefined ? { localBranches: result } : null,
            )
            .catch((err: any) => {
              console.error('Failed to refresh local branches:', err);
              return null;
            }),
        );
      }
      if (affectedAreas.has(RepoArea.REMOTE_BRANCHES)) {
        promises.push(
          gitService
            .getRemoteBranches(200)
            .then((result: any) =>
              result !== undefined ? { remoteBranches: result } : null,
            )
            .catch((err: any) => {
              console.error('Failed to refresh remote branches:', err);
              return null;
            }),
        );
      }
      if (affectedAreas.has(RepoArea.LOCAL_CHANGES)) {
        promises.push(
          gitService
            .getFileChanges()
            .then((result: any) => {
              // result may be undefined when the job was superseded.
              // Fall back to repo cache for diff stats & watcher analysis.
              const changes = result
                ?? useRepositoryStore.getState().repoCache[repoPath]?.changes;
              if (changes) {
                const allStaged = (changes.stagedChanges || [])
                  .map((c: any) => (c.path || c.file || '').replace(/.*?->\s*/, ''))
                  .filter(Boolean);
                const allUnstaged = (changes.unstagedChanges || [])
                  .map((c: any) => (c.path || c.file || '').replace(/.*?->\s*/, ''))
                  .filter(Boolean);
                if (allStaged.length > 0 || allUnstaged.length > 0) {
                  gitService
                    .getDiffStats(allUnstaged, allStaged)
                    .then((stats: DiffStatsResult) => {
                      useRepoViewStore.getState().setDiffStats(repoPath, stats);
                    })
                    .catch(() => {});
                } else {
                  useRepoViewStore.getState().setDiffStats(repoPath, null);
                }

                if (allStaged.length > 0) {
                  gitService
                    .checkCodeWatchers(allStaged)
                    .then((alerts: WatcherAlert[]) => {
                      useRepoViewStore.getState().setWatcherAlerts(
                        repoPath,
                        Array.isArray(alerts) ? alerts : [],
                      );
                    })
                    .catch((err) => {
                      console.error('Code watcher check failed:', err);
                    });
                } else {
                  useRepoViewStore.getState().setWatcherAlerts(repoPath, []);
                }
              }
              return result !== undefined ? { changes: result } : null;
            })
            .catch((err: any) => {
              console.error('Failed to refresh file changes:', err);
              return null;
            }),
        );
      }
      if (affectedAreas.has(RepoArea.COMMIT_HISTORY)) {
        noMoreCommits.current = false;
        promises.push(
          gitService
            .getCommitHistory(50, 0, activeBranches.length > 0 ? activeBranches.map((b: any) => b.name) : undefined)
            .then((result: any) =>
              result !== undefined ? { commitHistory: result } : null,
            )
            .catch((err: any) => {
              console.error('Failed to refresh commit history:', err);
              return null;
            }),
        );
      }
      if (affectedAreas.has(RepoArea.STASHES)) {
        promises.push(
          gitService
            .getStashes()
            .then((result: any) =>
              result !== undefined ? { stashes: result } : null,
            )
            .catch((err: any) => {
              console.error('Failed to refresh stashes:', err);
              return null;
            }),
        );
      }
      if (affectedAreas.has(RepoArea.WORKTREES)) {
        promises.push(
          gitService
            .getWorktrees()
            .then((result: any) =>
              result !== undefined ? { worktrees: result } : null,
            )
            .catch((err: any) => {
              console.error('Failed to refresh worktrees:', err);
              return null;
            }),
        );
      }
      if (affectedAreas.has(RepoArea.SUBMODULES)) {
        promises.push(
          gitService
            .getSubmodules()
            .then((result: any) =>
              result !== undefined ? { submodules: result } : null,
            )
            .catch((err: any) => {
              console.error('Failed to refresh submodules:', err);
              return null;
            }),
        );
      }

      if (promises.length > 0) {
        Promise.all(promises).then((results) => {
          const update: Record<string, any> = {};
          results.forEach((r) => {
            if (r) Object.assign(update, r);
          });
          if (Object.keys(update).length > 0) {
            updateRepoCache(repoPath, update);
          }
        });
      }
    });

    return unsubscribe;
  }, [onFinishQueue, repoPath, gitService, updateRepoCache]);

  return { refreshRepo, noMoreCommits };
}
