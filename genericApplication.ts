import {app, BrowserWindow, screen} from 'electron';
import * as url from 'url';
import * as path from 'path';
import * as NodeNotifier from 'node-notifier';
import {ElectronResponse} from './shared/common/electron-response';

export abstract class GenericApplication {
  public logger: Console;
  public version: string;
  public notifier: NodeNotifier.NodeNotifier;
  protected window: BrowserWindow;
  protected windowWidth: number;
  protected windowHeight: number;
  protected rootHtmlPath: string;
  protected startMaximized = true;

  protected constructor(logger: Console, version: string, notifier: NodeNotifier.NodeNotifier) {
    this.logger = logger;
    this.version = version;
    this.notifier = notifier;
  }

  bindAppHandlers() {
    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.on('ready', () => {
      this.createWindow();
      this.onReady();
    });

    // Quit when all windows are closed.
    app.on('window-all-closed', () => {
      // On OS X it is common for applications and their menu bar
      // to stay active until the user quits explicitly with Cmd + Q
      if (process.platform !== 'darwin') {
        this.quit();
      }
    });

    app.on('activate', () => {
      // On OS X it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (this.window === null) {
        this.createWindow();
        this.onReady();
      }
    });
  }

  createWindow() {
    // Create the browser window.
    this.window = new BrowserWindow({
      x: 0,
      y: 0,
      width: this.windowWidth || screen.getPrimaryDisplay().workAreaSize.width * .6,
      height: this.windowHeight || screen.getPrimaryDisplay().workAreaSize.height * .8,
    });

    if (this.startMaximized) {
      this.window.maximize();
    }


    this.window.loadURL(url.format({
      pathname: path.join(__dirname, this.rootHtmlPath || 'dist/index.html'),
      protocol: 'file:',
      slashes: true,
    }));
    // win.webContents.openDevTools();

    // Emitted when the window is closed.
    this.window.on('closed', () => {
      // Dereference the window object, usually you would store window
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      this.window = null;
    });

  }

  beforeQuit() {
  }

  getReplyChannel(arg) {
    return arg[0] + 'reply';
  }

  defaultReply(event, args, data?: any, success: boolean = true) {
    event.sender.send(this.getReplyChannel(args), new ElectronResponse(data, success));
  }

  start() {
    this.bindAppHandlers();
  }

  protected quit() {
    this.beforeQuit();
    app.quit();
  }

  protected onReady() {

  }
}
