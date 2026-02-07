import { create } from 'zustand';
import type { ActiveOperation } from '@light-git/shared';

export interface RepoViewState {
  // Diff state per repo
  showDiff: { [repoPath: string]: boolean };
  currentDiff: { [repoPath: string]: any[] };
  commitInfo: { [repoPath: string]: any };
  diffCursor: { [repoPath: string]: string | null };
  hasMoreDiffs: { [repoPath: string]: boolean };
  isLoadingMoreDiffs: { [repoPath: string]: boolean };
  // Files currently being diffed (for pagination)
  currentDiffFiles: { [repoPath: string]: { unstaged: string[]; staged: string[] } };

  // Commit message per repo
  commitMessage: { [repoPath: string]: string };

  // Active operation per repo
  activeOperation: { [repoPath: string]: ActiveOperation | null };

  // Command history per repo
  commandHistory: { [repoPath: string]: any[] };

  // Active branch filter per repo (for commit history)
  activeBranch: { [repoPath: string]: any };
}

export interface RepoViewActions {
  // Diff actions
  getShowDiff: (repoPath: string) => boolean;
  setShowDiff: (repoPath: string, show: boolean) => void;
  getCurrentDiff: (repoPath: string) => any[];
  setCurrentDiff: (repoPath: string, diff: any[]) => void;
  appendDiffs: (repoPath: string, diffs: any[]) => void;
  getCommitInfo: (repoPath: string) => any;
  setCommitInfo: (repoPath: string, info: any) => void;
  getDiffCursor: (repoPath: string) => string | null;
  setDiffCursor: (repoPath: string, cursor: string | null) => void;
  getHasMoreDiffs: (repoPath: string) => boolean;
  setHasMoreDiffs: (repoPath: string, hasMore: boolean) => void;
  getIsLoadingMoreDiffs: (repoPath: string) => boolean;
  setIsLoadingMoreDiffs: (repoPath: string, loading: boolean) => void;
  getCurrentDiffFiles: (repoPath: string) => { unstaged: string[]; staged: string[] };
  setCurrentDiffFiles: (repoPath: string, files: { unstaged: string[]; staged: string[] }) => void;
  resetDiffState: (repoPath: string) => void;

  // Commit message actions
  getCommitMessage: (repoPath: string) => string;
  setCommitMessage: (repoPath: string, message: string) => void;

  // Active operation actions
  getActiveOperation: (repoPath: string) => ActiveOperation | null;
  setActiveOperation: (repoPath: string, operation: ActiveOperation | null) => void;

  // Command history actions
  getCommandHistory: (repoPath: string) => any[];
  setCommandHistory: (repoPath: string, history: any[]) => void;

  // Active branch actions
  getActiveBranch: (repoPath: string) => any;
  setActiveBranch: (repoPath: string, branch: any) => void;
}

export const useRepoViewStore = create<RepoViewState & RepoViewActions>((set, get) => ({
  // Initial state
  showDiff: {},
  currentDiff: {},
  commitInfo: {},
  diffCursor: {},
  hasMoreDiffs: {},
  isLoadingMoreDiffs: {},
  currentDiffFiles: {},
  commitMessage: {},
  activeOperation: {},
  commandHistory: {},
  activeBranch: {},

  // Diff actions
  getShowDiff: (repoPath) => get().showDiff[repoPath] || false,
  setShowDiff: (repoPath, show) => {
    set((state) => ({ showDiff: { ...state.showDiff, [repoPath]: show } }));
  },
  getCurrentDiff: (repoPath) => get().currentDiff[repoPath] || [],
  setCurrentDiff: (repoPath, diff) => {
    set((state) => ({ currentDiff: { ...state.currentDiff, [repoPath]: diff } }));
  },
  appendDiffs: (repoPath, diffs) => {
    set((state) => ({
      currentDiff: {
        ...state.currentDiff,
        [repoPath]: [...(state.currentDiff[repoPath] || []), ...diffs],
      },
    }));
  },
  getCommitInfo: (repoPath) => get().commitInfo[repoPath] || null,
  setCommitInfo: (repoPath, info) => {
    set((state) => ({ commitInfo: { ...state.commitInfo, [repoPath]: info } }));
  },
  getDiffCursor: (repoPath) => get().diffCursor[repoPath] ?? null,
  setDiffCursor: (repoPath, cursor) => {
    set((state) => ({ diffCursor: { ...state.diffCursor, [repoPath]: cursor } }));
  },
  getHasMoreDiffs: (repoPath) => get().hasMoreDiffs[repoPath] || false,
  setHasMoreDiffs: (repoPath, hasMore) => {
    set((state) => ({ hasMoreDiffs: { ...state.hasMoreDiffs, [repoPath]: hasMore } }));
  },
  getIsLoadingMoreDiffs: (repoPath) => get().isLoadingMoreDiffs[repoPath] || false,
  setIsLoadingMoreDiffs: (repoPath, loading) => {
    set((state) => ({ isLoadingMoreDiffs: { ...state.isLoadingMoreDiffs, [repoPath]: loading } }));
  },
  getCurrentDiffFiles: (repoPath) => get().currentDiffFiles[repoPath] || { unstaged: [], staged: [] },
  setCurrentDiffFiles: (repoPath, files) => {
    set((state) => ({ currentDiffFiles: { ...state.currentDiffFiles, [repoPath]: files } }));
  },
  resetDiffState: (repoPath) => {
    set((state) => ({
      showDiff: { ...state.showDiff, [repoPath]: false },
      currentDiff: { ...state.currentDiff, [repoPath]: [] },
      commitInfo: { ...state.commitInfo, [repoPath]: null },
      diffCursor: { ...state.diffCursor, [repoPath]: null },
      hasMoreDiffs: { ...state.hasMoreDiffs, [repoPath]: false },
      isLoadingMoreDiffs: { ...state.isLoadingMoreDiffs, [repoPath]: false },
      currentDiffFiles: { ...state.currentDiffFiles, [repoPath]: { unstaged: [], staged: [] } },
    }));
  },

  // Commit message actions
  getCommitMessage: (repoPath) => get().commitMessage[repoPath] || '',
  setCommitMessage: (repoPath, message) => {
    set((state) => ({ commitMessage: { ...state.commitMessage, [repoPath]: message } }));
  },

  // Active operation actions
  getActiveOperation: (repoPath) => get().activeOperation[repoPath] || null,
  setActiveOperation: (repoPath, operation) => {
    set((state) => ({ activeOperation: { ...state.activeOperation, [repoPath]: operation } }));
  },

  // Command history actions
  getCommandHistory: (repoPath) => get().commandHistory[repoPath] || [],
  setCommandHistory: (repoPath, history) => {
    set((state) => ({ commandHistory: { ...state.commandHistory, [repoPath]: history } }));
  },

  // Active branch actions
  getActiveBranch: (repoPath) => get().activeBranch[repoPath] || null,
  setActiveBranch: (repoPath, branch) => {
    set((state) => ({ activeBranch: { ...state.activeBranch, [repoPath]: branch } }));
  },
}));
