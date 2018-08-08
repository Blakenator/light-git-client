export class SettingsModel {
  public darkMode: boolean;
  public openRepos: string[];
  public tabNames: string[];
  public activeTab: number;

  constructor(darkMode: boolean = false,
              openRepos: string[] = [''],
              tabNames: string[] = [''],
              activeTab: number = 0) {
    this.darkMode = darkMode;
    this.openRepos = openRepos;
    this.tabNames = tabNames;
    this.activeTab = activeTab;
  }
}
