import { app, dialog, ipcMain, shell } from 'electron';
import { SettingsModel } from '@light-git/shared/src/SettingsModel';
import type { SettingsData } from '@light-git/shared';
import * as fs from 'fs-extra';
import { mkdirpSync } from 'fs-extra';

import { GitClient } from './git/GitClient';
import * as path from 'path';
import { autoUpdater } from 'electron-updater';
import { SYNC_CHANNELS, ASYNC_CHANNELS } from '@light-git/shared/src/Channels';
import type { AppSyncApi, AppAsyncApi } from '@light-git/shared/src/api-types';
import { GenericApplication } from './genericApplication';
import { CodeWatcherModel } from '@light-git/shared/src/code-watcher.model';
import { setupApiHandlers } from '@superflag/super-ipc-backend';
import type { BackendSyncHandlersType, BackendAsyncHandlersType } from '@superflag/super-ipc-backend';

const opn = require('opn');

export class MainApplication extends GenericApplication {
  private static readonly STATS_GENERAL = 'general';
  private updateDownloaded = false;
  private updateDownloadedVersion: string;
  private settings: SettingsModel = new SettingsModel();
  private userInitiatedUpdate = false;
  private isWatchingSettingsDir: fs.FSWatcher;
  private loadedRepos: { [key: string]: Promise<void> } = {};
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

  saveSettings(settingsModel: SettingsData) {
    Object.assign(this.settings, settingsModel);
    GitClient.settings = this.settings;

    let watchersToSave: Map<string, CodeWatcherModel[]> = new Map();

    settingsModel.loadedCodeWatchers.forEach((w) => {
      if (!watchersToSave.has(w.path)) {
        watchersToSave.set(w.path, []);
      }
      watchersToSave.get(w.path).push(w);
    });
    Array.from(watchersToSave.entries()).forEach(([file, watchers]) => {
      mkdirpSync(path.dirname(file));
      this.saveWatchers(file, watchers);
    });

    delete settingsModel.loadedCodeWatchers;
    delete settingsModel.codeWatchers;
    let userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      mkdirpSync(userDataPath);
    }
    fs.writeFileSync(
      this.getSettingsPath(),
      JSON.stringify(settingsModel, null, '   '),
      { encoding: 'utf8' },
    );
  }

  loadSettingsAsync(): Promise<SettingsModel> {
    return new Promise((resolve) => {
      this.loadSettingsCallback((settings) => resolve(settings));
    });
  }

  loadSettingsCallback(callback: Function) {
    if (fs.existsSync(this.getSettingsPath())) {
      fs.readFile(this.getSettingsPath(), 'utf8', (err, data) => {
        if (err) {
          throw err;
        }
        const res: SettingsModel = Object.assign(
          new SettingsModel(),
          JSON.parse(data),
        );
        if (res.codeWatcherPaths.length == 0) {
          res.codeWatcherPaths = [this.getDefaultWatcherPath()];
        }
        Object.assign(this.settings, res);
        GitClient.settings = this.settings;
        this.sendEvent(
          MainApplication.STATS_GENERAL,
          'tabs-open',
          this.settings.tabNames.length,
        );
        this.sendEvent(MainApplication.STATS_GENERAL, 'version', this.version);

        let done: { [path: string]: CodeWatcherModel[] } = {};
        if (this.settings.codeWatcherPaths.length > 0) {
          this.settings.codeWatcherPaths.forEach((p) => {
            done[p] = undefined;
            this.loadWatchers(p, (watcherPath, watchers) => {
              done[watcherPath] = watchers;
              if (Object.values(done).every((w) => !!w)) {
                this.settings.loadedCodeWatchers = Object.values(done).reduce(
                  (acc: CodeWatcherModel[], b: CodeWatcherModel[]) =>
                    acc.concat(b),
                );
                if (!!this.settings.codeWatchers) {
                  this.settings.codeWatchers.forEach(
                    (w) => (w.path = this.getDefaultWatcherPath()),
                  );
                  this.settings.loadedCodeWatchers =
                    this.settings.loadedCodeWatchers.concat(
                      this.settings.codeWatchers,
                    );
                  delete this.settings.codeWatchers;
                }
                callback(this.settings);
              }
            });
          });
        } else {
          this.settings.codeWatcherPaths = [this.getDefaultWatcherPath()];
          this.settings.loadedCodeWatchers = SettingsModel.defaultCodeWatchers;
          this.settings.loadedCodeWatchers.forEach(
            (w) => (w.path = this.getDefaultWatcherPath()),
          );
          if (!!this.settings.codeWatchers) {
            this.settings.codeWatchers.forEach(
              (w) => (w.path = this.getDefaultWatcherPath()),
            );
            this.settings.loadedCodeWatchers =
              this.settings.loadedCodeWatchers.concat(
                this.settings.codeWatchers,
              );
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
    try {
      fs.writeFileSync(path, JSON.stringify(watchers, null, '   '), {
        encoding: 'utf8',
      });
    } catch (e) {
      this.logger.error(e);
    }
  }

  loadWatchers(
    path: string,
    callback: (path: string, watchers: CodeWatcherModel[]) => void,
  ) {
    if (fs.existsSync(path)) {
      fs.readFile(path, 'utf8', (err, data) => {
        if (err) {
          callback(path, []);
          return;
        }
        try {
          let res: CodeWatcherModel[] = JSON.parse(data);
          res.forEach((w) => (w.path = path));
          callback(path, res);
        } catch (e) {
          callback(path, []);
        }
      });
    } else {
      callback(path, []);
    }
  }

  sendEvent(
    category: string,
    action: string,
    label: string | number,
    value?: number,
  ) {
    if (this.analytics) {
      this.analytics
        .event({
          ec: category,
          ea: action,
          el: label + '',
          ev: value,
        })
        .send();
    }
  }

  getSettingsPath() {
    return path.join(app.getPath('userData'), 'settings.json');
  }

  getDefaultWatcherPath() {
    return path.join(app.getPath('userData'), 'watchers.json');
  }

  stopWatchingSettings() {
    if (this.isWatchingSettingsDir) {
      this.isWatchingSettingsDir.close();
    }
  }

  loadRepoInfo(repoPath: string): Promise<void> {
    this.gitClients[repoPath] = new GitClient(repoPath);
    this.loadedRepos[repoPath] = this.gitClients[repoPath].checkIfGitRepo();
    return this.loadedRepos[repoPath];
  }

  start() {
    super.start();
    this.checkForUpdates();
    this.configureApp();
    setupApiHandlers(app, this.getSyncHandlers(), this.getAsyncHandlers(), ipcMain);
    setTimeout(
      () => this.sendEvent('general', 'window-opened', 'main-window'),
      20000,
    );
  }

  checkForUpdates() {
    if (app.isPackaged) {
      autoUpdater.allowPrerelease = this.settings.allowPrerelease;
      autoUpdater.checkForUpdates().catch((error) => {
        if (this.userInitiatedUpdate) {
          this.notifier.notify({
            title: this.notificationTitle,
            message:
              'An error occurred while updating, no changes were made. Check error log for more details',
            icon: this.iconFile,
          });
        }
        this.userInitiatedUpdate = false;
        this.logger.error(error);
      });
    }
  }

  configureApp() {
    app.setAppUserModelId('com.blakestacks.light-git-client');
    app.setAsDefaultProtocolClient('light-git');

    autoUpdater.on('update-not-available', (info) => {
      if (this.userInitiatedUpdate) {
        this.notifier.notify({
          title: this.notificationTitle,
          message:
            "You're currently running the latest version (" +
            info.version +
            ')! Enjoy!',
          icon: this.iconFile,
        });
      }
      this.userInitiatedUpdate = false;
    });
    autoUpdater.on('update-available', (info) => {
      if (!this.updateDownloaded && !this.updateDownloadedVersion) {
        this.notifier.notify({
          title: this.notificationTitle,
          message:
            'Version ' +
            info.version +
            ' is now available and is being downloaded',
          icon: this.iconFile,
        });
        this.userInitiatedUpdate = false;
        this.updateDownloadedVersion = info.version;
      }
    });
    autoUpdater.on('error', (error) => {
      if (this.userInitiatedUpdate) {
        this.notifier.notify({
          title: this.notificationTitle,
          message:
            'An error occurred while updating, no changes were made. Check error log for more details',
          icon: this.iconFile,
        });
      }
      this.userInitiatedUpdate = false;
      this.logger.error(error);
    });
    autoUpdater.on('update-downloaded', (info) => {
      if (!this.updateDownloaded) {
        this.notifier.notify({
          title: this.notificationTitle,
          message:
            'Version ' +
            info.version +
            ' will install the next time you start the app',
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

  /**
   * Returns typed synchronous IPC handlers for super-ipc
   */
  getSyncHandlers(): BackendSyncHandlersType<SYNC_CHANNELS, AppSyncApi> {
    return {
      // --- Git Read Operations ---
      [SYNC_CHANNELS.GetFileChanges]: async ({ args }) => {
        return await this.gitClients[args.repoPath].getChanges();
      },
      [SYNC_CHANNELS.GetLocalBranches]: async ({ args }) => {
        return await this.gitClients[args.repoPath].getLocalBranches();
      },
      [SYNC_CHANNELS.GetRemoteBranches]: async ({ args }) => {
        return await this.gitClients[args.repoPath].getRemoteBranches();
      },
      [SYNC_CHANNELS.GetSubmodules]: async ({ args }) => {
        return await this.gitClients[args.repoPath].getSubmodules();
      },
      [SYNC_CHANNELS.GetWorktrees]: async ({ args }) => {
        return await this.gitClients[args.repoPath].getWorktrees();
      },
      [SYNC_CHANNELS.GetStashes]: async ({ args }) => {
        return await this.gitClients[args.repoPath].getStashes();
      },
      [SYNC_CHANNELS.GetCommitHistory]: async ({ args }) => {
        return await this.gitClients[args.repoPath].getCommitHistory(
          args.count,
          args.skip,
          args.activeBranch,
        );
      },
      [SYNC_CHANNELS.GetFileDiff]: async ({ args }) => {
        return await this.gitClients[args.repoPath].getDiffPaginated(
          args.unstaged,
          args.staged,
          args.cursor ?? null,
          args.maxLines ?? 500,
        );
      },
      [SYNC_CHANNELS.CommitDiff]: async ({ args }) => {
        return await this.gitClients[args.repoPath].getCommitDiff(args.hash);
      },
      [SYNC_CHANNELS.StashDiff]: async ({ args }) => {
        return await this.gitClients[args.repoPath].getStashDiff(args.index);
      },
      [SYNC_CHANNELS.GetBranchPremerge]: async ({ args }) => {
        return await this.gitClients[args.repoPath].getBranchPremerge(args.branchHash);
      },
      [SYNC_CHANNELS.GetDeletedStashes]: async ({ args }) => {
        return await this.gitClients[args.repoPath].getDeletedStashes();
      },
      [SYNC_CHANNELS.GetConfigItems]: async ({ args }) => {
        if (this.gitClients[args.repoPath]) {
          return await this.gitClients[args.repoPath].getConfigItems();
        }
        return [];
      },
      [SYNC_CHANNELS.GetCommandHistory]: async ({ args }) => {
        return await this.gitClients[args.repoPath].getCommandHistory();
      },
      [SYNC_CHANNELS.CheckGitBashVersions]: async ({ args }) => {
        return await new GitClient(args.repoPath).checkGitBashVersions();
      },

      // --- Git Write Operations ---
      [SYNC_CHANNELS.GitStage]: async ({ args }) => {
        await this.gitClients[args.repoPath].stage(args.files);
      },
      [SYNC_CHANNELS.GitUnstage]: async ({ args }) => {
        await this.gitClients[args.repoPath].unstage(args.files);
      },
      [SYNC_CHANNELS.Commit]: async ({ args }) => {
        await this.gitClients[args.repoPath].commit(
          args.message,
          args.push,
          args.branch,
          args.amend,
        );
      },
      [SYNC_CHANNELS.Checkout]: async ({ args }) => {
        await this.gitClients[args.repoPath].checkout(
          args.branch,
          args.toNewBranch,
          '',
          args.andPull,
        );
      },
      [SYNC_CHANNELS.Push]: async ({ args }) => {
        await this.gitClients[args.repoPath].pushBranch(args.branch, args.force);
      },
      [SYNC_CHANNELS.Pull]: async ({ args }) => {
        await this.gitClients[args.repoPath].pull(args.force);
      },
      [SYNC_CHANNELS.Fetch]: async ({ args }) => {
        await this.gitClients[args.repoPath].fetch();
      },
      [SYNC_CHANNELS.Merge]: async ({ args }) => {
        await this.gitClients[args.repoPath].merge(args.file, args.mergetool);
      },
      [SYNC_CHANNELS.MergeBranch]: async ({ args }) => {
        await this.gitClients[args.repoPath].mergeBranch(args.branch);
      },
      [SYNC_CHANNELS.RebaseBranch]: async ({ args }) => {
        await this.gitClients[args.repoPath].rebaseBranch(args.branch, args.interactive);
      },
      [SYNC_CHANNELS.HardReset]: async ({ args }) => {
        await this.gitClients[args.repoPath].hardReset();
      },
      [SYNC_CHANNELS.CreateBranch]: async ({ args }) => {
        await this.gitClients[args.repoPath].createBranch(args.branchName);
      },
      [SYNC_CHANNELS.DeleteBranch]: async ({ args }) => {
        await this.gitClients[args.repoPath].deleteBranch(args.branches);
      },
      [SYNC_CHANNELS.RenameBranch]: async ({ args }) => {
        await this.gitClients[args.repoPath].renameBranch(args.oldName, args.newName);
      },
      [SYNC_CHANNELS.FastForwardBranch]: async ({ args }) => {
        await this.gitClients[args.repoPath].fastForward(args.branch);
      },
      [SYNC_CHANNELS.CherryPickCommit]: async ({ args }) => {
        await this.gitClients[args.repoPath].cherryPickCommit(args.hash);
      },
      [SYNC_CHANNELS.RevertCommit]: async ({ args }) => {
        await this.gitClients[args.repoPath].revertCommit(args.hash);
      },
      [SYNC_CHANNELS.ResetToCommit]: async ({ args }) => {
        await this.gitClients[args.repoPath].resetToCommit(args.hash, args.mode);
      },
      [SYNC_CHANNELS.UndoFileChanges]: async ({ args }) => {
        await this.gitClients[args.repoPath].undoFileChanges(
          args.files,
          args.revision,
          args.staged,
        );
      },
      [SYNC_CHANNELS.UndoSubmoduleChanges]: async ({ args }) => {
        await this.gitClients[args.repoPath].undoSubmoduleChanges(args.submodules);
      },
      [SYNC_CHANNELS.Stash]: async ({ args }) => {
        await this.gitClients[args.repoPath].stash(args.unstagedOnly, args.stashName || '');
      },
      [SYNC_CHANNELS.ApplyStash]: async ({ args }) => {
        await this.gitClients[args.repoPath].applyStash(args.index);
      },
      [SYNC_CHANNELS.DeleteStash]: async ({ args }) => {
        await this.gitClients[args.repoPath].deleteStash(args.index);
      },
      [SYNC_CHANNELS.RestoreDeletedStash]: async ({ args }) => {
        await this.gitClients[args.repoPath].restoreDeletedStash(args.stashHash);
      },
      [SYNC_CHANNELS.ChangeHunk]: async ({ args }) => {
        await this.gitClients[args.repoPath].changeHunk(
          path.join(args.repoPath, args.filename),
          args.hunk,
          args.changedText,
        );
      },
      [SYNC_CHANNELS.ResolveConflictUsing]: async ({ args }) => {
        await this.gitClients[args.repoPath].resolveConflictUsing(args.file, args.useTheirs);
      },
      [SYNC_CHANNELS.ChangeActiveOperation]: async ({ args }) => {
        await this.gitClients[args.repoPath].changeActiveOperation(args.op, args.abort);
      },
      [SYNC_CHANNELS.SetConfigItem]: async ({ args }) => {
        await this.gitClients[args.repoPath].setConfigItem(args.item);
      },
      [SYNC_CHANNELS.SetGitSettings]: async ({ args }) => {
        await this.gitClients[args.repoPath].setBulkGitSettings(args.settings, args.scope);
      },
      [SYNC_CHANNELS.DeleteWorktree]: async ({ args }) => {
        await this.gitClients[args.repoPath].deleteWorktree(args.worktreePath);
      },
      [SYNC_CHANNELS.UpdateSubmodules]: async ({ args }) => {
        await this.gitClients[args.repoPath].updateSubmodules(args.recursive, args.path);
      },
      [SYNC_CHANNELS.AddSubmodule]: async ({ args }) => {
        await this.gitClients[args.repoPath].addSubmodule(args.url, args.path);
      },
      [SYNC_CHANNELS.DeleteFiles]: async ({ args }) => {
        let files = args.files.map((f) => f.replace(/["']/g, ''));
        const promises = files.map(
          (f) =>
            new Promise<void>((resolve, reject) => {
              const fullPath = path.join(args.repoPath, f);
              fs.remove(fullPath, (err) => {
                if (err) reject(err);
                else resolve();
              });
            }),
        );
        await Promise.all(promises);
      },

      // --- Repo / Settings ---
      [SYNC_CHANNELS.LoadRepo]: async ({ args }) => {
        return await this.loadRepoInfo(args.repoPath);
      },
      [SYNC_CHANNELS.LoadSettings]: async ({ event }) => {
        const settings = await this.loadSettingsAsync();

        if (!this.isWatchingSettingsDir) {
          this.isWatchingSettingsDir = fs.watch(
            this.getSettingsPath(),
            () => {
              this.loadSettingsAsync().then((updatedSettings) => {
                if (!event.sender.isDestroyed()) {
                  event.sender.send(
                    SYNC_CHANNELS.SettingsChanged,
                    updatedSettings,
                  );
                }
              });
            },
          );
        }

        return settings;
      },
      [SYNC_CHANNELS.SaveSettings]: async ({ args }) => {
        this.saveSettings(args.settings);
      },
      [SYNC_CHANNELS.SettingsChanged]: async () => {
        throw new Error('SettingsChanged is a push-only channel and should not be invoked directly.');
      },

      // --- System / UI ---
      [SYNC_CHANNELS.OpenFolder]: async ({ args }) => {
        const target = args.path || args.repoPath;
        if (target) {
          shell.openPath(target);
        }
      },
      [SYNC_CHANNELS.OpenUrl]: async ({ args }) => {
        if (args.app) {
          opn(args.url, { app: args.app });
        } else {
          opn(args.url);
        }
      },
      [SYNC_CHANNELS.OpenTerminal]: async ({ args }) => {
        this.gitClients[args.repoPath].openTerminal();
      },
      [SYNC_CHANNELS.OpenDevTools]: async () => {
        this.window.webContents.openDevTools();
      },
      [SYNC_CHANNELS.OpenFileDialog]: async ({ args }) => {
        return dialog.showOpenDialogSync(args.options);
      },
      [SYNC_CHANNELS.Log]: async ({ args }) => {
        this.logger.error(
          new Date().toLocaleString() +
            ' ------------------------------------------------',
        );
        this.logger.error(args.message);
      },
      [SYNC_CHANNELS.CloseWindow]: async () => {
        this.window.close();
      },
      [SYNC_CHANNELS.Minimize]: async () => {
        this.window.minimize();
      },
      [SYNC_CHANNELS.Restore]: async () => {
        if (this.window.isMaximized()) {
          this.window.restore();
        } else {
          this.window.maximize();
        }
      },

      // --- Updates ---
      [SYNC_CHANNELS.GetVersion]: async () => {
        return this.version;
      },
      [SYNC_CHANNELS.CheckForUpdates]: async () => {
        this.userInitiatedUpdate = true;
        this.checkForUpdates();
      },
      [SYNC_CHANNELS.IsUpdateDownloaded]: async () => {
        return {
          downloaded: this.updateDownloaded,
          version: this.updateDownloadedVersion,
        };
      },
      [SYNC_CHANNELS.RestartAndInstallUpdate]: async () => {
        autoUpdater.quitAndInstall();
      },

      // --- Events ---
      [SYNC_CHANNELS.CommandHistoryChanged]: async () => {
        throw new Error('CommandHistoryChanged is a push-only channel and should not be invoked directly.');
      },
    };
  }

  /**
   * Returns typed asynchronous IPC handlers for super-ipc (streaming operations)
   */
  getAsyncHandlers(): BackendAsyncHandlersType<ASYNC_CHANNELS, AppAsyncApi> {
    return {
      [ASYNC_CHANNELS.Clone]: async ({ args, handlers }) => {
        const { onProgress, onComplete, onError } = handlers;
        new GitClient(args.repoPath)
          .clone(args.url, args.targetPath)
          .subscribe({
            next: (eventData) => {
              if (eventData.done) {
                onComplete({ success: true });
              } else {
                onProgress({
                  out: eventData.out,
                  err: eventData.error,
                  done: false,
                });
              }
            },
            error: (err) => {
              onError(err);
            },
          });
      },
      [ASYNC_CHANNELS.AddWorktree]: async ({ args, handlers }) => {
        const { onProgress, onComplete, onError } = handlers;
        this.gitClients[args.repoPath]
          .addWorktree(args.worktreePath, args.branch)
          .subscribe({
            next: (eventData) => {
              if (eventData.done) {
                onComplete({ success: true });
              } else {
                onProgress({
                  out: eventData.out,
                  err: eventData.error,
                  done: false,
                });
              }
            },
            error: (err) => {
              onError(err);
            },
          });
      },
    };
  }
}
