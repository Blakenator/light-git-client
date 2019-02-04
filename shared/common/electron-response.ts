  export class ElectronResponse {
  public success: boolean;
  public content: any;

  constructor(content: any, success: boolean = true) {
    this.success = success;
    this.content = content;
  }
}
