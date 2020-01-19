import {app, ipcMain, shell} from 'electron';
import {SettingsModel} from './shared/SettingsModel';
import * as fs from 'fs-extra';
import {RepositoryModel} from './shared/git/Repository.model';
import {GitClient} from './git/GitClient';
import * as path from 'path';
import {ElectronResponse} from './shared/common/electron-response';
import {autoUpdater} from 'electron-updater';
import {Channels} from './shared/Channels';
import {GenericApplication} from './genericApplication';
import * as ua from 'universal-analytics';
import {CodeWatcherModel} from './shared/code-watcher.model';

const opn = require('opn');

export class MainApplication extends GenericApplication {
  private static readonly STATS_GENERAL = 'general';
  private updateDownloaded = false;
  private updateDownloadedVersion: string;
  private settings: SettingsModel = new SettingsModel();
  private userInitiatedUpdate = false;
  private isWatchingSettingsDir: fs.FSWatcher;
  private loadedRepos: { [key: number]: Promise<RepositoryModel> } = {};
  private gitClients: { [key: string]: GitClient } = {};
  private readonly iconFile = './src/favicon.512x512.png';
  private readonly notificationTitle = 'Light Git';
  private analytics;

  constructor(logger: Console) {
    super(logger);
  }

  beforeQuit() {
    this.stopWatchingSettings();
  }

  saveSettings(settingsModel: SettingsModel) {
    Object.assign(settingsModel, settingsModel);
    GitClient.settings = settingsModel;

    let watchersToSave: Map<string, CodeWatcherModel[]> = new Map();

    settingsModel.loadedCodeWatchers.forEach(w => {
      if (!watchersToSave.has(w.path)) {
        watchersToSave.set(w.path, []);
      }
      watchersToSave.get(w.path).push(w);
    });
    Array.from(watchersToSave.entries()).forEach(([file, watchers]) => {
      this.saveWatchers(file, watchers);
    });

    delete settingsModel.loadedCodeWatchers;
    delete settingsModel.codeWatchers;
    fs.writeFileSync(this.getSettingsPath(), JSON.stringify(settingsModel, null, '   '), {encoding: 'utf8'});
  }

  loadSettings(callback: Function) {
    if (fs.existsSync(this.getSettingsPath())) {
      fs.readFile(this.getSettingsPath(), 'utf8', (err, data) => {
        if (err) {
          throw err;
        }
        const res: SettingsModel = Object.assign(new SettingsModel(), JSON.parse(data));
        if (res.codeWatcherPaths.length == 0) {
          res.codeWatcherPaths = [this.getDefaultWatcherPath()];
        }
        Object.assign(this.settings, res);
        GitClient.settings = this.settings;
        if (this.settings.allowStats) {
          this.analytics = ua('UA-83786273-2', this.settings.statsId);
        }
        this.sendEvent(MainApplication.STATS_GENERAL, 'tabs-open', this.settings.tabNames.length);
        this.sendEvent(MainApplication.STATS_GENERAL, 'version', this.version);

        let done: { [path: string]: CodeWatcherModel[] } = {};
        if (this.settings.codeWatcherPaths.length > 0) {
          this.settings.codeWatcherPaths.forEach(p => {
            done[p] = undefined;
            this.loadWatchers(p, (watcherPath, watchers) => {
              done[watcherPath] = watchers;
              if (Object.values(done).every(w => !!w)) {
                this.settings.loadedCodeWatchers = Object.values(done).reduce((acc: CodeWatcherModel[],
                                                                               b: CodeWatcherModel[]) => acc.concat(b));
                if (!!this.settings.codeWatchers) {
                  this.settings.codeWatchers.forEach(w => w.path = this.getDefaultWatcherPath());
                  this.settings.loadedCodeWatchers = this.settings.loadedCodeWatchers.concat(this.settings.codeWatchers);
                  delete this.settings.codeWatchers;
                }
                callback(this.settings);
              }
            });
          });
        } else {
          this.settings.codeWatcherPaths = [this.getDefaultWatcherPath()];
          this.settings.loadedCodeWatchers = SettingsModel.defaultCodeWatchers;
          this.settings.loadedCodeWatchers.forEach(w => w.path = this.getDefaultWatcherPath());
          if (!!this.settings.codeWatchers) {
            this.settings.codeWatchers.forEach(w => w.path = this.getDefaultWatcherPath());
            this.settings.loadedCodeWatchers = this.settings.loadedCodeWatchers.concat(this.settings.codeWatchers);
            delete this.settings.codeWatchers;
          }
          callback(this.settings);
        }
      });
    } else {
      Object.assign(this.settings, new SettingsModel());
      this.settings.codeWatcherPaths = [this.getDefaultWatcherPath()];
      this.saveSettings(this.settings);
      GitClient.settings = this.settings;
      callback(this.settings);
    }
  }

  saveWatchers(path: string, watchers: CodeWatcherModel[]) {
    fs.writeFileSync(path, JSON.stringify(watchers, null, '   '), {encoding: 'utf8'});
  }

  loadWatchers(path: string, callback: (path: string, watchers: CodeWatcherModel[]) => void) {
    if (fs.existsSync(path)) {
      fs.readFile(path, 'utf8', (err, data) => {
        if (err) {
          callback(path, []);
          return;
        }
        try {
          let res: CodeWatcherModel[] = JSON.parse(data);
          res.forEach(w => w.path = path);
          callback(path, res);
        } catch (e) {
          callback(path, []);
        }
      });
    } else {
      callback(path, []);
    }
  }

  sendEvent(category: string, action: string, label: string | number, value?: number) {
    if (this.analytics) {
      this.analytics.event({
        ec: category,
        ea: action,
        el: label + '',
        ev: value,
      }).send();
    }
  }

  getSettingsPath() {
    return path.join(app.getPath('userData'), 'settings.json');
  }

  getDefaultWatcherPath() {
    return path.join(app.getPath('userData'), 'watchers.json');
  }

  stopWatchingSettings() {
    if(this.isWatchingSettingsDir) {
      this.isWatchingSettingsDir.close();
    }
  }

  loadRepoInfo(repoPath: string): Promise<RepositoryModel> {
    this.gitClients[repoPath] = new GitClient(repoPath);
    this.loadedRepos[repoPath] = this.gitClients[repoPath].openRepo();
    this.gitClients[repoPath].onCommandExecuted.subscribe(
      history =>
        this.window.webContents.send(
          this.getReplyChannel([Channels.COMMANDHISTORYCHANGED]),
          new ElectronResponse(history)));
    return this.loadedRepos[repoPath];
  }

  handleGitPromise(p: Promise<any>,
                   event: { sender: { send: (channel: string, content: any) => any } },
                   args: any[]) {
    p.then(content => this.defaultReply(event, args, content))
     .catch(content => this.defaultReply(event, args, content, false));
  }

  start() {
    super.start();
    this.checkForUpdates();
    this.configureApp();
    this.bindEventHandlers();
    setTimeout(() => this.sendEvent('general', 'window-opened', 'main-window'), 20000);
  }

  checkForUpdates() {
    autoUpdater.allowPrerelease = this.settings.allowPrerelease;
    autoUpdater.checkForUpdates().catch(error => {
      this.notifier.notify({
        title: this.notificationTitle,
        message: 'An error occurred while updating, no changes were made. Check error log for more details',
        icon: this.iconFile,
      });
      this.userInitiatedUpdate = false;
      this.logger.error(error);
    });
  }

  configureApp() {
    app.setAppUserModelId('com.blakestacks.light-git-client');
    app.setAsDefaultProtocolClient('light-git');

    autoUpdater.on('update-not-available', info => {
      if (this.userInitiatedUpdate) {
        this.notifier.notify({
          title: this.notificationTitle,
          message: 'You\'re currently running the latest version (' + info.version + ')! Enjoy!',
          icon: this.iconFile,
        });
      }
      this.userInitiatedUpdate = false;
    });
    autoUpdater.on('update-available', info => {
      if (!this.updateDownloaded) {

        this.notifier.notify({
          title: this.notificationTitle,
          message: 'Version ' + info.version + ' is now available and is being downloaded',
          icon: this.iconFile,
        });
        this.userInitiatedUpdate = false;
        this.updateDownloadedVersion = info.version;
      }
    });
    autoUpdater.on('error', error => {
      this.notifier.notify({
        title: this.notificationTitle,
        message: 'An error occurred while updating, no changes were made. Check error log for more details',
        icon: this.iconFile,
      });
      this.userInitiatedUpdate = false;
      this.logger.error(error);
    });
    autoUpdater.on('update-downloaded', info => {
      if (!this.updateDownloaded) {
        this.notifier.notify({
          title: this.notificationTitle,
          message: 'Version ' + info.version + ' will install the next time you start the app',
          icon: this.iconFile,
          wait: true,
        });
        this.userInitiatedUpdate = false;
        this.updateDownloaded = true;
      }
    });

    setInterval(() => {
      if (!this.updateDownloaded) {
        this.checkForUpdates();
      }
    }, 60 * 60 * 1000);
  }

  bindEventHandlers() {
    ipcMain.on(Channels.OPENURL, (event, args) => {
      let url = args[1];
      if (args.length > 2) {
        opn(url, {app: args[2]});
      } else {
        opn(url);
      }
      this.defaultReply(event, args);
    });

    ipcMain.on(Channels.OPENFOLDER, (event, args) => {
      let url = args[2] || args[1];
      shell.openItem(url);
      this.defaultReply(event, args);
    });

    ipcMain.on(Channels.LOADSETTINGS, (event, args) => {
      this.loadSettings((settings) => {
        this.defaultReply(event, args, settings);
      });

      if (!this.isWatchingSettingsDir) {
        this.isWatchingSettingsDir = fs.watch(this.getSettingsPath(), (eventInfo, filename) => {
          this.loadSettings((settings) => {
            event.sender.send(this.getReplyChannel([Channels.SETTINGSCHANGED]), new ElectronResponse(settings));
          });
        });
      }
    });

    ipcMain.on(Channels.CHECKFORUPDATES, (event, args) => {
      this.userInitiatedUpdate = true;
      this.checkForUpdates();
      this.defaultReply(event, args);
    });

    ipcMain.on(Channels.GETVERSION, (event, args) => {
      this.defaultReply(event, args, this.version);
    });

    ipcMain.on(Channels.ISUPDATEDOWNLOADED, (event, args) => {
      this.defaultReply(event, args, {downloaded: this.updateDownloaded, version: this.updateDownloadedVersion});
    });

    ipcMain.on(Channels.RESTARTANDINSTALLUPDATE, (event, args) => {
      autoUpdater.quitAndInstall();
    });

    ipcMain.on(Channels.SAVESETTINGS, (event, args) => {
      this.saveSettings(args[1]);
      this.defaultReply(event, args);
    });

    ipcMain.on(Channels.LOADREPO, (event, args) => {
      this.handleGitPromise(this.loadRepoInfo(args[1]), event, args);
    });

    ipcMain.on(Channels.GETFILECHANGES, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].getChanges(), event, args);
    });

    ipcMain.on(Channels.GITSTAGE, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].stage(args[2]), event, args);
    });

    ipcMain.on(Channels.GITUNSTAGE, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].unstage(args[2]), event, args);
    });

    ipcMain.on(Channels.OPENTERMINAL, (event, args) => {
      this.gitClients[args[1]].openTerminal();
      this.defaultReply(event, args);
    });

    ipcMain.on(Channels.GETFILEDIFF, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].getDiff(args[2], args[3]), event, args);
    });

    ipcMain.on(Channels.COMMIT, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].commit(args[2], args[3], args[4], args[5]), event, args);
    });

    ipcMain.on(Channels.CHERRYPICKCOMMIT, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].cherryPickCommit(args[2]), event, args);
    });

    ipcMain.on(Channels.GETCOMMITHISTORY, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].getCommitHistory(args[2], args[3], args[4]), event, args);
    });

    ipcMain.on(Channels.GETDELETEDSTASHES, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].getDeletedStashes(), event, args);
    });

    ipcMain.on(Channels.RESTOREDELETEDSTASH, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].restoreDeletedStash(args[2]), event, args);
    });

    ipcMain.on(Channels.CHECKOUT, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].checkout(args[2], args[3], '', args[4]), event, args);
    });

    ipcMain.on(Channels.UNDOFILECHANGES, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].undoFileChanges(args[2], args[3], args[4]), event, args);
    });

    ipcMain.on(Channels.UNDOSUBMODULECHANGES, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].undoSubmoduleChanges(args[2]), event, args);
    });

    ipcMain.on(Channels.RESOLVECONFLICTUSING, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].resolveConflictUsing(args[2], args[3]), event, args);
    });

    ipcMain.on(Channels.OPENDEVTOOLS, (event, args) => {
      this.window.webContents.openDevTools();
      this.defaultReply(event, args);
    });

    ipcMain.on(Channels.PUSH, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].pushBranch(args[2], args[3]), event, args);
    });

    ipcMain.on(Channels.PULL, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].pull(args[2]), event, args);
    });

    ipcMain.on(Channels.GETBRANCHES, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].getBranches(args[1]), event, args);
    });

    ipcMain.on(Channels.MERGE, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].merge(args[2], args[3]), event, args);
    });

    ipcMain.on(Channels.HARDRESET, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].hardReset(), event, args);
    });

    ipcMain.on(Channels.DELETEBRANCH, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].deleteBranch(args[2]), event, args);
    });

    ipcMain.on(Channels.FASTFORWARDBRANCH, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].fastForward(args[2]), event, args);
    });

    ipcMain.on(Channels.DELETEWORKTREE, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].deleteWorktree(args[2]), event, args);
    });

    ipcMain.on(Channels.COMMITDIFF, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].getCommitDiff(args[2]), event, args);
    });

    ipcMain.on(Channels.STASHDIFF, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].getStashDiff(args[2]), event, args);
    });

    ipcMain.on(Channels.GETBRANCHPREMERGE, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].getBranchPremerge(args[2]), event, args);
    });

    ipcMain.on(Channels.STASH, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].stash(args[2], args[3] || ''), event, args);
    });

    ipcMain.on(Channels.SETGITSETTINGS, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].setBulkGitSettings(args[2], args[3]), event, args);
    });

    ipcMain.on(Channels.UPDATESUBMODULES, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].updateSubmodules(args[2], args[3]), event, args);
    });

    ipcMain.on(Channels.ADDSUBMODULE, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].addSubmodule(args[2], args[3]), event, args);
    });

    ipcMain.on(Channels.FETCH, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].fetch(), event, args);
    });

    ipcMain.on(Channels.GETCONFIGITEMS, (event, args) => {
      if (this.gitClients[args[1]]) {
        this.handleGitPromise(this.gitClients[args[1]].getConfigItems(), event, args);
      } else {
        this.defaultReply(event, args, []);
      }
    });

    ipcMain.on(Channels.SETCONFIGITEM, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].setConfigItem(args[2]), event, args);
    });

    ipcMain.on(Channels.MERGEBRANCH, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].mergeBranch(args[2]), event, args);
    });

    ipcMain.on(Channels.APPLYSTASH, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].applyStash(args[2]), event, args);
    });

    ipcMain.on(Channels.DELETESTASH, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].deleteStash(args[2]), event, args);
    });

    ipcMain.on(Channels.CHECKGITBASHVERSIONS, (event, args) => {
      this.handleGitPromise(new GitClient(args[1]).checkGitBashVersions(), event, args);
    });

    ipcMain.on(Channels.ADDWORKTREE, (event, args) => {
      this.gitClients[args[1]].addWorktree(args[2], args[3]).subscribe(eventData => {
        this.defaultReply(event, args, {out: eventData.out, err: eventData.error, done: eventData.done});
      });
    });

    ipcMain.on(Channels.CLONE, (event, args) => {
      new GitClient(args[1]).clone(args[2], args[3]).subscribe(eventData => {
        this.defaultReply(event, args, {out: eventData.out, err: eventData.error, done: eventData.done});
      });
    });

    ipcMain.on(Channels.CHANGEHUNK, (event, args) => {
      this.handleGitPromise(
        this.gitClients[args[1]].changeHunk(path.join(args[1], args[2]), args[3], args[4]),
        event,
        args);
    });

    ipcMain.on(Channels.GETCOMMANDHISTORY, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].getCommandHistory(), event, args);
    });

    ipcMain.on(Channels.RENAMEBRANCH, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].renameBranch(args[2], args[3]), event, args);
    });

    ipcMain.on(Channels.CREATEBRANCH, (event, args) => {
      this.handleGitPromise(this.gitClients[args[1]].createBranch(args[2]), event, args);
    });

    ipcMain.on(Channels.CLOSEWINDOW, (event, args) => {
      this.window.close();
    });

    ipcMain.on(Channels.MINIMIZE, (event, args) => {
      this.window.minimize();
    });

    ipcMain.on(Channels.RESTORE, (event, args) => {
      if (this.window.isMaximized()) {
        this.window.restore();
      } else {
        this.window.maximize();
      }
    });

    ipcMain.on(Channels.LOG, (event, args) => {
      this.logger.error(new Date().toLocaleString() + ' ------------------------------------------------');
      this.logger.error(args[1]);
      this.defaultReply(event, args);
    });

    ipcMain.on(Channels.DELETEFILES, (event, args) => {
      let promises = [];
      let files: string[] = args[2];
      files = files.map(f => f.replace(/["']/g, ''));
      for (let f of files) {
        promises.push(new Promise((resolve, reject) => {
          let path1 = path.join(args[1], f);
          fs.remove(path1, err => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        }));
      }
      this.handleGitPromise(Promise.all(promises), event, args);
    });
  }
}
