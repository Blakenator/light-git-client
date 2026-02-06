import { create } from 'zustand';
import { ipcClient } from '../ipc';
import { Channels } from '@light-git/shared';

export interface CodeWatcherModel {
  name: string;
  pattern: string;
  flags: string;
  filePattern?: string;
}

export interface ConfigShortcut {
  key: string;
  value: string;
  description?: string;
  scope?: 'local' | 'global';
}

export interface SettingsModel {
  darkMode: boolean;
  rebasePull: boolean;
  openRepos: string[];
  tabNames: string[];
  activeTab: number;
  gitPath: string;
  bashPath: string;
  showTrackingPath: boolean;
  commitMessageAutocomplete: boolean;
  diffIgnoreWhitespace: boolean;
  airplaneMode: boolean;
  mergetool: string;
  expandStates: { [key: string]: boolean };
  commandTimeoutSeconds: number;
  codeWatchers: CodeWatcherModel[];
  loadedCodeWatchers: CodeWatcherModel[];
  codeWatcherPaths: string[];
  includeUnchangedInWatcherAnalysis: boolean;
  username: string;
  email: string;
  allowStats: boolean;
  statsId: string;
  allowPrerelease: boolean;
  splitFilenameDisplay: boolean;
  commitAndPush: boolean;
  branchNamePrefix: string;
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
  allowStats: false,
  statsId: '',
  allowPrerelease: false,
  splitFilenameDisplay: false,
  commitAndPush: false,
  branchNamePrefix: '',
  configShortcuts: [],
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
}

export const useSettingsStore = create<SettingsState & SettingsActions>((set, get) => ({
  settings: defaultSettings,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const settings = await ipcClient.rpc<SettingsModel>(Channels.LOADSETTINGS);
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
      await ipcClient.rpc(Channels.SAVESETTINGS, settings);
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
}));
