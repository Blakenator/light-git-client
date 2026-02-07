import { useCallback, useEffect, useRef } from 'react';
import { useRepositoryStore, useUiStore, useSettingsStore } from '../../../stores';
import { useRepoViewStore } from '../../../stores/repoViewStore';
import { useGitService } from '../../../ipc';

/**
 * Normalize diff data from backend format to frontend format.
 * Pure function, no hooks needed.
 */
export function normalizeDiff(diffHeaders: any[]): any[] {
  if (!diffHeaders || !Array.isArray(diffHeaders)) return [];

  return diffHeaders.map((header: any) => {
    const normalizedHunks = (header.hunks || []).map((hunk: any) => ({
      header: hunk.header || `@@ -${hunk.fromStartLine},${hunk.fromNumLines} +${hunk.toStartLine},${hunk.toNumLines} @@`,
      fromStartLine: hunk.fromStartLine || 0,
      toStartLine: hunk.toStartLine || 0,
      lines: (hunk.lines || []).map((line: any) => {
        let state = 'unchanged';
        if (line.state === 0 || line.state === 'ADDED' || line.state === 'added') {
          state = 'added';
        } else if (line.state === 1 || line.state === 'REMOVED' || line.state === 'removed') {
          state = 'removed';
        }

        return {
          text: line.text || '',
          state,
          oldLineNumber: line.fromLineNumber ?? line.oldLineNumber,
          newLineNumber: line.toLineNumber ?? line.newLineNumber,
        };
      }),
    }));

    let additions = header.additions || 0;
    let deletions = header.deletions || 0;

    if (additions === 0 && deletions === 0 && normalizedHunks.length > 0) {
      normalizedHunks.forEach((hunk: any) => {
        (hunk.lines || []).forEach((line: any) => {
          if (line.state === 'added') additions++;
          else if (line.state === 'removed') deletions++;
        });
      });
    }

    return {
      fromFilename: header.fromFilename || '',
      toFilename: header.toFilename || '',
      additions,
      deletions,
      action: header.action,
      stagedState: header.stagedState,
      hunks: normalizedHunks,
    };
  });
}

/**
 * Hook providing diff viewing actions: fetching, pagination, toggling.
 * Reads/writes to repoViewStore for shared diff state.
 */
export function useDiffActions(repoPath: string) {
  const gitService = useGitService(repoPath);
  const addAlert = useUiStore((state) => state.addAlert);

  // Subscribe to store state
  const showDiff = useRepoViewStore((state) => state.showDiff[repoPath] || false);
  const currentDiff = useRepoViewStore((state) => state.currentDiff[repoPath] || []);
  const commitInfo = useRepoViewStore((state) => state.commitInfo[repoPath] || null);
  const diffCursor = useRepoViewStore((state) => state.diffCursor[repoPath] ?? null);
  const hasMoreDiffs = useRepoViewStore((state) => state.hasMoreDiffs[repoPath] || false);
  const isLoadingMoreDiffs = useRepoViewStore((state) => state.isLoadingMoreDiffs[repoPath] || false);

  // Store actions (stable references from zustand)
  const store = useRepoViewStore;

  // Refs for values callbacks read at call time
  const repoCache = useRepositoryStore((state) => state.getCacheFor(repoPath));
  const repoCacheRef = useRef(repoCache);
  repoCacheRef.current = repoCache;
  const commitInfoRef = useRef(commitInfo);
  commitInfoRef.current = commitInfo;
  const showDiffRef = useRef(showDiff);
  showDiffRef.current = showDiff;

  // Fetch a single page of file diffs
  const fetchDiffPage = useCallback(async (
    unstagedFiles: string[],
    stagedFiles: string[],
    cursor: string | null,
    append: boolean,
  ) => {
    try {
      const diffResponse = await gitService.getFileDiff(unstagedFiles, stagedFiles, cursor) as any;
      const content = diffResponse?.content ?? diffResponse;
      const items = content?.items ?? (Array.isArray(content) ? content : []);
      const normalized = normalizeDiff(Array.isArray(items) ? items : []);

      if (append) {
        store.getState().appendDiffs(repoPath, normalized);
      } else {
        store.getState().setCurrentDiff(repoPath, normalized);
      }

      store.getState().setDiffCursor(repoPath, content?.nextCursor ?? null);
      store.getState().setHasMoreDiffs(repoPath, content?.hasMore ?? false);
      store.getState().setCommitInfo(repoPath, null); // Not a commit diff
      store.getState().setShowDiff(repoPath, true);
    } catch (error: any) {
      addAlert(`Failed to show file: ${error.message}`, 'error');
    }
  }, [gitService, addAlert, repoPath, store]);

  // Start fetching diffs for given files (resets pagination)
  const fetchDiffForFiles = useCallback(async (unstagedFiles: string[], stagedFiles: string[]) => {
    store.getState().setCurrentDiffFiles(repoPath, { unstaged: unstagedFiles, staged: stagedFiles });
    await fetchDiffPage(unstagedFiles, stagedFiles, null, false);
  }, [fetchDiffPage, repoPath, store]);

  // Load the next page of file diffs
  const loadMoreDiffs = useCallback(async () => {
    const state = store.getState();
    const cursor = state.getDiffCursor(repoPath);
    const hasMore = state.getHasMoreDiffs(repoPath);
    const isLoading = state.getIsLoadingMoreDiffs(repoPath);
    if (!hasMore || isLoading || !cursor) return;
    state.setIsLoadingMoreDiffs(repoPath, true);
    try {
      const files = state.getCurrentDiffFiles(repoPath);
      await fetchDiffPage(files.unstaged, files.staged, cursor, true);
    } finally {
      store.getState().setIsLoadingMoreDiffs(repoPath, false);
    }
  }, [fetchDiffPage, repoPath, store]);

  // Handler for clicking on staged/unstaged file changes
  const handleFileClick = useCallback(async (filePath: string, isStaged: boolean) => {
    await fetchDiffForFiles(
      isStaged ? [] : [filePath],
      isStaged ? [filePath] : []
    );
  }, [fetchDiffForFiles]);

  // Collect all selected file paths and fetch diffs for them
  const refreshSelectedFilesDiff = useCallback(async (
    selectedStaged: Record<string, boolean>,
    selectedUnstaged: Record<string, boolean>
  ) => {
    const stagedFiles = Object.entries(selectedStaged)
      .filter(([_, selected]) => selected)
      .map(([file]) => file.replace(/.*?->\s*/, ''));
    const unstagedFiles = Object.entries(selectedUnstaged)
      .filter(([_, selected]) => selected)
      .map(([file]) => file.replace(/.*?->\s*/, ''));

    if (stagedFiles.length > 0 || unstagedFiles.length > 0) {
      await fetchDiffForFiles(unstagedFiles, stagedFiles);
    } else {
      const current = repoCacheRef.current;
      const allStaged = (current?.changes?.stagedChanges || [])
        .map((c: any) => (c.path || c.file || '').replace(/.*?->\s*/, ''))
        .filter(Boolean);
      const allUnstaged = (current?.changes?.unstagedChanges || [])
        .map((c: any) => (c.path || c.file || '').replace(/.*?->\s*/, ''))
        .filter(Boolean);
      if (allStaged.length > 0 || allUnstaged.length > 0) {
        await fetchDiffForFiles(allUnstaged, allStaged);
      }
    }
  }, [fetchDiffForFiles]);

  const handleToggleDiffView = useCallback((show: boolean) => {
    store.getState().setShowDiff(repoPath, show);
    if (show && !commitInfoRef.current) {
      const current = repoCacheRef.current;
      refreshSelectedFilesDiff(
        current?.selectedStagedChanges || {},
        current?.selectedUnstagedChanges || {},
      );
    }
  }, [refreshSelectedFilesDiff, repoPath, store]);

  const handleExitDiffView = useCallback(() => {
    store.getState().resetDiffState(repoPath);
  }, [repoPath, store]);

  const handleIgnoreWhitespaceChange = useCallback((value: boolean) => {
    const updateSettings = useSettingsStore.getState().updateSettings;
    const saveSettings = useSettingsStore.getState().saveSettings;
    updateSettings({ diffIgnoreWhitespace: value });
    saveSettings();
  }, []);

  // Hunk editing handlers
  const handleHunkChange = useCallback(async (filename: string, hunk: any, newContent: string) => {
    try {
      await gitService.changeHunk(filename, hunk, newContent);
    } catch (error: any) {
      throw error;
    }
  }, [gitService]);

  const handleHunkChangeError = useCallback((error: Error) => {
    addAlert(`Failed to modify hunk: ${error.message}`, 'error');
  }, [addAlert]);

  // Auto-refresh diff when file change lists update
  const stagedChanges = repoCache?.changes?.stagedChanges;
  const unstagedChanges = repoCache?.changes?.unstagedChanges;

  useEffect(() => {
    if (showDiffRef.current && !commitInfoRef.current) {
      const current = repoCacheRef.current;
      refreshSelectedFilesDiff(
        current?.selectedStagedChanges || {},
        current?.selectedUnstagedChanges || {},
      );
    }
  }, [stagedChanges, unstagedChanges, refreshSelectedFilesDiff]);

  return {
    showDiff,
    currentDiff,
    commitInfo,
    hasMoreDiffs,
    isLoadingMoreDiffs,
    fetchDiffForFiles,
    loadMoreDiffs,
    handleFileClick,
    refreshSelectedFilesDiff,
    handleToggleDiffView,
    handleExitDiffView,
    handleIgnoreWhitespaceChange,
    handleHunkChange,
    handleHunkChangeError,
  };
}
