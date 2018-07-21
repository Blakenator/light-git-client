export class SettingsModel {
  public baseLibraryFolder: string;
  public steamId: string;
  public displaySize: number;
  public darkMode: boolean;
  public useDetailedDescription: boolean;
  public friendsExpanded: boolean;
  public advancedAccountName: string;

  constructor(baseLibraryFolder: string = 'C:\\Program Files (x86)\\Steam\\steamapps\\',
              steamId: string = '76561197960435530',
              darkMode: boolean = false,
              useDetailedDescription: boolean = false,
              displaySize: number = 0,
              friendsExpanded: boolean = true,
              advancedAccountName: string = '') {
    this.baseLibraryFolder = baseLibraryFolder;
    this.steamId = steamId;
    this.darkMode = darkMode;
    this.useDetailedDescription = useDetailedDescription;
    this.displaySize = displaySize;
    this.friendsExpanded = friendsExpanded;
    this.advancedAccountName = advancedAccountName;
  }
}
