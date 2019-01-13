import {GenericApplication} from './genericApplication';
import {ipcMain} from 'electron';
import {Observable, Subject} from 'rxjs';

/**
 * TODO: DO NOT USE, PROMPT WORKS BUT CONNECTION DOES NOT
 */
export class AskPassApplication extends GenericApplication {
  constructor(logger: Console) {
    super(logger);
    this.windowWidth = 200;
    this.windowHeight = 200;
    this.rootHtmlPath = 'dist/index.html#password';
    this.startMaximized = false;
  }

  private _onLogin = new Subject<{ username: string, password: string }>();

  public get onLogin(): Observable<{ username: string, password: string }> {
    return this._onLogin.asObservable();
  }

  start() {
    super.start();
    ipcMain.on('CRED', (event, args) => {
      this.finish(args[0], args[1]);
    });
  }

  private finish(username, password) {
    this._onLogin.next({username, password});
    this.quit();
  }
}
