import {app, BrowserWindow, ipcMain, screen, shell} from 'electron';
import * as path from 'path';
import * as url from 'url';
import * as fs from 'fs';
import {SettingsModel} from './shared/SettingsModel';
import {autoUpdater} from 'electron-updater';
import {RepositoryModel} from "./shared/Repository.model";
import {GitClient} from "./git/GitClient";
import {Channels} from "./shared/Channels";
import {ElectronResponse} from "./shared/electron-response";

const opn = require('opn');
const notifier = require('node-notifier');
const version = require('./package.json');

let win, serve;
const args = process.argv.slice(1);
serve = args.some(val => val === '--serve');

function createWindow() {
  checkForUpdates();

  const electronScreen = screen;
  const size = electronScreen.getPrimaryDisplay().workAreaSize;

  // Create the browser window.
  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: size.width,
    height: size.height
  });

  if (serve) {
    require('electron-reload')(__dirname, {
      electron: require(`${__dirname}/node_modules/electron`)
    });
    win.loadURL('http://localhost:4200');
  } else {
    win.loadURL(url.format({
      pathname: path.join(__dirname, 'dist/index.html'),
      protocol: 'file:',
      slashes: true
    }));
  }
  // win.webContents.openDevTools();

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });
}

function getReplyChannel(arg) {
  return arg[0] + 'reply';
}

function saveSettings(settingsModel: SettingsModel) {
  Object.assign(settingsModel, settingsModel);
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settingsModel), {encoding: 'utf8'});
}

function loadSettings(callback: Function) {
  if (fs.existsSync(getSettingsPath())) {
    fs.readFile(getSettingsPath(), 'utf8', (err, data) => {
      if (err) {
        throw err;
      }
      const res = Object.assign(new SettingsModel(), JSON.parse(data));
      Object.assign(settings, res);
      callback(res);
    });
  } else {
    Object.assign(settings, new SettingsModel());
    saveSettings(settings);
    callback(settings);
  }
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function defaultReply(event, args) {
  event.sender.send(getReplyChannel(args), new ElectronResponse(undefined));
}

function stopWatchingSettings() {
  isWatchingSettingsDir.close();
}

function loadRepoInfo(repoPath: string): Promise<RepositoryModel> {
  gitClients[repoPath] = new GitClient(repoPath, settings);
  loadedRepos[repoPath] = gitClients[repoPath].openRepo();
  return loadedRepos[repoPath];
}

function handleGitPromise(p: Promise<any>, event: { sender: { send: (channel: string, content: any) => {} } }, args: any[]) {
  p.then(content => event.sender.send(getReplyChannel(args), new ElectronResponse(content)))
    .catch(content => event.sender.send(getReplyChannel(args), new ElectronResponse(content, false)));
}

function checkForUpdates() {
  autoUpdater.checkForUpdates();
}


let updateDownloaded = false;
let settings: SettingsModel = new SettingsModel();
let userInitiatedUpdate = false;
let isWatchingSettingsDir;
let loadedRepos: { [key: number]: Promise<RepositoryModel> } = {};
let gitClients: { [key: string]: GitClient } = {};
const iconFile = './src/favicon.512x512.png';
const notificationTitle = "Light Git";
try {

  app.setAppUserModelId("com.blakestacks.light-git-client");
  app.setAsDefaultProtocolClient("light-git");

  autoUpdater.on('update-not-available', info => {
    if (userInitiatedUpdate) {
      notifier.notify({
        title: notificationTitle,
        message: 'You\'re currently running the latest version (' + info.version + ')! Enjoy!',
        icon: iconFile
      });
    }
    userInitiatedUpdate = false;
  });
  autoUpdater.on('update-available', info => {
    if (!updateDownloaded) {

      notifier.notify({
        title: notificationTitle,
        message: 'Version ' + info.version + ' is now available and is being downloaded',
        icon: iconFile
      });
      userInitiatedUpdate = false;
    }
  });
  autoUpdater.on('update-downloaded', info => {
    if (!updateDownloaded) {
      notifier.notify({
        title: notificationTitle,
        message: 'Version ' + info.version + ' will install the next time you start the app',
        icon: iconFile,
        wait: true
      });
      userInitiatedUpdate = false;
      updateDownloaded = true;
    }
  });

  setInterval(() => {
    if (!updateDownloaded) {
      checkForUpdates();
    }
  }, 60 * 60 * 1000);
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.on('ready', createWindow);

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      stopWatchingSettings();
      app.quit();
    }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });

  ipcMain.on(Channels.OPENURL, (event, args) => {
    let url = args[1];
    if (args.length > 2) {
      opn(url, {app: args[2]});
    } else {
      opn(url);
    }
    defaultReply(event, args);
  });

  ipcMain.on(Channels.OPENFOLDER, (event, args) => {
    let url = args[1];
    shell.openItem(url);
    defaultReply(event, args);
  });

  ipcMain.on(Channels.LOADSETTINGS, (event, args) => {
    loadSettings((settings) => {
      event.sender.send(getReplyChannel(args), new ElectronResponse(settings));
    });

    if (!isWatchingSettingsDir) {
      isWatchingSettingsDir = fs.watch(getSettingsPath(), (eventInfo, filename) => {
        loadSettings((settings) => {
          event.sender.send(getReplyChannel([Channels.SETTINGSCHANGED]), new ElectronResponse(settings));
        });
      });
    }
  });

  ipcMain.on(Channels.SAVESETTINGS, (event, args) => {
    saveSettings(args[1]);
    defaultReply(event, args);
  });

  ipcMain.on(Channels.LOADREPO, (event, args) => {
    handleGitPromise(loadRepoInfo(args[1]), event, args);
  });

  ipcMain.on(Channels.GETFILECHANGES, (event, args) => {
    handleGitPromise(gitClients[args[1]].getChanges(), event, args);
  });

  ipcMain.on(Channels.GITSTAGE, (event, args) => {
    handleGitPromise(gitClients[args[1]].stage(args[2]), event, args);
  });

  ipcMain.on(Channels.GITUNSTAGE, (event, args) => {
    handleGitPromise(gitClients[args[1]].unstage(args[2]), event, args);
  });

  ipcMain.on(Channels.OPENTERMINAL, (event, args) => {
    gitClients[args[1]].openTerminal();
    defaultReply(event, args);
  });

  ipcMain.on(Channels.GETFILEDIFF, (event, args) => {
    handleGitPromise(gitClients[args[1]].getDiff(args[2], args[3]), event, args);
  });

  ipcMain.on(Channels.COMMIT, (event, args) => {
    handleGitPromise(gitClients[args[1]].commit(args[2], args[3]), event, args);
  });

  ipcMain.on(Channels.GETCOMMITHISTORY, (event, args) => {
    handleGitPromise(gitClients[args[1]].getCommitHistory(), event, args);
  });

  ipcMain.on(Channels.CHECKOUT, (event, args) => {
    handleGitPromise(gitClients[args[1]].checkout(args[2], args[3], args[4]), event, args);
  });

  ipcMain.on(Channels.UNDOFILECHANGES, (event, args) => {
    handleGitPromise(gitClients[args[1]].undoFileChanges(args[2], args[3]), event, args);
  });

  ipcMain.on(Channels.PUSH, (event, args) => {
    handleGitPromise(gitClients[args[1]].pushBranch(args[2], args[3]), event, args);
  });

  ipcMain.on(Channels.PULL, (event, args) => {
    handleGitPromise(gitClients[args[1]].pull(), event, args);
  });

  ipcMain.on(Channels.GETBRANCHES, (event, args) => {
    handleGitPromise(gitClients[args[1]].getBranches(), event, args);
  });

  ipcMain.on(Channels.MERGE, (event, args) => {
    handleGitPromise(gitClients[args[1]].merge(args[2], args[3]), event, args);
  });

  ipcMain.on(Channels.HARDRESET, (event, args) => {
    handleGitPromise(gitClients[args[1]].hardReset(), event, args);
  });

  ipcMain.on(Channels.DELETEBRANCH, (event, args) => {
    handleGitPromise(gitClients[args[1]].deleteBranch(args[2]), event, args);
  });

  ipcMain.on(Channels.DELETEFILES, (event, args) => {
    let promises = [];
    let files: string[] = args[2];
    for (let f of files) {
      promises.push(new Promise((resolve, reject) => {
        let path1 = path.join(args[1], f);
        console.log(path1);
        fs.unlink(path1, err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }));
    }
    handleGitPromise(Promise.all(promises), event, args);
  });
} catch (e) {
  // Catch Error
  // throw e;
}

