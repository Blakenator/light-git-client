import { useCallback, useRef, useState } from 'react';
import { useRepositoryStore, useSettingsStore, useUiStore } from '../../../stores';
import { useRepoViewStore } from '../../../stores/repoViewStore';
import { useGitService } from '../../../ipc';
import { detectCrlfWarning } from '../../../utils/warningDetectors';
import { normalizeDiff } from './useDiffActions';

/**
 * Hook providing stash operations: create, apply, delete, view.
 */
export function useStashActions(repoPath: string) {
  const gitService = useGitService(repoPath);
  const updateRepoCache = useRepositoryStore((state) => state.updateRepoCache);
  const addAlert = useUiStore((state) => state.addAlert);
  const showModal = useUiStore((state) => state.showModal);
  const setCrlfError = useUiStore((state) => state.setCrlfError);
  const setExpandState = useSettingsStore((state) => state.setExpandState);

  const repoCache = useRepositoryStore((state) => state.getCacheFor(repoPath));
  const repoCacheRef = useRef(repoCache);
  repoCacheRef.current = repoCache;

  const [stashOnlyUnstaged, setStashOnlyUnstaged] = useState(false);

  const handleStash = useCallback((unstagedOnly: boolean) => {
    setStashOnlyUnstaged(unstagedOnly);
    showModal('createStash');
  }, [showModal]);

  const handleStashWithName = useCallback(async (stashName: string) => {
    try {
      await gitService.stash(stashOnlyUnstaged, stashName);
      updateRepoCache(repoPath, { selectedStagedChanges: {}, selectedUnstagedChanges: {} });
      addAlert('Changes stashed', 'success');
    } catch (error: any) {
      const crlf = detectCrlfWarning(error.message || '');
      if (crlf) {
        setCrlfError(crlf);
        updateRepoCache(repoPath, { selectedStagedChanges: {}, selectedUnstagedChanges: {} });
        addAlert('Changes stashed', 'success');
      } else {
        addAlert(`Stash failed: ${error.message}`, 'error');
      }
    }
  }, [gitService, stashOnlyUnstaged, repoPath, updateRepoCache, addAlert, setCrlfError]);

  const handleApplyStash = useCallback(async (stash: any) => {
    try {
      await gitService.applyStash(stash.index);
      updateRepoCache(repoPath, { selectedStagedChanges: {}, selectedUnstagedChanges: {} });
      addAlert('Stash applied', 'success');
    } catch (error: any) {
      addAlert(`Apply stash failed: ${error.message}`, 'error');
    }
  }, [gitService, repoPath, updateRepoCache, addAlert]);

  const handleDeleteStash = useCallback(async (stash: any) => {
    const currentStashes = repoCacheRef.current?.stashes || [];
    const updatedStashes = currentStashes
      .filter((s: any) => s.hash !== stash.hash)
      .map((s: any, i: number) => ({ ...s, index: i }));
    updateRepoCache(repoPath, {
      stashes: updatedStashes,
      selectedStagedChanges: {},
      selectedUnstagedChanges: {},
    });
    try {
      await gitService.deleteStash(stash.index);
      addAlert('Stash deleted', 'success');
    } catch (error: any) {
      updateRepoCache(repoPath, { stashes: currentStashes });
      addAlert(`Delete stash failed: ${error.message}`, 'error');
    }
  }, [gitService, repoPath, updateRepoCache, addAlert]);

  const handleViewStash = useCallback(async (stash: any) => {
    try {
      const diffResponse = await gitService.getStashDiff(stash.index) as any;
      const diff = Array.isArray(diffResponse) ? diffResponse : (diffResponse?.content || []);
      const normalized = normalizeDiff(diff || []);
      if (normalized.length === 0) {
        console.warn('View stash: normalized diff is empty. Raw response:', diffResponse);
      }
      const store = useRepoViewStore.getState();
      store.setCurrentDiff(repoPath, normalized);
      store.setCommitInfo(repoPath, {
        hash: stash.hash,
        message: stash.message || `stash@{${stash.index}}`,
        author: stash.authorName || '',
        date: stash.authorDate || '',
        parents: stash.parentHashes || [],
        tags: stash.branchName ? [stash.branchName] : [],
      });
      store.setShowDiff(repoPath, true);
      // Ensure the commit-history card is expanded so the diff view is visible
      setExpandState('commit-history', true);
    } catch (error: any) {
      addAlert(`View stash failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert, setExpandState, repoPath]);

  const handleShowRestoreStash = useCallback(() => showModal('restoreStash'), [showModal]);

  return {
    stashOnlyUnstaged,
    handleStash,
    handleStashWithName,
    handleApplyStash,
    handleDeleteStash,
    handleViewStash,
    handleShowRestoreStash,
  };
}
