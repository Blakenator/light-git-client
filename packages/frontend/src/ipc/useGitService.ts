import { useCallback, useMemo, useRef } from 'react';
import { Channels } from '@light-git/shared';
import { useIpc } from './useIpc';
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
  const ipc = useIpc();
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

  // Read operations have affectedAreas: [] (matching Angular).
  // Only write operations declare affected areas, which the onFinishQueue
  // mechanism uses to determine which areas to auto-refresh.

  const getFileChanges = useCallback(() => {
    const rp = repoPathRef.current;
    return runJob(
      createJobConfig(
        Channels.GETFILECHANGES,
        () => ipc.rpc<any>(Channels.GETFILECHANGES, rp),
        [],
        { reorderable: true },
      ),
    );
  }, [ipc, runJob, createJobConfig]);

  const getLocalBranches = useCallback(() => {
    const rp = repoPathRef.current;
    return runJob(
      createJobConfig(
        Channels.GETLOCALBRANCHES,
        () => ipc.rpc<any[]>(Channels.GETLOCALBRANCHES, rp),
        [],
        { reorderable: true },
      ),
    );
  }, [ipc, runJob, createJobConfig]);

  const getRemoteBranches = useCallback(() => {
    const rp = repoPathRef.current;
    return runJob(
      createJobConfig(
        Channels.GETREMOTEBRANCHES,
        () => ipc.rpc<any[]>(Channels.GETREMOTEBRANCHES, rp),
        [],
        { reorderable: true },
      ),
    );
  }, [ipc, runJob, createJobConfig]);

  const getStashes = useCallback(() => {
    const rp = repoPathRef.current;
    return runJob(
      createJobConfig(
        Channels.GETSTASHES,
        () => ipc.rpc<any[]>(Channels.GETSTASHES, rp),
        [],
        { reorderable: true },
      ),
    );
  }, [ipc, runJob, createJobConfig]);

  const getWorktrees = useCallback(() => {
    const rp = repoPathRef.current;
    return runJob(
      createJobConfig(
        Channels.GETWORKTREES,
        () => ipc.rpc<any[]>(Channels.GETWORKTREES, rp),
        [],
        { reorderable: true },
      ),
    );
  }, [ipc, runJob, createJobConfig]);

  const getSubmodules = useCallback(() => {
    const rp = repoPathRef.current;
    return runJob(
      createJobConfig(
        Channels.GETSUBMODULES,
        () => ipc.rpc<any[]>(Channels.GETSUBMODULES, rp),
        [],
        { reorderable: true },
      ),
    );
  }, [ipc, runJob, createJobConfig]);

  const getCommitHistory = useCallback(
    (count = 50, skip = 0, activeBranch?: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.GETCOMMITHISTORY,
          () =>
            ipc.rpc<any[]>(
              Channels.GETCOMMITHISTORY,
              rp,
              count,
              skip,
              activeBranch,
            ),
          [],
          { reorderable: true },
        ),
      );
    },
    [ipc, runJob, createJobConfig],
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
          Channels.GETFILEDIFF,
          () =>
            ipc.rpc(
              Channels.GETFILEDIFF,
              rp,
              unstaged,
              staged,
              cursor ?? null,
              maxLines,
            ),
          [],
          { reorderable: true },
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const getStashDiff = useCallback(
    (index: number) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.STASHDIFF,
          () => ipc.rpc(Channels.STASHDIFF, rp, index),
          [],
          { reorderable: true },
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const getCommitDiff = useCallback(
    (hash: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.COMMITDIFF,
          () => ipc.rpc(Channels.COMMITDIFF, rp, hash),
          [],
          { reorderable: true },
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const getCommandHistory = useCallback(() => {
    const rp = repoPathRef.current;
    return ipc.rpc<any[]>(Channels.GETCOMMANDHISTORY, rp);
  }, [ipc]);

  // --- Write operations ---

  const stage = useCallback(
    (files: string[]) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.GITSTAGE,
          () => ipc.rpc(Channels.GITSTAGE, rp, files),
          [RepoArea.LOCAL_CHANGES],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const unstage = useCallback(
    (files: string[]) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.GITUNSTAGE,
          () => ipc.rpc(Channels.GITUNSTAGE, rp, files),
          [RepoArea.LOCAL_CHANGES],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const commit = useCallback(
    (message: string, amend: boolean, push: boolean, branch?: any) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.COMMIT,
          () => ipc.rpc(Channels.COMMIT, rp, message, push, branch, amend),
          [...RepoAreaDefaults.LOCAL],
          { immediate: true },
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const checkout = useCallback(
    (branch: string, toNewBranch: boolean, andPull: boolean = false) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.CHECKOUT,
          () => ipc.rpc(Channels.CHECKOUT, rp, branch, toNewBranch, andPull),
          [...RepoAreaDefaults.ALL],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const push = useCallback(
    (branch?: any, force = false) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.PUSH,
          () => ipc.rpc(Channels.PUSH, rp, branch, force),
          [RepoArea.LOCAL_BRANCHES, RepoArea.REMOTE_BRANCHES, RepoArea.COMMIT_HISTORY],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const pull = useCallback(
    (force = false) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.PULL,
          () => ipc.rpc(Channels.PULL, rp, force),
          [...RepoAreaDefaults.ALL],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const fetch = useCallback(
    (prune = false) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.FETCH,
          () => ipc.rpc(Channels.FETCH, rp, prune),
          [RepoArea.REMOTE_BRANCHES],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const mergeBranch = useCallback(
    (branch: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.MERGEBRANCH,
          () => ipc.rpc(Channels.MERGEBRANCH, rp, branch),
          [...RepoAreaDefaults.ALL],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const rebaseBranch = useCallback(
    (branch: string, interactive = false) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.REBASEBRANCH,
          () => ipc.rpc(Channels.REBASEBRANCH, rp, branch, interactive),
          [...RepoAreaDefaults.ALL],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const createBranch = useCallback(
    (branchName: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.CREATEBRANCH,
          () => ipc.rpc(Channels.CREATEBRANCH, rp, branchName),
          [RepoArea.LOCAL_BRANCHES],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const deleteBranch = useCallback(
    (branches: any[]) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.DELETEBRANCH,
          () => ipc.rpc(Channels.DELETEBRANCH, rp, branches),
          [RepoArea.LOCAL_BRANCHES, RepoArea.REMOTE_BRANCHES],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const renameBranch = useCallback(
    (oldName: string, newName: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.RENAMEBRANCH,
          () => ipc.rpc(Channels.RENAMEBRANCH, rp, oldName, newName),
          [RepoArea.LOCAL_BRANCHES],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const fastForward = useCallback(
    (branch: any) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.FASTFORWARDBRANCH,
          () => ipc.rpc(Channels.FASTFORWARDBRANCH, rp, branch),
          [RepoArea.LOCAL_BRANCHES],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const hardReset = useCallback(() => {
    const rp = repoPathRef.current;
    return runJob(
      createJobConfig(
        Channels.HARDRESET,
        () => ipc.rpc(Channels.HARDRESET, rp),
        [...RepoAreaDefaults.LOCAL],
      ),
    );
  }, [ipc, runJob, createJobConfig]);

  const undoFileChanges = useCallback(
    (files: string[], revision?: string, staged = false) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.UNDOFILECHANGES,
          () => ipc.rpc(Channels.UNDOFILECHANGES, rp, files, revision, staged),
          [RepoArea.LOCAL_CHANGES],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const stash = useCallback(
    (unstagedOnly: boolean, stashName: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.STASH,
          () => ipc.rpc(Channels.STASH, rp, unstagedOnly, stashName),
          [RepoArea.LOCAL_CHANGES, RepoArea.STASHES],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const applyStash = useCallback(
    (index: number) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.APPLYSTASH,
          () => ipc.rpc(Channels.APPLYSTASH, rp, index),
          [RepoArea.LOCAL_CHANGES, RepoArea.STASHES],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const deleteStash = useCallback(
    (index: number) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.DELETESTASH,
          () => ipc.rpc(Channels.DELETESTASH, rp, index),
          [RepoArea.STASHES],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const cherryPick = useCallback(
    (hash: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.CHERRYPICKCOMMIT,
          () => ipc.rpc(Channels.CHERRYPICKCOMMIT, rp, hash),
          [...RepoAreaDefaults.LOCAL],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const revert = useCallback(
    (hash: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.REVERTCOMMIT,
          () => ipc.rpc(Channels.REVERTCOMMIT, rp, hash),
          [...RepoAreaDefaults.LOCAL],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const reset = useCallback(
    (hash: string, mode: 'soft' | 'mixed' | 'hard' = 'mixed') => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.RESETTOCOMMIT,
          () => ipc.rpc(Channels.RESETTOCOMMIT, rp, hash, mode),
          [...RepoAreaDefaults.LOCAL],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const resolveConflict = useCallback(
    (file: string, useTheirs: boolean) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.RESOLVECONFLICTUSING,
          () => ipc.rpc(Channels.RESOLVECONFLICTUSING, rp, file, useTheirs),
          [RepoArea.LOCAL_CHANGES],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const changeActiveOperation = useCallback(
    (op: string, abort: boolean) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.CHANGEACTIVEOPERATION,
          () => ipc.rpc(Channels.CHANGEACTIVEOPERATION, rp, op, abort),
          [...RepoAreaDefaults.LOCAL],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const deleteWorktree = useCallback(
    (worktreePath: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.DELETEWORKTREE,
          () => ipc.rpc(Channels.DELETEWORKTREE, rp, worktreePath),
          [RepoArea.WORKTREES],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const updateSubmodules = useCallback(
    (recursive: boolean, path?: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.UPDATESUBMODULES,
          () => ipc.rpc(Channels.UPDATESUBMODULES, rp, recursive, path),
          [RepoArea.SUBMODULES],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const addSubmodule = useCallback(
    (url: string, path: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.ADDSUBMODULE,
          () => ipc.rpc(Channels.ADDSUBMODULE, rp, url, path),
          [RepoArea.SUBMODULES],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const deleteFiles = useCallback(
    (paths: string[]) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.DELETEFILES,
          () => ipc.rpc(Channels.DELETEFILES, rp, paths),
          [RepoArea.LOCAL_CHANGES],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const merge = useCallback(
    (file: string, mergetool?: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.MERGE,
          () => ipc.rpc(Channels.MERGE, rp, file, mergetool),
          [RepoArea.LOCAL_CHANGES],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const getBranchPremerge = useCallback(
    (branchHash: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.GETBRANCHPREMERGE,
          () => ipc.rpc(Channels.GETBRANCHPREMERGE, rp, branchHash),
          [],
          { reorderable: true },
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  const changeHunk = useCallback(
    (filename: string, hunk: any, changedText: string) => {
      const rp = repoPathRef.current;
      return runJob(
        createJobConfig(
          Channels.CHANGEHUNK,
          () => ipc.rpc(Channels.CHANGEHUNK, rp, filename, hunk, changedText),
          [RepoArea.LOCAL_CHANGES],
        ),
      );
    },
    [ipc, runJob, createJobConfig],
  );

  // UI operations (not queued)
  const openTerminal = useCallback(() => {
    return ipc.rpc(Channels.OPENTERMINAL, repoPathRef.current);
  }, [ipc]);

  const openFolder = useCallback(
    (path?: string) => {
      return ipc.rpc(Channels.OPENFOLDER, repoPathRef.current, path || '');
    },
    [ipc],
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
      getRemoteBranches(),
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
      getStashDiff,
      getCommitDiff,
      getCommandHistory,

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
      getStashDiff,
      getCommitDiff,
      getCommandHistory,
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
