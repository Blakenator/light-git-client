export class NotificationModel {
  public title: string;
  public message: string;

  constructor(title?: string, message?: string) {
    this.title = title;
    this.message = message;
  }
}
