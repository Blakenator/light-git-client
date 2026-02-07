import { useCallback, useRef } from 'react';
import { useRepositoryStore, useSettingsStore, useUiStore } from '../../../stores';
import { useGitService } from '../../../ipc';
import { detectCrlfWarning } from '../../../utils/warningDetectors';

/**
 * Hook providing staging/unstaging handlers and file selection management.
 */
export function useStagingActions(
  repoPath: string,
  refreshSelectedFilesDiff: (
    selectedStaged: Record<string, boolean>,
    selectedUnstaged: Record<string, boolean>,
  ) => Promise<void>,
) {
  const gitService = useGitService(repoPath);
  const updateRepoCache = useRepositoryStore((state) => state.updateRepoCache);
  const addAlert = useUiStore((state) => state.addAlert);
  const setCrlfError = useUiStore((state) => state.setCrlfError);

  const repoCache = useRepositoryStore((state) => state.getCacheFor(repoPath));
  const repoCacheRef = useRef(repoCache);
  repoCacheRef.current = repoCache;

  const handleStageAll = useCallback(async () => {
    try {
      await gitService.stage(['.']);
      updateRepoCache(repoPath, { selectedUnstagedChanges: {} });
    } catch (error: any) {
      const crlf = detectCrlfWarning(error.message || '');
      if (crlf) {
        setCrlfError(crlf);
        updateRepoCache(repoPath, { selectedUnstagedChanges: {} });
      } else {
        addAlert(`Stage failed: ${error.message}`, 'error');
      }
    }
  }, [gitService, repoPath, updateRepoCache, addAlert, setCrlfError]);

  const handleUnstageAll = useCallback(async () => {
    try {
      await gitService.unstage(['.']);
      updateRepoCache(repoPath, { selectedStagedChanges: {} });
    } catch (error: any) {
      const crlf = detectCrlfWarning(error.message || '');
      if (crlf) {
        setCrlfError(crlf);
        updateRepoCache(repoPath, { selectedStagedChanges: {} });
      } else {
        addAlert(`Unstage failed: ${error.message}`, 'error');
      }
    }
  }, [gitService, repoPath, updateRepoCache, addAlert, setCrlfError]);

  const handleStageSelected = useCallback(async () => {
    try {
      const files = Object.entries(repoCacheRef.current?.selectedUnstagedChanges || {})
        .filter(([_, selected]) => selected)
        .map(([file]) => file.replace(/.*?->\s*/, ''));
      if (files.length > 0) {
        await gitService.stage(files);
        updateRepoCache(repoPath, { selectedUnstagedChanges: {} });
      }
    } catch (error: any) {
      const crlf = detectCrlfWarning(error.message || '');
      if (crlf) {
        setCrlfError(crlf);
        updateRepoCache(repoPath, { selectedUnstagedChanges: {} });
      } else {
        addAlert(`Stage failed: ${error.message}`, 'error');
      }
    }
  }, [gitService, repoPath, updateRepoCache, addAlert, setCrlfError]);

  const handleUnstageSelected = useCallback(async () => {
    try {
      const files = Object.entries(repoCacheRef.current?.selectedStagedChanges || {})
        .filter(([_, selected]) => selected)
        .map(([file]) => file.replace(/.*?->\s*/, ''));
      if (files.length > 0) {
        await gitService.unstage(files);
        updateRepoCache(repoPath, { selectedStagedChanges: {} });
      }
    } catch (error: any) {
      const crlf = detectCrlfWarning(error.message || '');
      if (crlf) {
        setCrlfError(crlf);
        updateRepoCache(repoPath, { selectedStagedChanges: {} });
      } else {
        addAlert(`Unstage failed: ${error.message}`, 'error');
      }
    }
  }, [gitService, repoPath, updateRepoCache, addAlert, setCrlfError]);

  const handleUndoFile = useCallback(async (path: string, changeType?: string, staged = false) => {
    try {
      const type = changeType?.[0]?.toUpperCase();
      if (type === 'A' || type === '?') {
        // Added/Untracked files: unstage if staged, then delete from filesystem
        if (staged) {
          await gitService.unstage([path]);
        }
        await gitService.deleteFiles([path]);
      } else if (type === 'D') {
        // Deleted files: restore using checkout from HEAD
        await gitService.undoFileChanges([path], undefined, true);
      } else {
        // Modified/Renamed/etc: use standard undo approach
        await gitService.undoFileChanges([path], undefined, staged);
      }
    } catch (error: any) {
      const crlf = detectCrlfWarning(error.message || '');
      if (crlf) {
        setCrlfError(crlf);
      } else {
        addAlert(`Undo failed: ${error.message}`, 'error');
      }
    }
  }, [gitService, addAlert, setCrlfError]);

  const handleUndoSelectedFiles = useCallback(async (
    files: Array<{ path: string; changeType: string }>,
    staged: boolean,
  ) => {
    try {
      const addedOrUntracked = files.filter(f => {
        const t = f.changeType?.[0]?.toUpperCase();
        return t === 'A' || t === '?';
      });
      const deleted = files.filter(f => f.changeType?.[0]?.toUpperCase() === 'D');
      const others = files.filter(f => {
        const t = f.changeType?.[0]?.toUpperCase();
        return t !== 'A' && t !== '?' && t !== 'D';
      });

      const promises: Promise<any>[] = [];

      if (addedOrUntracked.length > 0) {
        const paths = addedOrUntracked.map(f => f.path);
        if (staged) {
          promises.push(
            gitService.unstage(paths).then(() => gitService.deleteFiles(paths)),
          );
        } else {
          promises.push(gitService.deleteFiles(paths));
        }
      }

      if (deleted.length > 0) {
        // Restore deleted files using checkout from HEAD
        promises.push(gitService.undoFileChanges(deleted.map(f => f.path), undefined, true));
      }

      if (others.length > 0) {
        promises.push(gitService.undoFileChanges(others.map(f => f.path), undefined, staged));
      }

      await Promise.all(promises);
    } catch (error: any) {
      const crlf = detectCrlfWarning(error.message || '');
      if (crlf) {
        setCrlfError(crlf);
      } else {
        addAlert(`Undo failed: ${error.message}`, 'error');
      }
    }
  }, [gitService, addAlert, setCrlfError]);

  const handleDeleteFiles = useCallback(async (paths: string[]) => {
    try {
      await gitService.deleteFiles(paths);
    } catch (error: any) {
      addAlert(`Delete failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleSelectStagedChange = useCallback((path: string, selected: boolean) => {
    const current = repoCacheRef.current;
    const currentStaged = current?.selectedStagedChanges || {};
    const newStagedChanges = { ...currentStaged, [path]: selected };
    updateRepoCache(repoPath, { selectedStagedChanges: newStagedChanges });
    refreshSelectedFilesDiff(newStagedChanges, current?.selectedUnstagedChanges || {});
  }, [repoPath, updateRepoCache, refreshSelectedFilesDiff]);

  const handleSelectUnstagedChange = useCallback((path: string, selected: boolean) => {
    const current = repoCacheRef.current;
    const currentUnstaged = current?.selectedUnstagedChanges || {};
    const newUnstagedChanges = { ...currentUnstaged, [path]: selected };
    updateRepoCache(repoPath, { selectedUnstagedChanges: newUnstagedChanges });
    refreshSelectedFilesDiff(current?.selectedStagedChanges || {}, newUnstagedChanges);
  }, [repoPath, updateRepoCache, refreshSelectedFilesDiff]);

  const handleBatchSelectStagedChange = useCallback((changes: Record<string, boolean>) => {
    const current = repoCacheRef.current;
    const currentStaged = current?.selectedStagedChanges || {};
    const newStagedChanges = { ...currentStaged, ...changes };
    updateRepoCache(repoPath, { selectedStagedChanges: newStagedChanges });
    refreshSelectedFilesDiff(newStagedChanges, current?.selectedUnstagedChanges || {});
  }, [repoPath, updateRepoCache, refreshSelectedFilesDiff]);

  const handleBatchSelectUnstagedChange = useCallback((changes: Record<string, boolean>) => {
    const current = repoCacheRef.current;
    const currentUnstaged = current?.selectedUnstagedChanges || {};
    const newUnstagedChanges = { ...currentUnstaged, ...changes };
    updateRepoCache(repoPath, { selectedUnstagedChanges: newUnstagedChanges });
    refreshSelectedFilesDiff(current?.selectedStagedChanges || {}, newUnstagedChanges);
  }, [repoPath, updateRepoCache, refreshSelectedFilesDiff]);

  const handleSetFilenameSplit = useCallback((split: boolean) => {
    const settingsState = useSettingsStore.getState();
    settingsState.updateSettings({ splitFilenameDisplay: split });
    settingsState.saveSettings();
  }, []);

  return {
    handleStageAll,
    handleUnstageAll,
    handleStageSelected,
    handleUnstageSelected,
    handleUndoFile,
    handleUndoSelectedFiles,
    handleDeleteFiles,
    handleSelectStagedChange,
    handleSelectUnstagedChange,
    handleBatchSelectStagedChange,
    handleBatchSelectUnstagedChange,
    handleSetFilenameSplit,
  };
}
