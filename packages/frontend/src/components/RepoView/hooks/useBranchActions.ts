import { useCallback, useRef, useState } from 'react';
import { useRepositoryStore, useUiStore } from '../../../stores';
import { useRepoViewStore } from '../../../stores/repoViewStore';
import { useGitService } from '../../../ipc';
import {
  detectSubmoduleCheckout,
  detectRemoteMessage,
} from '../../../utils/warningDetectors';
import { normalizeDiff } from './useDiffActions';

export interface MergeInfo {
  sourceBranch?: any;
  targetBranch?: any;
  isRebase?: boolean;
  isInteractive?: boolean;
}

/**
 * Hook providing branch operation handlers and related modal state.
 */
export function useBranchActions(repoPath: string) {
  const gitService = useGitService(repoPath);
  const addAlert = useUiStore((state) => state.addAlert);
  const showModal = useUiStore((state) => state.showModal);

  const repoCache = useRepositoryStore((state) => state.getCacheFor(repoPath));
  const repoCacheRef = useRef(repoCache);
  repoCacheRef.current = repoCache;

  // Modal state
  const [activeMergeInfo, setActiveMergeInfo] = useState<MergeInfo | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<any>(null);
  const [branchToRename, setBranchToRename] = useState<any>(null);

  const handleCheckout = useCallback(async (branch: any, andPull: boolean) => {
    try {
      await gitService.checkout(branch.name, false, andPull);
      addAlert(`Checked out ${branch.name}`, 'success');
    } catch (error: any) {
      if (detectSubmoduleCheckout(error.message || '')) {
        addAlert(`Checked out ${branch.name}`, 'success');
      } else {
        addAlert(`Checkout failed: ${error.message}`, 'error');
      }
    }
  }, [gitService, addAlert]);

  const handlePush = useCallback(async (branch: any, force: boolean) => {
    try {
      await gitService.push(branch, force);
      addAlert('Push successful', 'success');
    } catch (error: any) {
      const remoteMsg = detectRemoteMessage(error.message || '');
      if (remoteMsg) {
        addAlert(remoteMsg.message, 'info', 0);
      } else {
        addAlert(`Push failed: ${error.message}`, 'error');
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

  const handleMerge = useCallback((branch?: any) => {
    if (branch) {
      setActiveMergeInfo({ sourceBranch: branch });
    } else {
      setActiveMergeInfo(null);
    }
    showModal('mergeBranch');
  }, [showModal]);

  const handleRebase = useCallback((branch: any) => {
    setActiveMergeInfo({ sourceBranch: branch, isRebase: true });
    showModal('mergeBranch');
  }, [showModal]);

  const handleInteractiveRebase = useCallback((branch: any) => {
    setActiveMergeInfo({ sourceBranch: branch, isRebase: true, isInteractive: true });
    showModal('mergeBranch');
  }, [showModal]);

  const handleMergeBranchSubmit = useCallback(async (
    source: string,
    target: string,
    options: { rebase: boolean; interactive: boolean }
  ) => {
    try {
      const currentBranch = repoCacheRef.current?.localBranches?.find((b: any) => b.isCurrentBranch);
      if (options.rebase) {
        if (currentBranch?.name !== source) {
          await gitService.checkout(source, false, false);
        }
        await gitService.rebaseBranch(target, options.interactive);
      } else {
        if (currentBranch?.name !== target) {
          await gitService.checkout(target, false, false);
        }
        await gitService.mergeBranch(source);
      }
      addAlert(
        options.rebase
          ? `Rebased ${source} onto ${target}`
          : `Merged ${source} into ${target}`,
        'success'
      );
    } catch (error: any) {
      addAlert(
        `${options.rebase ? 'Rebase' : 'Merge'} failed: ${error.message}`,
        'error'
      );
    }
  }, [gitService, addAlert]);

  const handleCreateBranch = useCallback(() => {
    showModal('createBranch');
  }, [showModal]);

  const handlePruneBranches = useCallback(() => {
    showModal('pruneBranch');
  }, [showModal]);

  const handleConfirmPruneBranches = useCallback(async (branches: any[]) => {
    try {
      await gitService.deleteBranch(branches);
      addAlert(`Deleted ${branches.length} branch(es)`, 'success');
    } catch (error: any) {
      addAlert(`Prune failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleDeleteBranch = useCallback(async (branch: any) => {
    setBranchToDelete(branch);
    showModal('confirmDeleteBranch');
  }, [showModal]);

  const handleConfirmDeleteBranch = useCallback(async () => {
    if (!branchToDelete) return;
    try {
      await gitService.deleteBranch([branchToDelete]);
      addAlert(`Deleted branch ${branchToDelete.name}`, 'success');
    } catch (error: any) {
      addAlert(`Delete failed: ${error.message}`, 'error');
    }
    setBranchToDelete(null);
  }, [gitService, addAlert, branchToDelete]);

  const handleRenameBranch = useCallback(async (branch: any) => {
    setBranchToRename(branch);
    showModal('renameBranch');
  }, [showModal]);

  const handleRenameBranchSubmit = useCallback(async (newName: string) => {
    if (!branchToRename) return;
    try {
      await gitService.renameBranch(branchToRename.name, newName);
      addAlert(`Renamed branch to ${newName}`, 'success');
    } catch (error: any) {
      addAlert(`Rename branch failed: ${error.message}`, 'error');
    }
    setBranchToRename(null);
  }, [gitService, addAlert, branchToRename]);

  const handleCreateBranchSubmit = useCallback(async (branchName: string) => {
    try {
      await gitService.createBranch(branchName);
      addAlert(`Created branch ${branchName}`, 'success');
    } catch (error: any) {
      addAlert(`Create branch failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleFastForward = useCallback(async (branch: any) => {
    try {
      await gitService.fastForward(branch);
      addAlert(`Fast-forwarded ${branch.name}`, 'success');
    } catch (error: any) {
      addAlert(`Fast-forward failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleRemoteCheckout = useCallback(async (branch: any) => {
    try {
      const localBranchName = branch.name.replace('origin/', '');
      const localBranch = repoCacheRef.current?.localBranches?.find(
        (b: any) => b.name === localBranchName
      );
      const branchName = localBranch ? localBranchName : branch.name;
      const toNewBranch = !localBranch;
      const andPull = !!localBranch;
      await gitService.checkout(branchName, toNewBranch, andPull);
      addAlert(`Checked out ${localBranchName}`, 'success');
    } catch (error: any) {
      addAlert(`Checkout failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleBranchPremerge = useCallback(async (branch: any) => {
    try {
      const diffResponse = await gitService.getBranchPremerge(branch.hash || branch.name) as any;
      const diff = Array.isArray(diffResponse) ? diffResponse : (diffResponse?.content || []);
      const store = useRepoViewStore.getState();
      store.setCurrentDiff(repoPath, normalizeDiff(diff || []));
      store.setCommitInfo(repoPath, {
        hash: branch.hash || branch.name,
        message: `Changes between current branch and ${branch.name}`,
        author: '',
        date: '',
      });
      store.setShowDiff(repoPath, true);
    } catch (error: any) {
      addAlert(`Failed to load premerge diff: ${error.message}`, 'error');
    }
  }, [gitService, addAlert, repoPath]);

  return {
    // Modal state
    activeMergeInfo,
    branchToDelete,
    branchToRename,
    // Branch handlers
    handleCheckout,
    handlePush,
    handlePull,
    handleMerge,
    handleRebase,
    handleInteractiveRebase,
    handleMergeBranchSubmit,
    handleCreateBranch,
    handlePruneBranches,
    handleConfirmPruneBranches,
    handleDeleteBranch,
    handleConfirmDeleteBranch,
    handleRenameBranch,
    handleRenameBranchSubmit,
    handleCreateBranchSubmit,
    handleFastForward,
    handleRemoteCheckout,
    handleBranchPremerge,
  };
}
