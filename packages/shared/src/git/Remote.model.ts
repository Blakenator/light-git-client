/**
 * Represents a git remote.
 */
export class RemoteModel {
  public name: string = '';
  public fetchUrl: string = '';
  public pushUrl: string = '';

  constructor(data?: Partial<RemoteModel>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
