import { useCallback, useRef } from 'react';
import { useRepositoryStore, useUiStore } from '../../../stores';
import { useRepoViewStore } from '../../../stores/repoViewStore';
import { useGitService } from '../../../ipc';
import { normalizeDiff } from './useDiffActions';

/** Imperative read of repo cache (no subscription, no re-renders). */
const getRepoCache = (repoPath: string) => useRepositoryStore.getState().repoCache[repoPath];

/**
 * Hook providing commit history operations: pagination, cherry-pick, revert, reset,
 * branch filtering, checkout commits.
 */
export function useCommitHistoryActions(
  repoPath: string,
  noMoreCommits: React.MutableRefObject<boolean>,
) {
  const gitService = useGitService(repoPath);
  const updateRepoCache = useRepositoryStore((state) => state.updateRepoCache);
  const addAlert = useUiStore((state) => state.addAlert);
  const showModal = useUiStore((state) => state.showModal);

  const isLoadingMoreCommits = useRef(false);

  // Active branches from repoViewStore
  const activeBranches = useRepoViewStore((state) => state.activeBranches[repoPath] || []);

  const getBranchNames = () => {
    const branches = useRepoViewStore.getState().getActiveBranches(repoPath);
    return branches.length > 0 ? branches.map((b: any) => b.name) : undefined;
  };

  const handleLoadMoreCommits = useCallback(async () => {
    if (isLoadingMoreCommits.current || noMoreCommits.current) return;
    isLoadingMoreCommits.current = true;
    try {
      const existing = getRepoCache(repoPath)?.commitHistory || [];
      const newCommits = await gitService.getCommitHistory(50, existing.length, getBranchNames());
      if (!newCommits || newCommits.length === 0) {
        noMoreCommits.current = true;
        return;
      }
      updateRepoCache(repoPath, { commitHistory: [...existing, ...newCommits] });
    } catch (error: any) {
      addAlert(`Failed to load commits: ${error.message}`, 'error');
    } finally {
      isLoadingMoreCommits.current = false;
    }
  }, [gitService, repoPath, updateRepoCache, addAlert, noMoreCommits]);

  const handleClickCommit = useCallback(async (hash: string) => {
    try {
      const diffResponse = await gitService.getCommitDiff(hash) as any;
      const diff = Array.isArray(diffResponse) ? diffResponse : (diffResponse?.content || []);
      const commits = getRepoCache(repoPath)?.commitHistory || [];
      const commit = commits.find((c: any) => c.hash === hash) as any;
      const store = useRepoViewStore.getState();
      store.setCurrentDiff(repoPath, normalizeDiff(diff || []));
      const commitDate = commit?.authorDate || commit?.date;
      const formattedDate = commitDate instanceof Date
        ? commitDate.toLocaleString()
        : (typeof commitDate === 'string' ? commitDate : '');

      store.setCommitInfo(repoPath, commit ? {
        hash: commit.hash,
        message: commit.message,
        author: commit.authorName || commit.author,
        date: formattedDate,
        parents: commit.parentHashes || commit.parents,
      } : null);
      store.setShowDiff(repoPath, true);
    } catch (error: any) {
      addAlert(`Failed to load commit diff: ${error.message}`, 'error');
    }
  }, [gitService, addAlert, repoPath]);

  const handleCherryPick = useCallback(async (commit: any) => {
    try {
      await gitService.cherryPick(commit.hash);
      addAlert('Cherry-pick successful', 'success');
    } catch (error: any) {
      addAlert(`Cherry-pick failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleCheckoutCommit = useCallback(async (hash: string) => {
    try {
      await gitService.checkout(hash, false, false);
      addAlert(`Checked out ${hash.substring(0, 7)}`, 'success');
    } catch (error: any) {
      addAlert(`Checkout failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleRevertCommit = useCallback(async (commit: any) => {
    try {
      await gitService.revert(commit.hash);
      addAlert(`Reverted commit ${commit.hash.substring(0, 7)}`, 'success');
    } catch (error: any) {
      addAlert(`Revert failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleCreateBranchFromCommit = useCallback(async (commit: any) => {
    try {
      await gitService.checkout(commit.hash, false, false);
      showModal('createBranch');
    } catch (error: any) {
      addAlert(`Failed to create branch: ${error.message}`, 'error');
    }
  }, [gitService, showModal, addAlert]);

  const handleCopyHash = useCallback((hash: string) => {
    navigator.clipboard.writeText(hash);
    addAlert(`Copied ${hash.substring(0, 7)} to clipboard`, 'info');
  }, [addAlert]);

  const handleResetToCommit = useCallback(async (commit: any, mode: 'soft' | 'mixed' | 'hard') => {
    try {
      await gitService.reset(commit.hash, mode);
      addAlert(`Reset to ${commit.hash.substring(0, 7)} (${mode})`, 'success');
    } catch (error: any) {
      addAlert(`Reset failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const refreshCommits = useCallback(async (branches: any[]) => {
    useRepoViewStore.getState().setActiveBranches(repoPath, branches);
    noMoreCommits.current = false;
    try {
      const names = branches.length > 0 ? branches.map((b: any) => b.name) : undefined;
      const commits = await gitService.getCommitHistory(50, 0, names);
      updateRepoCache(repoPath, { commitHistory: commits });
    } catch (error: any) {
      addAlert(`Failed to load commits: ${error.message}`, 'error');
    }
  }, [gitService, repoPath, updateRepoCache, addAlert, noMoreCommits]);

  const handleBranchToggle = useCallback(async (branch: any) => {
    const current = useRepoViewStore.getState().getActiveBranches(repoPath);
    const exists = current.some((b: any) => b.name === branch.name);
    const next = exists
      ? current.filter((b: any) => b.name !== branch.name)
      : [...current, branch];
    await refreshCommits(next);
  }, [repoPath, refreshCommits]);

  const handleClearBranches = useCallback(async () => {
    await refreshCommits([]);
  }, [refreshCommits]);

  const handleSetBranches = useCallback(async (branches: any[]) => {
    await refreshCommits(branches);
  }, [refreshCommits]);

  return {
    activeBranches,
    handleLoadMoreCommits,
    handleClickCommit,
    handleCherryPick,
    handleCheckoutCommit,
    handleRevertCommit,
    handleCreateBranchFromCommit,
    handleCopyHash,
    handleResetToCommit,
    handleBranchToggle,
    handleClearBranches,
    handleSetBranches,
  };
}
