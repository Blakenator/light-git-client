import { CodeWatcherModel } from './code-watcher.model';

export class SettingsModel {
  static defaultCodeWatchers: CodeWatcherModel[] = [
    new CodeWatcherModel(
      'Duplicate Lines',
      '(^|\\n)(.*)(\\r?\\n\\2(\\r?\\n|$))+',
      'g',
    ),
    new CodeWatcherModel(
      'Console Output',
      'console\\.(log|error|info)',
      'g',
      '\\.(ts|js|jsx)',
    ),
    new CodeWatcherModel(
      'Poor Lambda Names',
      '\\(?(\\b(x|y|z)\\s*,?\\s*)+\\s*\\)?\\s*=>',
      'g',
      '\\.(ts|js|jsx|cs|java)',
    ),
  ];

  public darkMode: boolean;
  public rebasePull: boolean;
  public openRepos: string[];
  public tabNames: string[];
  public activeTab: number;
  public gitPath: string;
  public bashPath: string;
  public showTrackingPath: boolean;
  public commitMessageAutocomplete: boolean;
  public diffIgnoreWhitespace: boolean;
  public airplaneMode: boolean;
  public mergetool: string;
  public expandStates: { [key: string]: boolean };
  public commandTimeoutSeconds: number;
  public codeWatchers: CodeWatcherModel[];
  public loadedCodeWatchers: CodeWatcherModel[];
  public codeWatcherPaths: string[];
  public includeUnchangedInWatcherAnalysis: boolean;
  public username: string;
  public email: string;
  public allowStats: boolean;
  public statsId: string;
  public allowPrerelease: boolean;
  public splitFilenameDisplay: boolean;
  public commitAndPush: boolean;
  public branchNamePrefix: string;

  constructor(
    darkMode: boolean = false,
    openRepos: string[] = [''],
    tabNames: string[] = [''],
    activeTab: number = 0,
    gitPath: string = 'git',
    mergetool: string = 'sourcetree',
    bashPath: string = 'bash',
    commandTimeoutSeconds: number = 10,
    expandStates: { [p: string]: boolean } = {},
    showTrackingPath: boolean = false,
    commitMessageAutcomplete: boolean = false,
    diffIgnoreWhitespace: boolean = false,
    includeUnchangedInWatcherAnalysis: boolean = true,
    username: string = '',
    email: string = '',
    allowPrerelease: boolean = false,
    airplaneMode: boolean = false,
    allowStats: boolean = false,
    splitFilenameDisplay: boolean = false,
    commitAndPush: boolean = false,
    rebasePull: boolean = false,
    loadedCodeWatchers: CodeWatcherModel[] = [],
    codeWatcherPaths: string[] = [],
    branchNamePrefix: string = '',
  ) {
    this.darkMode = darkMode;
    this.openRepos = openRepos;
    this.tabNames = tabNames;
    this.activeTab = activeTab;
    this.gitPath = gitPath;
    this.bashPath = bashPath;
    this.expandStates = expandStates;
    this.commandTimeoutSeconds = commandTimeoutSeconds;
    this.showTrackingPath = showTrackingPath;
    this.commitMessageAutocomplete = commitMessageAutcomplete;
    this.diffIgnoreWhitespace = diffIgnoreWhitespace;
    this.mergetool = mergetool;
    this.includeUnchangedInWatcherAnalysis = includeUnchangedInWatcherAnalysis;
    this.username = username;
    this.email = email;
    this.allowStats = allowStats;
    this.statsId = Math.pow(32, 16).toString(32);
    this.allowPrerelease = allowPrerelease;
    this.airplaneMode = airplaneMode;
    this.splitFilenameDisplay = splitFilenameDisplay;
    this.commitAndPush = commitAndPush;
    this.loadedCodeWatchers = loadedCodeWatchers;
    this.codeWatcherPaths = codeWatcherPaths;
    this.rebasePull = rebasePull;
    this.branchNamePrefix = branchNamePrefix;
  }

  static sanitizePath(path) {
    return path.replace(/\\/g, '\\\\\\\\').replace(/"/, '');
  }

  public clone(): SettingsModel {
    let res = new SettingsModel();
    res.loadedCodeWatchers = this.loadedCodeWatchers.map((w) =>
      Object.assign(new CodeWatcherModel(), w),
    );
    res.codeWatcherPaths = this.codeWatcherPaths.map((p) => p + '');
    res.darkMode = this.darkMode;
    res.openRepos = this.openRepos.map((r) => r);
    res.tabNames = this.tabNames.map((n) => n);
    res.activeTab = this.activeTab;
    res.gitPath = this.gitPath;
    res.bashPath = this.bashPath;
    res.expandStates = Object.assign({}, this.expandStates);
    res.commandTimeoutSeconds = this.commandTimeoutSeconds;
    res.showTrackingPath = this.showTrackingPath;
    res.commitMessageAutocomplete = this.commitMessageAutocomplete;
    res.diffIgnoreWhitespace = this.diffIgnoreWhitespace;
    res.mergetool = this.mergetool;
    res.includeUnchangedInWatcherAnalysis =
      this.includeUnchangedInWatcherAnalysis;
    res.username = this.username + '';
    res.email = this.email + '';
    res.allowStats = !!this.allowStats;
    res.allowPrerelease = this.allowPrerelease;
    res.airplaneMode = this.airplaneMode;
    res.commitAndPush = this.commitAndPush;
    res.rebasePull = this.rebasePull;
    res.splitFilenameDisplay = this.splitFilenameDisplay;
    res.statsId = this.statsId + '';
    res.branchNamePrefix = this.branchNamePrefix;
    return res;
  }
}
