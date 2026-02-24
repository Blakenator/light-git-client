import { DiffHeaderModel } from './git/diff.header.model';
import { DiffHunkModel } from './git/diff.hunk.model';
import { LineState } from './git/diff.line.model';
import { CodeWatcherModel } from './code-watcher.model';

export interface WatcherAlertWatcher {
  name: string;
  regex: string;
  message?: string;
  severity?: string;
}

export interface WatcherAlertHunk {
  hunk: DiffHunkModel;
  watchers: WatcherAlertWatcher[];
  matchingLines: number[];
}

export interface WatcherAlert {
  file: string;
  hunks: WatcherAlertHunk[];
}

function getHunkCode(hunk: DiffHunkModel, includeUnchanged: boolean): string {
  if (!hunk?.lines) return '';
  return hunk.lines
    .filter((line) => {
      if (includeUnchanged) {
        return line.state !== LineState.REMOVED;
      }
      return line.state === LineState.ADDED;
    })
    .map((l) => l.text || '')
    .join('\n');
}

function getWatchersForHunk(
  hunk: DiffHunkModel,
  watchers: CodeWatcherModel[],
  filename: string,
  includeUnchanged: boolean,
): CodeWatcherModel[] {
  const code = getHunkCode(hunk, includeUnchanged);
  return watchers.filter((w) => {
    try {
      const fileMatches = !w.activeFilter || filename.match(new RegExp(w.activeFilter));
      const codeMatches = code.match(new RegExp(w.regex, w.regexFlags));
      return fileMatches && codeMatches;
    } catch {
      return false;
    }
  });
}

function getMatchingLines(hunk: DiffHunkModel, watchers: CodeWatcherModel[]): number[] {
  if (!hunk?.lines || watchers.length === 0) return [];
  const matchingLines: number[] = [];
  for (const line of hunk.lines) {
    if (line.state === LineState.REMOVED) continue;
    const lineText = line.text || '';
    for (const w of watchers) {
      try {
        if (lineText.match(new RegExp(w.regex, w.regexFlags))) {
          matchingLines.push(line.toLineNumber);
          break;
        }
      } catch {
        // skip invalid regex
      }
    }
  }
  return matchingLines;
}

/**
 * Analyze diff headers against enabled code watchers.
 * Returns alerts grouped by file, containing only hunks with matches.
 */
export function analyzeWatchersOnDiffs(
  diffHeaders: DiffHeaderModel[],
  watchers: CodeWatcherModel[],
  includeUnchanged: boolean,
): WatcherAlert[] {
  const enabledWatchers = watchers.filter((w) => w.enabled && w.regex);
  if (enabledWatchers.length === 0) return [];

  return diffHeaders
    .map((header) => {
      const filename = header.toFilename || '';
      const hunks: WatcherAlertHunk[] = (header.hunks || [])
        .map((hunk) => {
          const matched = getWatchersForHunk(hunk, enabledWatchers, filename, includeUnchanged);
          if (matched.length === 0) return null;
          return {
            hunk,
            watchers: matched.map((w) => ({
              name: w.name,
              regex: w.regex,
            })),
            matchingLines: getMatchingLines(hunk, matched),
          };
        })
        .filter((h): h is WatcherAlertHunk => h !== null);

      if (hunks.length === 0) return null;
      return { file: filename, hunks };
    })
    .filter((a): a is WatcherAlert => a !== null);
}
