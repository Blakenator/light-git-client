import { useCallback, useState } from 'react';
import { useRepositoryStore, useUiStore } from '../../../stores';
import { useRepoViewStore } from '../../../stores/repoViewStore';
import { useGitService } from '../../../ipc';
import {
  detectSubmoduleCheckout,
  detectRemoteMessage,
  getIpcErrorMessage,
} from '../../../utils/warningDetectors';
import { normalizeDiff } from './useDiffActions';
import { isBranchPushLocked } from '../../../utils/pushLock';

export interface MergeInfo {
  sourceBranch?: any;
  targetBranch?: any;
  isRebase?: boolean;
  isInteractive?: boolean;
}

/** Imperative read of repo cache (no subscription, no re-renders). */
const getRepoCache = (repoPath: string) => useRepositoryStore.getState().repoCache[repoPath];

/**
 * Hook providing branch operation handlers and related modal state.
 */
export function useBranchActions(repoPath: string) {
  const gitService = useGitService(repoPath);
  const addAlert = useUiStore((state) => state.addAlert);
  const showModal = useUiStore((state) => state.showModal);

  // Modal state
  const [activeMergeInfo, setActiveMergeInfo] = useState<MergeInfo | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<any>(null);
  const [branchToRename, setBranchToRename] = useState<any>(null);
  const [changeRemoteBranch, setChangeRemoteBranch] = useState<any>(null);

  const handleCheckout = useCallback(async (branch: any, andPull: boolean) => {
    try {
      await gitService.checkout(branch.name, false, andPull);
      addAlert(`Checked out ${branch.name}`, 'success');
    } catch (error: any) {
      const errorMsg = getIpcErrorMessage(error);
      if (detectSubmoduleCheckout(errorMsg)) {
        addAlert(`Checked out ${branch.name}`, 'success');
      } else {
        addAlert(`Checkout failed: ${errorMsg}`, 'error');
      }
    }
  }, [gitService, addAlert]);

  const handlePush = useCallback(async (branch: any, force: boolean) => {
    if (isBranchPushLocked(repoPath, branch?.trackingPath)) {
      addAlert(`Push blocked: branch "${branch.name}" is push-locked for this repo`, 'warning');
      return;
    }
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
  }, [gitService, addAlert, repoPath]);

  const handlePull = useCallback(async (branch: any, force: boolean) => {
    try {
      await gitService.pull(force);
      addAlert('Pull successful', 'success');
    } catch (error: any) {
      const errorMsg = getIpcErrorMessage(error);
      if (detectSubmoduleCheckout(errorMsg)) {
        addAlert('Pull successful', 'success');
      } else {
        addAlert(`Pull failed: ${errorMsg}`, 'error');
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
    setActiveMergeInfo({ targetBranch: branch, isRebase: true });
    showModal('mergeBranch');
  }, [showModal]);

  const handleInteractiveRebase = useCallback((branch: any) => {
    setActiveMergeInfo({ targetBranch: branch, isRebase: true, isInteractive: true });
    showModal('mergeBranch');
  }, [showModal]);

  const handleMergeBranchSubmit = useCallback(async (
    source: string,
    target: string,
    options: { rebase: boolean; interactive: boolean }
  ) => {
    try {
      const currentBranch = getRepoCache(repoPath)?.localBranches?.find((b: any) => b.isCurrentBranch);
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
        `${options.rebase ? 'Rebase' : 'Merge'} failed: ${getIpcErrorMessage(error)}`,
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
      addAlert(`Prune failed: ${getIpcErrorMessage(error)}`, 'error');
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
      addAlert(`Delete failed: ${getIpcErrorMessage(error)}`, 'error');
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
      addAlert(`Rename branch failed: ${getIpcErrorMessage(error)}`, 'error');
    }
    setBranchToRename(null);
  }, [gitService, addAlert, branchToRename]);

  const handleCreateBranchSubmit = useCallback(async (branchName: string, sourceBranch?: string) => {
    try {
      const currentBranch = getRepoCache(repoPath)?.localBranches?.find((b: any) => b.isCurrentBranch);
      const startPoint = sourceBranch && sourceBranch !== currentBranch?.name ? sourceBranch : undefined;
      await gitService.createBranch(branchName, startPoint);
      addAlert(`Created branch ${branchName}`, 'success');
    } catch (error: any) {
      addAlert(`Create branch failed: ${getIpcErrorMessage(error)}`, 'error');
    }
  }, [gitService, addAlert, repoPath]);

  const handleFastForward = useCallback(async (branch: any) => {
    try {
      await gitService.fastForward(branch);
      addAlert(`Fast-forwarded ${branch.name}`, 'success');
    } catch (error: any) {
      addAlert(`Fast-forward failed: ${getIpcErrorMessage(error)}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleRemoteCheckout = useCallback(async (branch: any) => {
    try {
      const localBranchName = branch.name.replace('origin/', '');
      const localBranch = getRepoCache(repoPath)?.localBranches?.find(
        (b: any) => b.name === localBranchName
      );
      const branchName = localBranch ? localBranchName : branch.name;
      const toNewBranch = !localBranch;
      const andPull = !!localBranch;
      await gitService.checkout(branchName, toNewBranch, andPull);
      addAlert(`Checked out ${localBranchName}`, 'success');
    } catch (error: any) {
      addAlert(`Checkout failed: ${getIpcErrorMessage(error)}`, 'error');
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
      addAlert(`Failed to load premerge diff: ${getIpcErrorMessage(error)}`, 'error');
    }
  }, [gitService, addAlert, repoPath]);

  const handleChangeRemote = useCallback((branch: any) => {
    setChangeRemoteBranch(branch);
    showModal('changeRemote');
  }, [showModal]);

  const handleChangeRemoteSubmit = useCallback(async (remoteBranch: string) => {
    if (!changeRemoteBranch) return;
    try {
      await gitService.setUpstreamBranch(changeRemoteBranch.name, remoteBranch);
      addAlert(`Upstream for ${changeRemoteBranch.name} set to ${remoteBranch}`, 'success');
    } catch (error: any) {
      addAlert(`Change remote failed: ${getIpcErrorMessage(error)}`, 'error');
    }
  }, [gitService, addAlert, changeRemoteBranch]);

  const handleMatchNameUpstream = useCallback(async () => {
    if (!changeRemoteBranch) return;
    const target = `origin/${changeRemoteBranch.name}`;
    const remoteBranches = getRepoCache(repoPath)?.remoteBranches ?? [];
    const exists = remoteBranches.some((b: any) => b.name === target);
    try {
      if (exists) {
        await gitService.setUpstreamBranch(changeRemoteBranch.name, target);
      } else {
        await gitService.push({ ...changeRemoteBranch, trackingPath: '' }, false);
      }
      addAlert(`Upstream for ${changeRemoteBranch.name} set to ${target}`, 'success');
    } catch (error: any) {
      addAlert(`Change remote failed: ${getIpcErrorMessage(error)}`, 'error');
    }
  }, [gitService, addAlert, changeRemoteBranch, repoPath]);

  const handleUnsetUpstream = useCallback(async () => {
    if (!changeRemoteBranch) return;
    try {
      await gitService.setUpstreamBranch(changeRemoteBranch.name);
      addAlert(`Upstream removed for ${changeRemoteBranch.name}`, 'success');
    } catch (error: any) {
      addAlert(`Unset upstream failed: ${getIpcErrorMessage(error)}`, 'error');
    }
  }, [gitService, addAlert, changeRemoteBranch]);

  return {
    // Modal state
    activeMergeInfo,
    branchToDelete,
    branchToRename,
    changeRemoteBranch,
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
    handleChangeRemote,
    handleChangeRemoteSubmit,
    handleMatchNameUpstream,
    handleUnsetUpstream,
  };
}
