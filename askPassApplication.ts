import {GenericApplication} from './genericApplication';
import * as NodeNotifier from 'node-notifier';
import {ipcMain} from 'electron';
import * as keytar from 'keytar';

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * TODO: DO NOT USE, PROMPT WORKS BUT CONNECTION DOES NOT
 */
export class AskPassApplication extends GenericApplication {
  lines: string[] = [];
  loadedEvent: any;
  private host: string;
  private username: string;
  private readonly SERVICE_NAME = 'light-git-client';

  constructor(logger: Console, version: string, notifier: NodeNotifier.NodeNotifier) {
    super(logger, version, notifier);
    this.windowWidth = 200;
    this.windowHeight = 200;
    this.rootHtmlPath = 'askPass.html';
    this.startMaximized = false;
  }

  start() {
    super.start();
    rl.on('line', (chunk: string) => {
      this.lines.push(chunk);
    });
    ipcMain.on('CRED', (event, args) => {
      // keytar.setPassword(this.SERVICE_NAME, this.getAccount(), args[1]);
      this.finish(args[0], args[1]);
    });
    ipcMain.on('loaded', (event, args) => {
      this.tryLoadPassword();
      this.loadedEvent = event;
    });
  }

  protected quit() {
    process.exit(0);
  }

  protected onReady() {
    this.window.webContents.openDevTools();
  }

  private tryLoadPassword() {
    this.parseInput();
    keytar.getPassword(this.SERVICE_NAME, this.getAccount()).then(password => {
      // if (password && process.argv[2] == 'get') {
      //   this.finish(this.username.substring(this.username.indexOf('=') + 1), password);
      // }
      if (this.loadedEvent) {
        this.loadedEvent.sender.send('in', [this.lines, process.argv]);
      }
    });
  }

  private getAccount() {
    return this.host + '|' + this.username;
  }

  private parseInput() {
    let rawHost: string = this.lines.find(x => x.indexOf('host=') == 0);
    this.host = rawHost.substring(rawHost.indexOf('=') + 1);
    let rawUsername = this.lines.find(x => x.indexOf('username=') == 0);
    this.username = rawUsername.substring(rawUsername.indexOf('=') + 1);
  }

  private finish(username, password) {
    console.log('username=' + username);
    console.log('password=' + password);
    this.quit();
  }
}
