import { useCallback, useMemo, useRef } from 'react';
import { SYNC_CHANNELS, type ActiveOperation } from '@light-git/shared';
import { invokeSync } from './invokeSync';
import { useJobScheduler, RepoArea, RepoAreaDefaults } from '../stores';

/**
 * Hook that provides git operations wrapped with the job scheduler.
 * All operations are queued per-repository to prevent parallel git operations.
 *
 * IMPORTANT: This hook returns a referentially stable object. All callbacks
 * are stable across renders (they read repoPath from a ref). This prevents
 * cascading re-renders in consuming components that list gitService in
 * their useCallback dependency arrays.
 */
export function useGitService(repoPath: string) {
  const { runJob } = useJobScheduler();

  // Keep repoPath in a ref so callbacks are stable across renders
  const repoPathRef = useRef(repoPath);
  repoPathRef.current = repoPath;

  // Stable helper to create a job config (reads repoPath from ref)
  const createJobConfig = useCallback(
    <T>(
      command: string,
      execute: () => Promise<T>,
      affectedAreas: RepoArea[] = [],
      options: {
        reorderable?: boolean;
        immediate?: boolean;
        async?: boolean;
      } = {},
    ) => ({
      command,
      repoPath: repoPathRef.current,
      execute,
      affectedAreas,
      ...options,
    }),
    [],
  );

  // --- Read operations ---

  const getFileChanges = useCallback(() => {
    const rp = repoPathRef.current;
    return runJob(
      createJobConfig(
        SYNC_CHANNELS.GetFileChanges,
        () => invokeSync(SYNC_CHANNELS.GetFileChanges, { repoPath: rp }),
        [],
        { reorderable: true },
      ),
    );
  }, [runJob, createJobConfig]);

  const getLocalBranches = useCallback(() => {
    const rp = repoPathRef.current;
    return runJob(
      createJobConfig(
        SYNC_CHANNELS.GetLocalBranches,
        () => invokeSync(SYNC_CHANNELS.GetLocalBranches, { repoPath: rp }),
        [],
        { reorderable: true },
      ),
    );
  }, [runJob, createJobConfig]);

  const getRemoteBranches = useCallback((limit?: number, filter?: string) => {
    const rp = repoPathRef.current;
    return runJob(
      createJobConfig(
        SYNC_CHANNELS.GetRemoteBranches,
        () => invokeSync(SYNC_CHANNELS.GetRemoteBranches, { repoPath: rp, limit, filter }),
        [],
        { reorderable: true },
      ),
    );
  }, [runJob, createJobConfig]);

  const getStashes = useCallback(() => {
    const rp = repoPathRef.current;
    return runJob(
      createJobConfig(
        SYNC_CHANNELS.GetStashes,
        () => invokeSync(SYNC_CHANNELS.GetStashes, { repoPath: rp }),
        [],
        { reorderable: true },
      ),
    );
  }, [runJob, createJobConfig]);

  const getWorktrees = useCallback(() => {
    const rp = repoPathRef.current;
    return runJob(
      createJobConfig(
        SYNC_CHANNELS.GetWorktrees,
        () => invokeSync(SYNC_CHANNELS.GetWorktrees, { repoPath: rp }),
        [],
        { reorderable: true },
      ),
    );
  }, [runJob, createJobConfig]);

  const getSubmodules = useCallback(() => {
    const rp = repoPathRef.current;
    return runJob(
      createJobConfig(
        SYNC_CHANNELS.GetSubmodules,
        () => invokeSync(SYNC_CHANNELS.GetSubmodules, { repoPath: rp }),
        [],
        { reorderable: true },
      ),
    );
  }, [runJob, createJobConfig]);

  const getCommitHistory = useCallback(
    (count = 50, skip = 0, activeBranch?: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.GetCommitHistory,
          () =>
            invokeSync(SYNC_CHANNELS.GetCommitHistory, {
              repoPath: rp,
              count,
              skip,
              activeBranch,
            }),
          [],
          { reorderable: true },
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const getFileDiff = useCallback(
    (
      unstaged: string[],
      staged: string[],
      cursor?: string | null,
      maxLines?: number,
    ) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.GetFileDiff,
          () =>
            invokeSync(SYNC_CHANNELS.GetFileDiff, {
              repoPath: rp,
              unstaged,
              staged,
              cursor: cursor ?? null,
              maxLines,
            }),
          [],
          { reorderable: true },
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const getDiffStats = useCallback(
    (unstaged: string[], staged: string[]) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.GetDiffStats,
          () =>
            invokeSync(SYNC_CHANNELS.GetDiffStats, {
              repoPath: rp,
              unstaged,
              staged,
            }),
          [],
          { reorderable: true },
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const checkCodeWatchers = useCallback(
    (stagedFiles: string[]) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.CheckCodeWatchers,
          () =>
            invokeSync(SYNC_CHANNELS.CheckCodeWatchers, {
              repoPath: rp,
              stagedFiles,
            }),
          [],
          { reorderable: true },
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const getStashDiff = useCallback(
    (index: number) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.StashDiff,
          () => invokeSync(SYNC_CHANNELS.StashDiff, { repoPath: rp, index }),
          [],
          { reorderable: true },
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const getCommitDiff = useCallback(
    (hash: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.CommitDiff,
          () => invokeSync(SYNC_CHANNELS.CommitDiff, { repoPath: rp, hash }),
          [],
          { reorderable: true },
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const getCommandHistory = useCallback(() => {
    const rp = repoPathRef.current;
    return invokeSync(SYNC_CHANNELS.GetCommandHistory, { repoPath: rp });
  }, []);

  // --- Write operations ---

  const stage = useCallback(
    (files: string[]) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.GitStage,
          () => invokeSync(SYNC_CHANNELS.GitStage, { repoPath: rp, files }),
          [RepoArea.LOCAL_CHANGES],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const unstage = useCallback(
    (files: string[]) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.GitUnstage,
          () => invokeSync(SYNC_CHANNELS.GitUnstage, { repoPath: rp, files }),
          [RepoArea.LOCAL_CHANGES],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const commit = useCallback(
    (message: string, amend: boolean, push: boolean, branch?: any) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.Commit,
          () =>
            invokeSync(SYNC_CHANNELS.Commit, {
              repoPath: rp,
              message,
              push,
              branch,
              amend,
            }),
          [...RepoAreaDefaults.LOCAL],
          { immediate: true },
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const checkout = useCallback(
    (branch: string, toNewBranch: boolean, andPull: boolean = false) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.Checkout,
          () =>
            invokeSync(SYNC_CHANNELS.Checkout, {
              repoPath: rp,
              branch,
              toNewBranch,
              andPull,
            }),
          [...RepoAreaDefaults.ALL],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const push = useCallback(
    (branch?: any, force = false) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.Push,
          () => invokeSync(SYNC_CHANNELS.Push, { repoPath: rp, branch, force }),
          [RepoArea.LOCAL_BRANCHES, RepoArea.REMOTE_BRANCHES, RepoArea.COMMIT_HISTORY],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const pull = useCallback(
    (force = false) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.Pull,
          () => invokeSync(SYNC_CHANNELS.Pull, { repoPath: rp, force }),
          [...RepoAreaDefaults.ALL],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const fetch = useCallback(
    (prune = false) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.Fetch,
          () => invokeSync(SYNC_CHANNELS.Fetch, { repoPath: rp, prune }),
          [RepoArea.REMOTE_BRANCHES],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const mergeBranch = useCallback(
    (branch: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.MergeBranch,
          () => invokeSync(SYNC_CHANNELS.MergeBranch, { repoPath: rp, branch }),
          [...RepoAreaDefaults.ALL],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const rebaseBranch = useCallback(
    (branch: string, interactive = false) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.RebaseBranch,
          () =>
            invokeSync(SYNC_CHANNELS.RebaseBranch, {
              repoPath: rp,
              branch,
              interactive,
            }),
          [...RepoAreaDefaults.ALL],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const createBranch = useCallback(
    (branchName: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.CreateBranch,
          () => invokeSync(SYNC_CHANNELS.CreateBranch, { repoPath: rp, branchName }),
          [RepoArea.LOCAL_BRANCHES],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const deleteBranch = useCallback(
    (branches: any[]) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.DeleteBranch,
          () => invokeSync(SYNC_CHANNELS.DeleteBranch, { repoPath: rp, branches }),
          [RepoArea.LOCAL_BRANCHES, RepoArea.REMOTE_BRANCHES],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const renameBranch = useCallback(
    (oldName: string, newName: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.RenameBranch,
          () =>
            invokeSync(SYNC_CHANNELS.RenameBranch, {
              repoPath: rp,
              oldName,
              newName,
            }),
          [RepoArea.LOCAL_BRANCHES],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const fastForward = useCallback(
    (branch: any) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.FastForwardBranch,
          () => invokeSync(SYNC_CHANNELS.FastForwardBranch, { repoPath: rp, branch }),
          [RepoArea.LOCAL_BRANCHES],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const hardReset = useCallback(() => {
    const rp = repoPathRef.current;
    return runJob(
      createJobConfig(
        SYNC_CHANNELS.HardReset,
        () => invokeSync(SYNC_CHANNELS.HardReset, { repoPath: rp }),
        [...RepoAreaDefaults.LOCAL],
      ),
    );
  }, [runJob, createJobConfig]);

  const undoFileChanges = useCallback(
    (files: string[], revision?: string, staged = false) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.UndoFileChanges,
          () =>
            invokeSync(SYNC_CHANNELS.UndoFileChanges, {
              repoPath: rp,
              files,
              revision,
              staged,
            }),
          [RepoArea.LOCAL_CHANGES],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const stash = useCallback(
    (unstagedOnly: boolean, stashName: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.Stash,
          () =>
            invokeSync(SYNC_CHANNELS.Stash, {
              repoPath: rp,
              unstagedOnly,
              stashName,
            }),
          [RepoArea.LOCAL_CHANGES, RepoArea.STASHES],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const applyStash = useCallback(
    (index: number) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.ApplyStash,
          () => invokeSync(SYNC_CHANNELS.ApplyStash, { repoPath: rp, index }),
          [RepoArea.LOCAL_CHANGES, RepoArea.STASHES],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const deleteStash = useCallback(
    (index: number) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.DeleteStash,
          () => invokeSync(SYNC_CHANNELS.DeleteStash, { repoPath: rp, index }),
          [RepoArea.STASHES],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const getDeletedStashes = useCallback(() => {
    const rp = repoPathRef.current;
    return runJob(
      createJobConfig(
        SYNC_CHANNELS.GetDeletedStashes,
        () => invokeSync(SYNC_CHANNELS.GetDeletedStashes, { repoPath: rp }),
        [],
        { reorderable: true },
      ),
    );
  }, [runJob, createJobConfig]);

  const restoreDeletedStash = useCallback(
    (stashHash: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.RestoreDeletedStash,
          () =>
            invokeSync(SYNC_CHANNELS.RestoreDeletedStash, {
              repoPath: rp,
              stashHash,
            }),
          [RepoArea.LOCAL_BRANCHES],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const cherryPick = useCallback(
    (hash: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.CherryPickCommit,
          () => invokeSync(SYNC_CHANNELS.CherryPickCommit, { repoPath: rp, hash }),
          [...RepoAreaDefaults.LOCAL],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const revert = useCallback(
    (hash: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.RevertCommit,
          () => invokeSync(SYNC_CHANNELS.RevertCommit, { repoPath: rp, hash }),
          [...RepoAreaDefaults.LOCAL],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const reset = useCallback(
    (hash: string, mode: 'soft' | 'mixed' | 'hard' = 'mixed') => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.ResetToCommit,
          () =>
            invokeSync(SYNC_CHANNELS.ResetToCommit, {
              repoPath: rp,
              hash,
              mode,
            }),
          [...RepoAreaDefaults.LOCAL],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const resolveConflict = useCallback(
    (file: string, useTheirs: boolean) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.ResolveConflictUsing,
          () =>
            invokeSync(SYNC_CHANNELS.ResolveConflictUsing, {
              repoPath: rp,
              file,
              useTheirs,
            }),
          [RepoArea.LOCAL_CHANGES],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const changeActiveOperation = useCallback(
    (op: ActiveOperation, abort: boolean) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.ChangeActiveOperation,
          () =>
            invokeSync(SYNC_CHANNELS.ChangeActiveOperation, {
              repoPath: rp,
              op,
              abort,
            }),
          [...RepoAreaDefaults.LOCAL],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const deleteWorktree = useCallback(
    (worktreePath: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.DeleteWorktree,
          () =>
            invokeSync(SYNC_CHANNELS.DeleteWorktree, {
              repoPath: rp,
              worktreePath,
            }),
          [RepoArea.WORKTREES],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const updateSubmodules = useCallback(
    (recursive: boolean, subPath?: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.UpdateSubmodules,
          () =>
            invokeSync(SYNC_CHANNELS.UpdateSubmodules, {
              repoPath: rp,
              recursive,
              path: subPath,
            }),
          [RepoArea.SUBMODULES],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const addSubmodule = useCallback(
    (url: string, subPath: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.AddSubmodule,
          () =>
            invokeSync(SYNC_CHANNELS.AddSubmodule, {
              repoPath: rp,
              url,
              path: subPath,
            }),
          [RepoArea.SUBMODULES],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const deleteFiles = useCallback(
    (paths: string[]) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.DeleteFiles,
          () => invokeSync(SYNC_CHANNELS.DeleteFiles, { repoPath: rp, files: paths }),
          [RepoArea.LOCAL_CHANGES],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const merge = useCallback(
    (file: string, mergetool?: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.Merge,
          () => invokeSync(SYNC_CHANNELS.Merge, { repoPath: rp, file, mergetool }),
          [RepoArea.LOCAL_CHANGES],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const getBranchPremerge = useCallback(
    (branchHash: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.GetBranchPremerge,
          () =>
            invokeSync(SYNC_CHANNELS.GetBranchPremerge, {
              repoPath: rp,
              branchHash,
            }),
          [],
          { reorderable: true },
        ),
      );
    },
    [runJob, createJobConfig],
  );

  const changeHunk = useCallback(
    (filename: string, hunk: any, changedText: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          SYNC_CHANNELS.ChangeHunk,
          () =>
            invokeSync(SYNC_CHANNELS.ChangeHunk, {
              repoPath: rp,
              filename,
              hunk,
              changedText,
            }),
          [RepoArea.LOCAL_CHANGES],
        ),
      );
    },
    [runJob, createJobConfig],
  );

  // UI operations (not queued)
  const openTerminal = useCallback(() => {
    return invokeSync(SYNC_CHANNELS.OpenTerminal, { repoPath: repoPathRef.current });
  }, []);

  const openFolder = useCallback(
    (folderPath?: string) => {
      return invokeSync(SYNC_CHANNELS.OpenFolder, {
        repoPath: repoPathRef.current,
        path: folderPath || '',
      });
    },
    [],
  );

  // Composite operations
  const refreshAll = useCallback(async () => {
    const [
      changes,
      localBranchesResult,
      remoteBranchesResult,
      stashesResult,
      worktreesResult,
      submodulesResult,
      commitHistoryResult,
    ] = await Promise.all([
      getFileChanges(),
      getLocalBranches(),
      getRemoteBranches(200),
      getStashes(),
      getWorktrees(),
      getSubmodules(),
      getCommitHistory(),
    ]);

    return {
      changes,
      localBranches: localBranchesResult,
      remoteBranches: remoteBranchesResult,
      stashes: stashesResult,
      worktrees: worktreesResult,
      submodules: submodulesResult,
      commitHistory: commitHistoryResult,
    };
  }, [
    getFileChanges,
    getLocalBranches,
    getRemoteBranches,
    getStashes,
    getWorktrees,
    getSubmodules,
    getCommitHistory,
  ]);

  // Return a stable object - all callbacks have stable deps, so useMemo never recomputes
  return useMemo(
    () => ({
      // Read operations
      getFileChanges,
      getLocalBranches,
      getRemoteBranches,
      getStashes,
      getWorktrees,
      getSubmodules,
      getCommitHistory,
      getFileDiff,
      getDiffStats,
      checkCodeWatchers,
      getStashDiff,
      getCommitDiff,
      getCommandHistory,
      getDeletedStashes,

      // Write operations
      stage,
      unstage,
      commit,
      checkout,
      push,
      pull,
      fetch,
      mergeBranch,
      rebaseBranch,
      createBranch,
      deleteBranch,
      renameBranch,
      fastForward,
      hardReset,
      undoFileChanges,
      stash,
      applyStash,
      deleteStash,
      restoreDeletedStash,
      cherryPick,
      revert,
      reset,
      resolveConflict,
      changeActiveOperation,
      deleteWorktree,
      updateSubmodules,
      addSubmodule,
      deleteFiles,
      merge,
      getBranchPremerge,
      changeHunk,

      // UI operations (not queued)
      openTerminal,
      openFolder,

      // Composite operations
      refreshAll,
    }),
    [
      getFileChanges,
      getLocalBranches,
      getRemoteBranches,
      getStashes,
      getWorktrees,
      getSubmodules,
      getCommitHistory,
      getFileDiff,
      getDiffStats,
      checkCodeWatchers,
      getStashDiff,
      getCommitDiff,
      getCommandHistory,
      getDeletedStashes,
      stage,
      unstage,
      commit,
      checkout,
      push,
      pull,
      fetch,
      mergeBranch,
      rebaseBranch,
      createBranch,
      deleteBranch,
      renameBranch,
      fastForward,
      hardReset,
      undoFileChanges,
      stash,
      applyStash,
      deleteStash,
      restoreDeletedStash,
      cherryPick,
      revert,
      reset,
      resolveConflict,
      changeActiveOperation,
      deleteWorktree,
      updateSubmodules,
      addSubmodule,
      deleteFiles,
      merge,
      getBranchPremerge,
      changeHunk,
      openTerminal,
      openFolder,
      refreshAll,
    ],
  );
}
