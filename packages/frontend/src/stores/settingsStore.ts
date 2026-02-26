import { create } from 'zustand';
import { invokeSync } from '../ipc/invokeSync';
import {
  SYNC_CHANNELS,
  type SettingsData,
} from '@light-git/shared';
export type { CodeWatcherModel } from '@light-git/shared';

export interface ConfigShortcut {
  key: string;
  value: string;
  description?: string;
  scope?: 'local' | 'global';
}

export interface SectionCardLayout {
  visible: boolean;
  order: number;
  column: number;
}

export type RepoSectionLayout = { [cardId: string]: SectionCardLayout };
export type AllSectionLayouts = { [repoPath: string]: RepoSectionLayout };

/** Frontend settings extends the shared model with frontend-only fields */
export interface SettingsModel extends SettingsData {
  configShortcuts: ConfigShortcut[];
}

const defaultSettings: SettingsModel = {
  darkMode: false,
  rebasePull: false,
  openRepos: [''],
  tabNames: [''],
  activeTab: 0,
  gitPath: 'git',
  bashPath: 'bash',
  showTrackingPath: false,
  commitMessageAutocomplete: false,
  diffIgnoreWhitespace: false,
  airplaneMode: false,
  mergetool: 'sourcetree',
  expandStates: {},
  commandTimeoutSeconds: 10,
  codeWatchers: [],
  loadedCodeWatchers: [],
  codeWatcherPaths: [],
  includeUnchangedInWatcherAnalysis: true,
  username: '',
  email: '',
  allowPrerelease: false,
  splitFilenameDisplay: false,
  commitAndPush: false,
  branchNamePrefix: '',
  autocompletePhrases: [],
  configShortcuts: [],
  sectionLayouts: {},
};

interface SettingsState {
  settings: SettingsModel;
  isLoaded: boolean;
}

interface SettingsActions {
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<SettingsModel>) => void;
  saveSettings: () => Promise<void>;
  setExpandState: (key: string, expanded: boolean) => void;
  getExpandState: (key: string) => boolean;
  setTheme: (dark: boolean) => void;
  getSectionLayout: (repoPath: string) => RepoSectionLayout | undefined;
  setSectionLayout: (repoPath: string, layout: RepoSectionLayout) => void;
}

export const useSettingsStore = create<SettingsState & SettingsActions>((set, get) => ({
  settings: defaultSettings,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const settings = await invokeSync(SYNC_CHANNELS.LoadSettings);
      set({ settings: { ...defaultSettings, ...settings }, isLoaded: true });
      
      // Apply theme
      if (settings.darkMode) {
        window.setTheme?.('dark');
      } else {
        window.setTheme?.('light');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ isLoaded: true });
    }
  },

  updateSettings: (updates) => {
    set((state) => ({
      settings: { ...state.settings, ...updates },
    }));
  },

  saveSettings: async () => {
    try {
      const { settings } = get();
      await invokeSync(SYNC_CHANNELS.SaveSettings, { settings });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },

  setExpandState: (key, expanded) => {
    set((state) => ({
      settings: {
        ...state.settings,
        expandStates: {
          ...state.settings.expandStates,
          [key]: expanded,
        },
      },
    }));
    // Auto-save expand states
    get().saveSettings();
  },

  getExpandState: (key) => {
    return get().settings.expandStates[key] ?? true;
  },

  setTheme: (dark) => {
    set((state) => ({
      settings: { ...state.settings, darkMode: dark },
    }));
    window.setTheme?.(dark ? 'dark' : 'light');
    get().saveSettings();
  },

  getSectionLayout: (repoPath) => {
    return get().settings.sectionLayouts[repoPath];
  },

  setSectionLayout: (repoPath, layout) => {
    set((state) => ({
      settings: {
        ...state.settings,
        sectionLayouts: {
          ...state.settings.sectionLayouts,
          [repoPath]: layout,
        },
      },
    }));
    get().saveSettings();
  },
}));
