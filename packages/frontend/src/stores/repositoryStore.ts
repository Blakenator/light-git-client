import { create } from 'zustand';
import type { RepositoryModel } from '@light-git/shared';
import type { BranchModel } from '@light-git/shared';

export interface ITabInfo {
  name: string;
  path: string;
}

export interface RepoMetadata {
  commitHistoryActiveBranch?: BranchModel;
  selectedUnstagedChanges: { [key: string]: boolean };
  selectedStagedChanges: { [key: string]: boolean };
}

export type RepoCacheEntry = RepositoryModel & RepoMetadata;

interface RepositoryState {
  // Tab management
  tabs: ITabInfo[];
  activeTabIndex: number;
  
  // Repository cache (keyed by path)
  repoCache: { [path: string]: RepoCacheEntry };
  
  // Branch maps (keyed by repo path)
  localBranchMap: Map<string, Map<string, BranchModel>>;
  remoteBranchMap: Map<string, Map<string, BranchModel>>;
  currentBranchMap: Map<string, BranchModel>;
  
  // Initialization flag
  isInitialized: boolean;
}

interface RepositoryActions {
  // Tab actions
  setActiveTabIndex: (index: number) => void;
  addTab: (tab: ITabInfo) => void;
  removeTab: (index: number) => void;
  updateTabName: (index: number, name: string) => void;
  setActiveTabData: (path: string, name?: string) => void;
  moveTab: (fromIndex: number, toIndex: number) => void;
  
  // Cache actions
  initializeCache: (tabs: ITabInfo[]) => void;
  initializeCacheForPath: (path: string) => void;
  updateRepoCache: (path: string, data: Partial<RepoCacheEntry>) => void;
  getCacheFor: (path: string) => RepoCacheEntry | undefined;
  
  // Branch map actions
  updateLocalBranchMap: (path: string, branches: BranchModel[]) => void;
  updateRemoteBranchMap: (path: string, branches: BranchModel[]) => void;
  
  // Getters
  getActiveTab: () => ITabInfo;
  getActiveRepoCache: () => RepoCacheEntry | undefined;
  getCurrentBranch: (path?: string) => BranchModel | undefined;
  getLocalBranchMap: (path?: string) => Map<string, BranchModel>;
  getRemoteBranchMap: (path?: string) => Map<string, BranchModel>;
}

const basename = (folderPath: string): string => {
  return folderPath.substring(
    folderPath.replace(/\\/g, '/').lastIndexOf('/') + 1
  );
};

const createEmptyRepoCache = (path: string): RepoCacheEntry => ({
  path,
  remotes: [],
  remoteBranches: [],
  localBranches: [],
  worktrees: [],
  stashes: [],
  submodules: [],
  commitHistory: [],
  diff: [],
  changes: {
    stagedChanges: [],
    unstagedChanges: [],
    description: '',
  },
  selectedUnstagedChanges: {},
  selectedStagedChanges: {},
} as RepoCacheEntry);

export const useRepositoryStore = create<RepositoryState & RepositoryActions>((set, get) => ({
  // Initial state
  tabs: [{ name: '', path: '' }],
  activeTabIndex: 0,
  repoCache: {},
  localBranchMap: new Map(),
  remoteBranchMap: new Map(),
  currentBranchMap: new Map(),
  isInitialized: false,

  // Tab actions
  setActiveTabIndex: (index) => {
    set({ activeTabIndex: Math.max(0, index) });
  },

  addTab: (tab) => {
    set((state) => ({
      tabs: [...state.tabs, tab],
    }));
  },

  removeTab: (index) => {
    set((state) => {
      const newTabs = state.tabs.filter((_, i) => i !== index);
      const newActiveIndex = Math.min(state.activeTabIndex, newTabs.length - 1);
      return {
        tabs: newTabs.length > 0 ? newTabs : [{ name: '', path: '' }],
        activeTabIndex: Math.max(0, newActiveIndex),
      };
    });
  },

  updateTabName: (index, name) => {
    set((state) => {
      const newTabs = [...state.tabs];
      if (newTabs[index]) {
        newTabs[index] = { ...newTabs[index], name };
      }
      return { tabs: newTabs };
    });
  },

  setActiveTabData: (path, name) => {
    set((state) => {
      const newTabs = [...state.tabs];
      const activeTab = newTabs[state.activeTabIndex];
      if (activeTab) {
        newTabs[state.activeTabIndex] = {
          path,
          name: name || activeTab.name || basename(path),
        };
      }
      return { tabs: newTabs };
    });
  },

  moveTab: (fromIndex, toIndex) => {
    set((state) => {
      const newTabs = [...state.tabs];
      const [movedTab] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, movedTab);

      // Update active tab index if needed
      let newActiveIndex = state.activeTabIndex;
      if (state.activeTabIndex === fromIndex) {
        // Moving the active tab
        newActiveIndex = toIndex;
      } else if (
        state.activeTabIndex > toIndex &&
        state.activeTabIndex < fromIndex
      ) {
        // Moving tab to the left of active tab
        newActiveIndex = state.activeTabIndex + 1;
      } else if (
        state.activeTabIndex < toIndex &&
        state.activeTabIndex > fromIndex
      ) {
        // Moving tab to the right of active tab
        newActiveIndex = state.activeTabIndex - 1;
      }

      return { tabs: newTabs, activeTabIndex: newActiveIndex };
    });
  },

  // Cache actions
  initializeCache: (tabs) => {
    const repoCache: { [path: string]: RepoCacheEntry } = {};
    tabs.forEach(({ path }) => {
      if (path && !repoCache[path]) {
        repoCache[path] = createEmptyRepoCache(path);
      }
    });
    set({ tabs, repoCache, isInitialized: true });
  },

  initializeCacheForPath: (path) => {
    set((state) => {
      if (!path || state.repoCache[path]) {
        return state;
      }
      return {
        repoCache: {
          ...state.repoCache,
          [path]: createEmptyRepoCache(path),
        },
      };
    });
  },

  updateRepoCache: (path, data) => {
    set((state) => {
      const existing = state.repoCache[path] || createEmptyRepoCache(path);

      // Reference preservation: only replace fields whose data has actually
      // changed. This prevents Zustand selectors from returning new
      // references for unchanged fields, which in turn prevents React
      // from re-rendering components whose data is identical.
      const changedFields: Record<string, unknown> = {};
      let changedCount = 0;

      for (const key of Object.keys(data)) {
        const oldVal = (existing as Record<string, unknown>)[key];
        const newVal = (data as Record<string, unknown>)[key];

        // Fast path: same reference — nothing to do
        if (oldVal === newVal) {
          continue;
        }

        // Fast path: different array lengths — definitely changed
        if (Array.isArray(oldVal) && Array.isArray(newVal)) {
          if (oldVal.length !== newVal.length) {
            changedFields[key] = newVal;
            changedCount++;
            continue;
          }
          if (oldVal.length === 0) {
            continue; // both empty arrays
          }
        }

        // Structural comparison for non-trivial values
        if (
          oldVal != null &&
          newVal != null &&
          JSON.stringify(oldVal) === JSON.stringify(newVal)
        ) {
          continue; // structurally identical — keep old reference
        }

        changedFields[key] = newVal;
        changedCount++;
      }

      if (changedCount === 0) return state; // nothing changed — skip re-render

      return {
        repoCache: {
          ...state.repoCache,
          [path]: { ...existing, ...changedFields } as RepoCacheEntry,
        },
      };
    });
  },

  getCacheFor: (path) => {
    return get().repoCache[path];
  },

  // Branch map actions
  updateLocalBranchMap: (path, branches) => {
    set((state) => {
      const newLocalMap = new Map(state.localBranchMap);
      newLocalMap.set(path, new Map(branches.map((b) => [b.name, b])));

      const newCurrentMap = new Map(state.currentBranchMap);
      const currentBranch = branches.find((b) => b.isCurrentBranch);
      if (currentBranch) {
        newCurrentMap.set(path, currentBranch);
      }

      return {
        localBranchMap: newLocalMap,
        currentBranchMap: newCurrentMap,
      };
    });
  },

  updateRemoteBranchMap: (path, branches) => {
    set((state) => {
      const newMap = new Map(state.remoteBranchMap);
      newMap.set(path, new Map(branches.map((b) => [b.name, b])));
      return { remoteBranchMap: newMap };
    });
  },

  // Getters
  getActiveTab: () => {
    const state = get();
    return state.tabs[state.activeTabIndex] || { name: '', path: '' };
  },

  getActiveRepoCache: () => {
    const state = get();
    const activeTab = state.tabs[state.activeTabIndex];
    return activeTab?.path ? state.repoCache[activeTab.path] : undefined;
  },

  getCurrentBranch: (path) => {
    const state = get();
    const p = path || state.getActiveTab().path;
    return state.currentBranchMap.get(p);
  },

  getLocalBranchMap: (path) => {
    const state = get();
    const p = path || state.getActiveTab().path;
    return state.localBranchMap.get(p) || new Map();
  },

  getRemoteBranchMap: (path) => {
    const state = get();
    const p = path || state.getActiveTab().path;
    return state.remoteBranchMap.get(p) || new Map();
  },
}));
