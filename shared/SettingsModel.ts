export class SettingsModel {
  public darkMode: boolean;
  public openRepos: string[];
  public tabNames: string[];
  public activeTab: number;
  public gitPath: string;
  public bashPath: string;
  public showTrackingPath: boolean;
  public commitMessageAutocomplete: boolean;
  public expandStates: { [key: string]: boolean };
  public commandTimeoutSeconds: number;

  constructor(darkMode: boolean = false,
              openRepos: string[] = [''],
              tabNames: string[] = [''],
              activeTab: number = 0,
              gitPath: string = 'git',
              bashPath: string = 'bash',
              commandTimeoutSeconds: number = 10,
              expandStates: { [key: string]: boolean } = {},
              showTrackingPath: boolean = false,
              commitMessageAutcomplete: boolean = false) {
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
  }

  static sanitizePath(path) {
    return '"' + path.replace(/\\/g, '\\\\\\\\') + '"';
  }
}
