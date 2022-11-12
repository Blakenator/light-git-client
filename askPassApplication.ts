import { GenericApplication } from './genericApplication';
import { ipcMain } from 'electron';
import { Observable, Subject } from 'rxjs';
import { ElectronResponse } from './shared/common/electron-response';

export class AskPassApplication extends GenericApplication {
  private finished = false;

  constructor(logger: Console, private host?: string) {
    super(logger);
    this.windowWidth = 400;
    this.windowHeight = 400;
    this.rootHtmlPath = 'dist/index.html';
    this.rootHtmlHash = '/password';
    this.startMaximized = false;
  }

  private _onLogin = new Subject<{ username: string; password: string }>();

  public get onLogin(): Observable<{ username: string; password: string }> {
    return this._onLogin.asObservable();
  }

  start() {
    super.start();
    ipcMain.handle('CRED', (event, args) => {
      this.finish(args[1], args[2]);
      return new ElectronResponse();
    });
    ipcMain.handle('getHost', (event, args) => {
      return new ElectronResponse(this.host);
    });
  }

  protected windowClosed() {
    if (!this.finished) {
      this._onLogin.next(null);
    }
  }

  private finish(username, password) {
    this.finished = true;
    this.window.close();
    this._onLogin.next({ username, password });
  }
}
