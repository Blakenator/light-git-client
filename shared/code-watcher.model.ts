export class CodeWatcherModel {
  public name: string;
  public regex: string;
  public regexFlags: string;
  public activeFilter: string;
  public enabled: boolean;
  public path: string;

  constructor(name: string = '', regex: string = '', regexFlags: string = 'g', activeFilter: string = '', enabled: boolean = false,path:string='') {
    this.name = name;
    this.regex = regex;
    this.regexFlags = regexFlags;
    this.activeFilter = activeFilter;
    this.enabled = enabled;
    this.path = path;
  }

  public static toRegex(watcher: CodeWatcherModel): RegExp {
    return new RegExp(watcher.regex, watcher.regexFlags);
  }
}
