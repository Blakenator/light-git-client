import {CodeWatcherModel} from './code-watcher.model';

const defaultCodeWatchers: CodeWatcherModel[] = [
  new CodeWatcherModel('Duplicate Lines', '^(.*)(\\r?\\n\\1)+$', 'g'),
  new CodeWatcherModel('Console Output', 'console\\.(log|error|info)', 'g', '\\.(ts|js|jsx)'),
];

export class SettingsModel {
  public darkMode: boolean;
  public openRepos: string[];
  public tabNames: string[];
  public activeTab: number;
  public gitPath: string;
  public bashPath: string;
  public showTrackingPath: boolean;
  public commitMessageAutocomplete: boolean;
  public diffIgnoreWhitespace: boolean;
  public mergetool: string;
  public expandStates: { [key: string]: boolean };
  public commandTimeoutSeconds: number;
  public codeWatchers: CodeWatcherModel[];

  constructor(darkMode: boolean = false,
              openRepos: string[] = [''],
              tabNames: string[] = [''],
              activeTab: number = 0,
              gitPath: string = 'git',
              mergetool: string = 'sourcetree',
              bashPath: string = 'bash',
              commandTimeoutSeconds: number = 10,
              expandStates: { [key: string]: boolean } = {},
              showTrackingPath: boolean = false,
              commitMessageAutcomplete: boolean = false,
              diffIgnoreWhitespace: boolean = false,
              codeWatchers: CodeWatcherModel[] = defaultCodeWatchers) {
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
    this.codeWatchers = codeWatchers;
  }

  static sanitizePath(path) {
    return '"' + path.replace(/\\/g, '\\\\\\\\') + '"';
  }

  public clone(): SettingsModel {
    let res = new SettingsModel();
    res.codeWatchers = this.codeWatchers.map(x => Object.assign(new CodeWatcherModel(), x));
    res.darkMode = this.darkMode;
    res.openRepos = this.openRepos.map(x => x);
    res.tabNames = this.tabNames.map(x => x);
    res.activeTab = this.activeTab;
    res.gitPath = this.gitPath;
    res.bashPath = this.bashPath;
    res.expandStates = Object.assign({}, this.expandStates);
    res.commandTimeoutSeconds = this.commandTimeoutSeconds;
    res.showTrackingPath = this.showTrackingPath;
    res.commitMessageAutocomplete = this.commitMessageAutocomplete;
    res.diffIgnoreWhitespace = this.diffIgnoreWhitespace;
    res.mergetool = this.mergetool;
    return res;
  }
}
