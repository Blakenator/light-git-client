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
      fromNumLines: hunk.fromNumLines || 0,
      toNumLines: hunk.toNumLines || 0,
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

// Stable default to avoid new-ref re-renders when currentDiff[repoPath] is undefined
const _EMPTY_DIFF: any[] = [];

// Module-level state shared between ALL useDiffFileActions instances.
// This ensures the auto-refresh guard in CommitHistoryCard can see fetches
// initiated from StagedChangesCard/UnstagedChangesCard file clicks.
let _diffFetchInProgress = false;

// Monotonically increasing version counter used to discard stale diff
// responses. Each call to fetchDiffPage increments the counter; when
// the async response arrives the counter is checked and the result is
// only applied when it still matches the latest request.
let _diffFetchVersion = 0;

/**
 * Lightweight hook providing only file-click and refresh actions.
 * Does NOT subscribe to diff display state (showDiff, currentDiff, etc.)
 * and does NOT register auto-refresh effects.
 *
 * Use in StagedChangesCard / UnstagedChangesCard where only the action
 * functions are needed.
 */
export function useDiffFileActions(repoPath: string) {
  const gitService = useGitService(repoPath);
  const addAlert = useUiStore((state) => state.addAlert);

  // Store reference (stable)
  const store = useRepoViewStore;

  // Fetch a single page of file diffs
  const fetchDiffPage = useCallback(async (
    unstagedFiles: string[],
    stagedFiles: string[],
    cursor: string | null,
    append: boolean,
  ) => {
    // Capture a version token so we can discard stale responses when a
    // newer fetchDiffPage call has been initiated in the meantime.
    const version = ++_diffFetchVersion;
    _diffFetchInProgress = true;
    try {
      const diffResponse = await gitService.getFileDiff(unstagedFiles, stagedFiles, cursor) as any;

      // A newer fetch was started while we were waiting — discard this result.
      if (version !== _diffFetchVersion) return;

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
      // Only surface the error if this is still the latest request
      if (version === _diffFetchVersion) {
        addAlert(`Failed to show file: ${error.message}`, 'error');
      }
    } finally {
      // Only clear the in-progress flag for the latest request
      if (version === _diffFetchVersion) {
        _diffFetchInProgress = false;
      }
    }
  }, [gitService, addAlert, repoPath, store]);

  // Start fetching diffs for given files (resets pagination)
  const fetchDiffForFiles = useCallback(async (unstagedFiles: string[], stagedFiles: string[]) => {
    store.getState().setCurrentDiffFiles(repoPath, { unstaged: unstagedFiles, staged: stagedFiles });
    await fetchDiffPage(unstagedFiles, stagedFiles, null, false);
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
      // Read cache imperatively to avoid subscribing to store in this hook
      const current = useRepositoryStore.getState().getCacheFor(repoPath);
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
  }, [fetchDiffForFiles, repoPath]);

  return {
    fetchDiffPage,
    fetchDiffForFiles,
    handleFileClick,
    refreshSelectedFilesDiff,
  };
}

/**
 * Full diff viewing hook: fetching, pagination, toggling, auto-refresh.
 * Subscribes to diff display state from repoViewStore.
 *
 * Use ONLY in CommitHistoryCard (or similar) where the diff display
 * state and auto-refresh logic are actually needed.
 */
export function useDiffActions(repoPath: string) {
  const gitService = useGitService(repoPath);
  const addAlert = useUiStore((state) => state.addAlert);

  const {
    fetchDiffPage,
    fetchDiffForFiles,
    handleFileClick,
    refreshSelectedFilesDiff,
  } = useDiffFileActions(repoPath);

  // Subscribe to store state — only needed by the diff *viewer*
  const showDiff = useRepoViewStore((state) => state.showDiff[repoPath] || false);
  const currentDiff = useRepoViewStore((state) => state.currentDiff[repoPath]) ?? _EMPTY_DIFF;
  const commitInfo = useRepoViewStore((state) => state.commitInfo[repoPath] || null);
  const hasMoreDiffs = useRepoViewStore((state) => state.hasMoreDiffs[repoPath] || false);
  const isLoadingMoreDiffs = useRepoViewStore((state) => state.isLoadingMoreDiffs[repoPath] || false);

  // Store actions (stable references from zustand)
  const store = useRepoViewStore;

  // Derive content-based keys INSIDE the selector so Zustand returns a
  // stable string.  This avoids re-rendering CommitHistoryCard on every
  // repo poll (polls create new array references even when content is identical).
  const stagedKey = useRepositoryStore((state) => {
    const arr = state.repoCache[repoPath]?.changes?.stagedChanges;
    if (!arr || arr.length === 0) return '';
    return arr.map((c: any) => `${c.file || c.path}:${c.change || c.status}`).join(',');
  });
  const unstagedKey = useRepositoryStore((state) => {
    const arr = state.repoCache[repoPath]?.changes?.unstagedChanges;
    if (!arr || arr.length === 0) return '';
    return arr.map((c: any) => `${c.file || c.path}:${c.change || c.status}`).join(',');
  });

  // Track whether ANY files are truly selected (value=true).  When this
  // flips from true → false (user deselects the last file) the auto-refresh
  // effect fires and refreshSelectedFilesDiff falls into its "show all" branch.
  const hasAnySelected = useRepositoryStore((state) => {
    const cache = state.repoCache[repoPath];
    const staged = cache?.selectedStagedChanges;
    const unstaged = cache?.selectedUnstagedChanges;
    if (staged) { for (const v of Object.values(staged)) { if (v) return true; } }
    if (unstaged) { for (const v of Object.values(unstaged)) { if (v) return true; } }
    return false;
  });

  const commitInfoRef = useRef(commitInfo);
  commitInfoRef.current = commitInfo;
  const showDiffRef = useRef(showDiff);
  showDiffRef.current = showDiff;

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

  const handleToggleDiffView = useCallback((show: boolean) => {
    store.getState().setShowDiff(repoPath, show);
    if (show && !commitInfoRef.current) {
      const current = useRepositoryStore.getState().repoCache[repoPath];
      refreshSelectedFilesDiff(
        current?.selectedStagedChanges || {},
        current?.selectedUnstagedChanges || {},
      );
    }
  }, [refreshSelectedFilesDiff, repoPath, store]);

  const handleExitDiffView = useCallback(() => {
    store.getState().resetDiffState(repoPath);
  }, [repoPath, store]);

  const handleIgnoreWhitespaceChange = useCallback(async (value: boolean) => {
    const updateSettings = useSettingsStore.getState().updateSettings;
    const saveSettings = useSettingsStore.getState().saveSettings;
    updateSettings({ diffIgnoreWhitespace: value });
    await saveSettings();

    // Refresh the current diff with the new whitespace setting
    if (!showDiffRef.current) return;

    if (commitInfoRef.current) {
      // Re-fetch commit diff
      const hash = commitInfoRef.current.hash;
      if (hash) {
        try {
          const diffResponse = await gitService.getCommitDiff(hash) as any;
          const diff = Array.isArray(diffResponse) ? diffResponse : (diffResponse?.content || []);
          store.getState().setCurrentDiff(repoPath, normalizeDiff(diff || []));
        } catch (error: any) {
          addAlert(`Failed to refresh diff: ${error.message}`, 'error');
        }
      }
    } else {
      // Re-fetch file diff
      const current = useRepositoryStore.getState().repoCache[repoPath];
      refreshDiffRef.current(
        current?.selectedStagedChanges || {},
        current?.selectedUnstagedChanges || {},
      );
    }
  }, [gitService, repoPath, store, addAlert]);

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
  // This effect only runs in the ONE component that uses useDiffActions (CommitHistoryCard)
  //
  // The stagedKey / unstagedKey selectors above already derive stable
  // content-based strings so neither this hook nor CommitHistoryCard
  // re-render on every repo poll.
  // We use a ref for the callback so the effect ONLY depends on the
  // content keys, not on callback reference stability.

  // Use ref so the effect closure always calls the latest version
  // without needing refreshSelectedFilesDiff as a dependency
  const refreshDiffRef = useRef(refreshSelectedFilesDiff);
  refreshDiffRef.current = refreshSelectedFilesDiff;

  // Skip the initial mount — only react to actual changes after first render
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    // Don't auto-refresh while ANY diff fetch is in flight
    if (_diffFetchInProgress) return;
    if (showDiffRef.current && !commitInfoRef.current) {
      const current = useRepositoryStore.getState().repoCache[repoPath];
      refreshDiffRef.current(
        current?.selectedStagedChanges || {},
        current?.selectedUnstagedChanges || {},
      );
    }
    // Fire when file list content changes OR when selection empties/fills
    // (e.g. user deselects the last file → hasAnySelected becomes false →
    // refreshSelectedFilesDiff falls into its "show all" branch).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagedKey, unstagedKey, hasAnySelected]);

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
