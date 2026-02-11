import { useCallback, useEffect, useRef } from 'react';
import {
  useRepositoryStore,
  useJobStore,
  RepoArea,
  useUiStore,
} from '../../../stores';
import { useRepoViewStore } from '../../../stores/repoViewStore';
import { useGitService } from '../../../ipc';
import type { DiffStatsResult } from '@light-git/shared';

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

      // Fetch diff stats for the initial file lists
      if (data.changes) {
        const allStaged = (data.changes.stagedChanges || [])
          .map((c: any) => (c.path || c.file || '').replace(/.*?->\s*/, ''))
          .filter(Boolean);
        const allUnstaged = (data.changes.unstagedChanges || [])
          .map((c: any) => (c.path || c.file || '').replace(/.*?->\s*/, ''))
          .filter(Boolean);
        if (allStaged.length > 0 || allUnstaged.length > 0) {
          gitService
            .getDiffStats(allUnstaged, allStaged)
            .then((stats: DiffStatsResult) => {
              useRepoViewStore.getState().setDiffStats(repoPath, stats);
            })
            .catch(() => {
              // Non-critical
            });
        } else {
          useRepoViewStore.getState().setDiffStats(repoPath, null);
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

  // Refresh repo state when the window regains focus
  useEffect(() => {
    const handleFocus = () => {
      refreshRepo();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshRepo]);

  // Auto-refresh affected areas when the job queue finishes
  useEffect(() => {
    const unsubscribe = onFinishQueue(({ affectedAreas, path }) => {
      if (affectedAreas.size === 0 || path !== repoPath) return;

      const activeBranch = useRepoViewStore
        .getState()
        .getActiveBranch(repoPath);
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
            .getRemoteBranches()
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
              if (result === undefined) return null;
              // Also refresh diff stats for the updated file lists
              const allStaged = (result.stagedChanges || [])
                .map((c: any) => (c.path || c.file || '').replace(/.*?->\s*/, ''))
                .filter(Boolean);
              const allUnstaged = (result.unstagedChanges || [])
                .map((c: any) => (c.path || c.file || '').replace(/.*?->\s*/, ''))
                .filter(Boolean);
              if (allStaged.length > 0 || allUnstaged.length > 0) {
                gitService
                  .getDiffStats(allUnstaged, allStaged)
                  .then((stats: DiffStatsResult) => {
                    useRepoViewStore.getState().setDiffStats(repoPath, stats);
                  })
                  .catch(() => {
                    // Non-critical: stats are a nice-to-have
                  });
              } else {
                useRepoViewStore.getState().setDiffStats(repoPath, null);
              }
              return { changes: result };
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
            .getCommitHistory(50, 0, activeBranch?.name)
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
