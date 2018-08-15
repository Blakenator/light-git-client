export class SettingsModel {
  public darkMode: boolean;
  public openRepos: string[];
  public tabNames: string[];
  public activeTab: number;
  public gitPath: string;
  public bashPath: string;
  public expandStates: { [key: string]: boolean };
  public commandTimeoutSeconds: number;

  constructor(darkMode: boolean = false,
              openRepos: string[] = [''],
              tabNames: string[] = [''],
              activeTab: number = 0,
              gitPath: string = 'git',
              bashPath: string = 'bash',
              commandTimeoutSeconds: number = 10,
              expandStates: { [key: string]: boolean } = {}) {
    this.darkMode = darkMode;
    this.openRepos = openRepos;
    this.tabNames = tabNames;
    this.activeTab = activeTab;
    this.gitPath = gitPath;
    this.bashPath = bashPath;
    this.expandStates = expandStates;
    this.commandTimeoutSeconds = commandTimeoutSeconds;
  }
}
