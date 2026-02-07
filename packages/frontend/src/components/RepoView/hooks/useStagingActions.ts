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

  const handleUndoFile = useCallback(async (path: string) => {
    try {
      await gitService.undoFileChanges([path]);
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
    handleDeleteFiles,
    handleSelectStagedChange,
    handleSelectUnstagedChange,
    handleBatchSelectStagedChange,
    handleBatchSelectUnstagedChange,
    handleSetFilenameSplit,
  };
}
