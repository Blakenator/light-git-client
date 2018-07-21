import {app, BrowserWindow, ipcMain, screen, shell} from 'electron';
import * as path from 'path';
import * as url from 'url';
import * as fs from 'fs';
import {SettingsModel} from './shared/SettingsModel';
import {autoUpdater} from 'electron-updater';
import {RepositoryModel} from "./shared/Repository.model";
import {BranchModel} from "./shared/Branch.model";
import {GitClient} from "./git/GitClient";

const opn = require('opn');

let win, serve;
const args = process.argv.slice(1);
serve = args.some(val => val === '--serve');

function createWindow() {
  autoUpdater.checkForUpdatesAndNotify();

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
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settingsModel), {encoding: 'utf8'});
}

function loadSettings(callback: Function) {
  if (fs.existsSync(getSettingsPath())) {
    fs.readFile(getSettingsPath(), 'utf8', (err, data) => {
      if (err) {
        throw err;
      }
      callback(Object.assign(new SettingsModel(), JSON.parse(data)));
    });
  } else {
    let settingsModel = new SettingsModel();
    saveSettings(settingsModel);
    callback(settingsModel);
  }
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function defaultReply(event, args) {
  event.sender.send(getReplyChannel(args), undefined);
}

function stopWatchingSettings() {
  isWatchingSettingsDir.close();
}

function loadRepoInfo(repoPath: string, callback: (repo: RepositoryModel) => void) {
  new GitClient(repoPath).openRepo().then(repo => {
    let promises = [];
    let info = new RepositoryModel();
    info.name = path.dirname(repoPath);
    info.path = repoPath;
    promises.push(repo.getRemotes().then(remotes => info.remotes = remotes));
    promises.push(repo.getReferences(TYPE.LISTALL).then(branches => {
      info.localBranches = branches.filter(x => x.isBranch() && !x.isRemote()).map(x => {
        let branchModel = new BranchModel();
        branchModel.name = x.name();
        branchModel.reference = x;
        return branchModel;
      });
      info.remoteBranches = branches.filter(x => x.isBranch() && x.isRemote()).map(x => {
        let branchModel = new BranchModel();
        branchModel.name = x.name();
        branchModel.reference = x;
        return branchModel;
      });
    }));
    Promise.all(promises).then(values => {
      callback(info);
    }).catch(console.log);
  });
}

var isWatchingSettingsDir;
try {
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
  ipcMain.on('openUrl', (event, args) => {
    let url = args[1];
    if (args.length > 2) {
      opn(url, {app: args[2]});
    } else {
      opn(url);
    }
    defaultReply(event, args);
  });
  ipcMain.on('openFolder', (event, args) => {
    let url = args[1];
    shell.openItem(url);
    defaultReply(event, args);
  });
  ipcMain.on('loadSettings', (event, args) => {
    loadSettings((settings) => {
      event.sender.send(getReplyChannel(args), settings);
    });

    if (!isWatchingSettingsDir) {
      isWatchingSettingsDir = fs.watch(getSettingsPath(), (eventInfo, filename) => {
        loadSettings((settings) => {
          event.sender.send(getReplyChannel(['settingsChanged']), settings);
        });
      });
    }
  });
  ipcMain.on('saveSettings', (event, args) => {
    saveSettings(args[1]);
    defaultReply(event, args);
  });
  ipcMain.on('loadRepo', (event, args) => {
    loadRepoInfo("C:/Users/blake/Documents/projects/material-steam", repo => {
      event.sender.send(getReplyChannel(args), repo);
    });
  });
} catch (e) {
  // Catch Error
  // throw e;
}

