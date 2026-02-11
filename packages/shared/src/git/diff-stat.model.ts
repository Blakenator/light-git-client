/**
 * Per-file diff stat from `git diff --numstat`.
 */
export interface FileDiffStat {
  file: string;
  additions: number;
  deletions: number;
  isBinary: boolean;
}

/**
 * Aggregated diff stats for an entire set of staged + unstaged files.
 * Individual file stats are separated by staged state so consumers
 * can look up stats per-file in the correct context.
 */
export interface DiffStatsResult {
  staged: FileDiffStat[];
  unstaged: FileDiffStat[];
  totalAdditions: number;
  totalDeletions: number;
  totalFiles: number;
}
