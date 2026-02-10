import { useCallback, useRef, useState } from 'react';
import { useSettingsStore, useUiStore } from '../../../stores';
import { useGitService } from '../../../ipc';
import { useRepositoryStore } from '../../../stores';

/** Imperative read of repo cache (no subscription, no re-renders). */
const getRepoCache = (repoPath: string) => useRepositoryStore.getState().repoCache[repoPath];

/**
 * Normalizes a watcher from either the shared CodeWatcherModel (regex/regexFlags/activeFilter)
 * or the React settings model (pattern/flags/filePattern) into a common shape.
 */
function normalizeWatcher(w: any): {
  name: string;
  regex: string;
  flags: string;
  filePattern: string;
  enabled: boolean;
  message?: string;
} {
  return {
    name: w.name || '',
    regex: w.regex || w.pattern || '',
    flags: w.regexFlags || w.flags || 'g',
    filePattern: w.activeFilter || w.filePattern || '',
    enabled: w.enabled !== false && w.disabled !== true,
    message: w.message,
  };
}

export interface WatcherAlert {
  file: string;
  hunks: {
    hunk: any;
    watchers: { name: string; regex: string; message?: string; severity?: string }[];
    matchingLines?: number[];
  }[];
}

/**
 * Hook providing code watcher analysis.
 * Scans diff hunks against user-configured regex patterns to surface alerts.
 */
export function useCodeWatcherAnalysis(repoPath: string) {
  const gitService = useGitService(repoPath);
  const addAlert = useUiStore((state) => state.addAlert);
  const showModal = useUiStore((state) => state.showModal);

  const [watcherAlerts, setWatcherAlerts] = useState<WatcherAlert[]>([]);

  const settingsRef = useRef(useSettingsStore.getState().settings);
  // Keep ref fresh without re-renders
  settingsRef.current = useSettingsStore.getState().settings;

  /**
   * Extract text from a hunk's lines for pattern matching.
   * Respects the includeUnchangedInWatcherAnalysis setting.
   */
  const getHunkCode = useCallback((hunk: any, includeUnchanged: boolean): string => {
    if (!hunk?.lines) return '';
    return hunk.lines
      .filter((line: any) => {
        if (includeUnchanged) {
          // Include added and unchanged lines, exclude removed
          const state = line.state;
          return state !== 1 && state !== 'REMOVED' && state !== 'removed';
        }
        // Only include added lines
        const state = line.state;
        return state === 0 || state === 'ADDED' || state === 'added';
      })
      .map((l: any) => l.text || '')
      .join('\n');
  }, []);

  /**
   * Find which watchers match a given hunk.
   */
  const getWatchersForHunk = useCallback((
    hunk: any,
    watchers: ReturnType<typeof normalizeWatcher>[],
    filename: string,
    includeUnchanged: boolean,
  ) => {
    const code = getHunkCode(hunk, includeUnchanged);
    return watchers.filter((w) => {
      try {
        const fileMatches = !w.filePattern || filename.match(new RegExp(w.filePattern));
        const codeMatches = code.match(new RegExp(w.regex, w.flags));
        return fileMatches && codeMatches;
      } catch {
        return false;
      }
    });
  }, [getHunkCode]);

  /**
   * Get matching line numbers within a hunk for a set of watchers.
   */
  const getMatchingLines = useCallback((hunk: any, watchers: ReturnType<typeof normalizeWatcher>[]) => {
    if (!hunk?.lines || watchers.length === 0) return [];
    const matchingLines: number[] = [];
    hunk.lines.forEach((line: any, index: number) => {
      const lineText = line.text || '';
      for (const w of watchers) {
        try {
          if (lineText.match(new RegExp(w.regex, w.flags))) {
            matchingLines.push((hunk.toStartLine || 0) + index);
            break;
          }
        } catch {
          // skip invalid regex
        }
      }
    });
    return matchingLines;
  }, []);

  /**
   * Analyze diff headers against enabled watchers.
   * Returns an array of alerts grouped by file.
   */
  const analyzeWatchers = useCallback((diffHeaders: any[]): WatcherAlert[] => {
    const settings = settingsRef.current;
    // Merge user watchers and loaded watchers, normalize, filter enabled
    const allWatchers = [
      ...(settings.loadedCodeWatchers || []),
      ...(settings.codeWatchers || []),
    ]
      .map(normalizeWatcher)
      .filter((w) => w.enabled && w.regex);

    if (allWatchers.length === 0) return [];

    const includeUnchanged = settings.includeUnchangedInWatcherAnalysis;

    return diffHeaders
      .map((header) => {
        const filename = header.toFilename || '';
        const hunks = (header.hunks || [])
          .map((hunk: any) => {
            const matched = getWatchersForHunk(hunk, allWatchers, filename, includeUnchanged);
            return {
              hunk,
              watchers: matched.map((w) => ({
                name: w.name,
                regex: w.regex,
                message: w.message,
              })),
              matchingLines: getMatchingLines(hunk, matched),
            };
          })
          .filter((h: any) => h.watchers.length > 0);

        return { file: filename, hunks };
      })
      .filter((a) => a.hunks.length > 0);
  }, [getWatchersForHunk, getMatchingLines]);

  /**
   * Check staged changes for watcher alerts.
   * Returns the alerts array (also stored in state).
   */
  const checkWatcherAlerts = useCallback(async (): Promise<WatcherAlert[]> => {
    const settings = settingsRef.current;
    const allWatchers = [
      ...(settings.loadedCodeWatchers || []),
      ...(settings.codeWatchers || []),
    ].map(normalizeWatcher).filter((w) => w.enabled && w.regex);

    if (allWatchers.length === 0) {
      setWatcherAlerts([]);
      return [];
    }

    try {
      // Get the staged files from the repo cache
      const stagedChanges = getRepoCache(repoPath)?.changes?.stagedChanges || [];
      if (stagedChanges.length === 0) {
        setWatcherAlerts([]);
        return [];
      }

      const stagedFiles = stagedChanges.map((c: any) => c.file);
      const diffResponse = await gitService.getFileDiff([], stagedFiles);

      // Extract diff headers from the response
      const diffHeaders = Array.isArray(diffResponse)
        ? diffResponse
        : (diffResponse as any)?.content?.items || (diffResponse as any)?.content || [];

      const alerts = analyzeWatchers(diffHeaders);
      setWatcherAlerts(alerts);
      return alerts;
    } catch (error: any) {
      console.error('Code watcher analysis failed:', error);
      setWatcherAlerts([]);
      return [];
    }
  }, [gitService, analyzeWatchers]);

  /**
   * Run watcher analysis and show the modal if alerts are found.
   * Called manually from the UI button.
   */
  const showWatcherAlerts = useCallback(async () => {
    const alerts = await checkWatcherAlerts();
    if (alerts.length > 0) {
      showModal('codeWatcher');
    } else {
      addAlert('No code watcher alerts found', 'info');
    }
  }, [checkWatcherAlerts, showModal, addAlert]);

  return {
    watcherAlerts,
    checkWatcherAlerts,
    showWatcherAlerts,
    analyzeWatchers,
  };
}
