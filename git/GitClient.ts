import {RepositoryModel} from '../shared/git/Repository.model';
import {BranchModel} from '../shared/git/Branch.model';
import {ChangeType, CommitModel, LightChange} from '../shared/git/Commit.model';
import * as path from 'path';
import {CommitGraphNode, CommitSummaryModel} from '../shared/git/CommitSummary.model';
import {CommandHistoryModel} from '../shared/git/command-history.model';
import {SettingsModel} from '../shared/SettingsModel';
import {WorktreeModel} from '../shared/git/worktree.model';
import {logger} from 'codelyzer/util/logger';
import {StashModel} from '../shared/git/stash.model';
import {DiffHeaderModel, DiffHeaderStagedState} from '../shared/git/diff.header.model';
import {ConfigItemModel} from '../shared/git/config-item.model';
import * as fs from 'fs';
import {ErrorModel} from '../shared/common/error.model';
import {DiffHunkModel} from '../shared/git/diff.hunk.model';
import {DiffLineModel, LineState} from '../shared/git/diff.line.model';
import * as serializeError from 'serialize-error';
import {spawn} from 'child_process';
import {SubmoduleModel} from '../shared/git/submodule.model';

const exec = require('child_process').exec;

export class GitClient {
  static logger: Console;
  static settings: SettingsModel;
  private commandHistory: CommandHistoryModel[] = [];

  constructor(private workingDir: string) {
  }

  getCommitDiff(commitHash: any): Promise<DiffHeaderModel[]> {
    return new Promise<DiffHeaderModel[]>((resolve, reject) => {
      this.execute(
        this.getGitPath() + ' diff' + (GitClient.settings.diffIgnoreWhitespace ? ' -w' : '') + ' ' + commitHash + '~ ' + commitHash,
        'Get Diff for Commit')
          .then(text => {
            resolve(this.parseDiffString(text, DiffHeaderStagedState.NONE));
          })
          .catch(err => reject(serializeError(err)));
    });
  }

  getBranchPremerge(branch: BranchModel): Promise<DiffHeaderModel[]> {
    return new Promise<DiffHeaderModel[]>((resolve, reject) => {
      this.execute(
        this.getGitPath() + ' diff' + (GitClient.settings.diffIgnoreWhitespace ? ' -w' : '') + ' ' + branch.currentHash + '...',
        'Get Premerge Diff')
          .then(text => {
            resolve(this.parseDiffString(text, DiffHeaderStagedState.NONE));
          })
          .catch(err => reject(serializeError(err)));
    });
  }

  getCommandHistory(listenCallback: (history: CommandHistoryModel[]) => any): Promise<CommandHistoryModel[]> {
    this.commandHistoryListener = listenCallback;
    return Promise.resolve(this.commandHistory);
  }

  getConfigItems(): Promise<ConfigItemModel[]> {
    return new Promise<ConfigItemModel[]>((resolve, reject) => {
      this.execute(this.getGitPath() + ' config --list --show-origin', 'Get Config Items').then(text => {
        // console.log(text);
        let configItem = /^(.*?)\t(.*)=(.*)$/gm;
        let match = configItem.exec(text);
        let result: ConfigItemModel[] = [];
        while (match) {
          // console.log(match);
          result.push(new ConfigItemModel(match[2], match[3], match[1]));
          match = configItem.exec(text);
        }
        resolve(result);
      }).catch(err => reject(serializeError(err)));
    });
  }

  setConfigItem(item: ConfigItemModel): Promise<ConfigItemModel[]> {
    return new Promise<ConfigItemModel[]>((resolve, reject) => {
      const command = this.getBashedGit() + ' config ' + (item.value ? '--replace-all ' : '') +
        (item.sourceFile.trim() ? '--file ' + item.sourceFile.replace(/^.*?:/, '') + ' ' : '') +
        (item.value ? '' : '--unset ') + item.key + ' ' + (item.value ? '"' + item.value + '"' : '');
      this.execute(command, 'Set Config Item')
          .then(text => this.getConfigItems().then(resolve).catch(err => reject(serializeError(err))))
          .catch(err => reject(serializeError(err)));
    });
  }

  openRepo(): Promise<RepositoryModel> {
    return new Promise<RepositoryModel>((resolve, reject) => {
      if (!fs.existsSync(path.join(this.workingDir, '.git'))) {
        reject('Not a valid git repository');
        return;
      }
      this.getBranches().then(rep => {
        let res = Object.assign(new RepositoryModel(), rep || {});
        res.path = this.workingDir;
        res.name = path.basename(this.workingDir);
        resolve(res);
      }).catch(err => reject(serializeError(err)));
    });
  }

  getChanges(): Promise<CommitModel> {
    return new Promise<CommitModel>((resolve, reject) => {
      let result = new CommitModel();
      let changeList = /^(.)(.)\s*(.*)$/gm;
      this.execute(this.getGitPath() + '  status --porcelain', 'Get Status').then(text => {
        let match = changeList.exec(text);
        while (match) {
          if (match[1] !== ChangeType.Untracked && match[1] !== ' ') {
            let change = new LightChange();
            change.staged = false;
            change.file = match[3];
            change.change = match[1];
            result.stagedChanges.push(change);
          }
          if (match[2] !== ' ') {
            let change = new LightChange();
            change.staged = false;
            change.file = match[3];
            change.change = match[2];
            result.unstagedChanges.push(change);
          }
          match = changeList.exec(text);
        }
      }).then(ignore => resolve(result)).catch(error => reject(serializeError(error)));
    });
  }

  stage(file: string) {
    return new Promise<CommitModel>((resolve, reject) => {
      this.execute(this.getGitPath() + ' add -- ' + file, 'Stage File')
          .then(text => this.getChanges().then(resolve).catch(err => reject(serializeError(err))))
          .catch(err => reject(serializeError(err)));
    });
  }

  unstage(file: string) {
    return new Promise<CommitModel>((resolve, reject) => {
      this.execute(this.getGitPath() + ' reset -- ' + file, 'Unstage File')
          .then(text => this.getChanges().then(resolve).catch(err => reject(serializeError(err))))
          .catch(err => reject(serializeError(err)));
    });
  }

  deleteBranch(branch: string) {
    return new Promise<RepositoryModel>((resolve, reject) => {
      this.execute(this.getGitPath() + ' branch -d -- ' + branch, 'Delete Branch')
          .then(text => this.getBranches().then(resolve).catch(err => reject(serializeError(err))))
          .catch(err => reject(serializeError(err)));
    });
  }

  mergeBranch(branch: string) {
    return new Promise<RepositoryModel>((resolve, reject) => {
      this.execute(this.getGitPath() + ' merge -- ' + branch, 'Merge Branch into Current Branch')
          .then(text => this.getBranches().then(resolve).catch(err => reject(serializeError(err))))
          .catch(err => reject(serializeError(err)));
    });
  }

  changeHunk(filename: string, hunk: DiffHunkModel, changedText: string) {
    return new Promise<CommitModel>((resolve, reject) => {
      fs.readFile(filename, (err, data) => {
        if (err) {
          reject(err);
          return;
        }
        let text = data.toString();
        let eol = /\r?\n/g;
        let match = null;
        let start = 0, end = 0, currentLine = 1;
        while (match || currentLine == 1) {
          if (hunk.toStartLine == currentLine) {
            if (!match) {
              start = 0;
            } else {
              start = match.index + match[0].length;
            }
          } else if (hunk.toStartLine + hunk.toNumLines == currentLine) {
            end = match.index;
            break;
          }
          currentLine++;
          match = eol.exec(text);
        }
        if (end == 0) {
          end = text.length;
        }
        let modified = text.substring(0, start) + changedText + text.substring(end);
        fs.writeFile(filename, modified, (err) => {
          if (err) {
            reject(err);
            return;
          }
          this.getChanges().then(resolve).catch(err => reject(serializeError(err)));
        });
      });
    });
  }

  fetch() {
    return new Promise<RepositoryModel>((resolve, reject) => {
      this.execute(this.getGitPath() + ' fetch -p', 'Fetch Remote Branches')
          .then(text => this.getBranches().then(resolve).catch(err => reject(serializeError(err))))
          .catch(err => reject(serializeError(err)));
    });
  }

  renameBranch(oldName: string, newName: string) {
    return new Promise<RepositoryModel>((resolve, reject) => {
      this.execute(this.getGitPath() + ' branch -m ' + oldName + ' ' + newName, 'Rename Branch')
          .then(text => this.getBranches().then(resolve).catch(err => reject(serializeError(err))))
          .catch(err => reject(serializeError(err)));
    });
  }

  createBranch(branchName: string) {
    return new Promise<RepositoryModel>((resolve, reject) => {
      this.execute(this.getGitPath() + ' checkout -b ' + branchName, 'Create Branch')
          .then(text => this.getBranches().then(resolve).catch(err => reject(serializeError(err))))
          .catch(err => reject(serializeError(err)));
    });
  }

  deleteWorktree(worktree: string) {
    return new Promise<RepositoryModel>((resolve, reject) => {
      this.execute(this.getGitPath() + ' worktree remove ' + worktree, 'Delete Worktree')
          .then(text => this.getBranches().then(resolve).catch(err => reject(serializeError(err))))
          .catch(err => reject(serializeError(err)));
    });
  }

  openTerminal() {
    const command = 'start "Bash Command Window" ' + this.getBashPath() + ' --login';
    this.execute(command, 'Open Terminal').then(console.log).catch(error => {
      console.error(JSON.stringify(serializeError(error)));
      logger.error(JSON.stringify(serializeError(error)));
    });
  }

  getDiff(unstaged: string, staged: string): Promise<DiffHeaderModel[]> {
    return new Promise<DiffHeaderModel[]>((resolve, reject) => {
      let promises = [];
      if (unstaged.trim()) {
        let command: string = this.getGitPath() + ' diff' + (GitClient.settings.diffIgnoreWhitespace ? ' -w' : '') + ' -- ' +
          unstaged;
        promises.push(this.execute(command, 'Get Unstaged Changes Diff')
                          .then(text => this.parseDiffString(text, DiffHeaderStagedState.UNSTAGED)));
      }
      if (staged.trim()) {
        let command: string = this.getGitPath() + ' diff' + (GitClient.settings.diffIgnoreWhitespace ? ' -w' : '') + ' --staged -- ' +
          staged;
        promises.push(this.execute(command, 'Get Staged Changes Diff')
                          .then(text => this.parseDiffString(text, DiffHeaderStagedState.STAGED)));
      }
      Promise.all(promises).then(diffArray => {
        let result = [];
        diffArray.forEach(x => result = result.concat(x));
        resolve(result);
      }).catch(err => {
        let message: string = err.message || serializeError(err);
        if (message.indexOf('stdout maxBuffer length exceeded') >= 0) {
          message = 'Files too large to diff. Please reduce the file size';
        }
        reject(message);
      });
    });
  }

  commit(message: string, push: boolean): Promise<CommitModel> {
    return new Promise<CommitModel>((resolve, reject) => {
      let s = message.replace(/\"/g, '').replace(/\r?\n/g, '" -m "');
      this.execute(
        this.getBashedGit() + '  commit -m "' + s + '"' + (push ? '\' && ' + this.getGitPath() + '  push' : ''),
        'Commit')
          .then(text => this.getChanges().then(resolve).catch(err => reject(serializeError(err))))
          .catch(err => reject(serializeError(err)));
    });
  }

  checkout(tag: string, toNewBranch: boolean, branchName: string = ''): Promise<CommitModel> {
    return new Promise<CommitModel>((resolve, reject) => {
      this.execute(this.getGitPath() + ' checkout ' + tag + (toNewBranch ? ' -b ' + (branchName || tag.replace(
        'origin/',
        '')) : ''), 'Checkout')
          .then(text => this.getChanges().then(resolve).catch(err => reject(serializeError(err))))
          .catch(err => reject(serializeError(err)));
    });
  }

  undoFileChanges(file: string, revision: string): Promise<CommitModel> {
    return new Promise<CommitModel>((resolve, reject) => {
      this.execute(this.getGitPath() + ' checkout ' + (revision || 'HEAD') + ' -- ' + file, 'Undo File Changes')
          .then(text => this.getChanges().then(resolve).catch(err => reject(serializeError(err))))
          .catch(err => reject(serializeError(err)));
    });
  }

  hardReset(): Promise<CommitModel> {
    return new Promise<CommitModel>((resolve, reject) => {
      this.execute(this.getGitPath() + ' reset --hard', 'Hard Reset/Undo All')
          .then(text => this.getChanges().then(resolve).catch(err => reject(serializeError(err))))
          .catch(err => reject(serializeError(err)));
    });
  }

  merge(file: string, tool: string): Promise<CommitModel> {
    return new Promise<CommitModel>((resolve, reject) => {
      this.execute(this.getGitPath() + ' mergetool --tool=' + (tool || 'meld') + ' ' + file, 'Resolve Merge Conflict')
          .then(text => this.getChanges().then(resolve).catch(err => reject(serializeError(err))))
          .catch(err => reject(serializeError(err)));
    });
  }

  stash(unstagedOnly: boolean, stashName: string): Promise<CommitModel> {
    return new Promise<CommitModel>((resolve, reject) => {
      const command = this.getBashedGit() + ' stash push' + (unstagedOnly ? ' -k -u' : '') + (stashName ? ' -m "' + stashName + '"' : '');
      this.execute(
        command,
        'Stash Changes')
          .then(text => this.getChanges().then(resolve).catch(err => reject(serializeError(err))))
          .catch(err => reject(serializeError(err)));
    });
  }

  applyStash(index: number): Promise<CommitModel> {
    return new Promise<CommitModel>((resolve, reject) => {
      this.execute(this.getBashedGit() + ' stash apply --index ' + index, 'Apply Stashed Changes')
          .then(text => this.getChanges().then(resolve).catch(err => reject(serializeError(err))))
          .catch(err => reject(serializeError(err)));
    });
  }

  deleteStash(index: number): Promise<CommitModel> {
    return new Promise<CommitModel>((resolve, reject) => {
      this.execute(this.getBashedGit() + ' stash drop stash@{' + index + '}', 'Delete Stash')
          .then(text => this.getChanges().then(resolve).catch(err => reject(serializeError(err))))
          .catch(err => reject(serializeError(err)));
    });
  }

  pushBranch(branch: string, force: boolean): Promise<CommitModel> {
    return new Promise<CommitModel>((resolve, reject) => {
      this.execute(
        this.getGitPath() + ' push origin ' + (branch ? branch + ':' + branch : '') + (force ? ' --force' : ''),
        'Push')
          .then(text => this.getChanges().then(resolve).catch(err => reject(serializeError(err))))
          .catch(err => reject(serializeError(err)));
    });
  }

  updateSubmodules(branch: string, recursive: boolean): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      this.execute(
        this.getGitPath() + ' submodule update --init' + (recursive ? ' --recursive' : '') + ' -- ' + (branch || '.'),
        'Update Submodule')
          .then(resolve)
          .catch(err => reject(serializeError(err)));
    });
  }

  addSubmodule(url: string, path: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      this.execute(
        this.getGitPath() + ' submodule add ' + url + (path ? ' ' + path : ''),
        'Update Submodule')
          .then(resolve)
          .catch(err => reject(serializeError(err)));
    });
  }

  checkGitBashVersions(): Promise<{ bash: boolean, git: boolean }> {
    return new Promise<{ bash: boolean, git: boolean }>((resolve, reject) => {
      let result = {git: false, bash: false};
      let promises = [];
      promises.push(this.execute(this.getGitPath() + ' --version', 'Check Git Version')
                        .then(text => result.git = text && text.indexOf('git version') >= 0)
                        .catch(() => result.git = false));
      promises.push(this.execute(this.getBashPath() + ' --version', 'Check Bash Version')
                        .then(text => result.bash = text && text.indexOf('GNU bash') >= 0)
                        .catch(() => result.bash = false));
      Promise.race([
        Promise.all(promises),
        new Promise((resolve1, reject1) => {
          setTimeout(() => reject1(), 1000);
        })]).then(() => resolve(result)).catch(() => reject(result));
    });
  }

  pull(force: boolean): Promise<CommitModel> {
    return new Promise<CommitModel>((resolve, reject) => {
      this.execute(this.getGitPath() + ' pull' + (force ? ' -f' : ''), 'Pull')
          .then(text => {
            this.getChanges().then(resolve).catch(err => reject(serializeError(err)));
          })
          .catch(err => {
            this.getChanges().then(resolve).catch(err => reject(serializeError(err)));
          });
    });
  }

  getCommitHistory(count: number, skip: number): Promise<CommitSummaryModel[]> {
    return new Promise<CommitSummaryModel[]>(((resolve, reject) => {
      this.execute(
        this.getGitPath() + ' log -n' + (count || 50) + ' --skip=' + (skip || 0) + ' --pretty=format:"||||%H|%an|%ae|%ad|%D|%B"\n',
        'Get Commit History')
          .then(text => {
            // this.execute(this.getGitPath() + " log -n300 --pretty=format:\"||||%H|%an|%ae|%ad|%D|%B\"\n --all --full-history", "Get Commit History").then(text => {
            let result: CommitSummaryModel[] = [];
            let branchList = /\|\|\|\|(\S+?)\|(.+?)\|(.+?)\|(.+?)\|(.+?)?\|([^|]*)/g;
            let match = branchList.exec(text);
            while (match) {
              let commitSummary = new CommitSummaryModel();
              commitSummary.hash = match[1];
              commitSummary.authorName = match[2];
              commitSummary.authorEmail = match[3];
              commitSummary.authorDate = new Date(Date.parse(match[4]));
              if (match[5]) {
                commitSummary.currentTags = match[5].split(',').map(x => x.trim());
              }
              commitSummary.message = match[6];
              result.push(commitSummary);
              match = branchList.exec(text);
            }
            this.execute(
              this.getGitPath() + ' log -n' + (count || 50) + ' --skip=' + (skip || 0) + ' --pretty=format:"%H %P"\n',
              'Get Commit Graph')
                .then(text => {
                  let lines = text.split(/\r?\n/g);
                  let oldSurface: string[] = [];
                  let surface: string[] = [];
                  let graph: CommitGraphNode[] = [];
                  let nodeMap: { [hash: string]: CommitGraphNode } = {};

                  for (let i = 0; i < lines.length; i++) {
                    let hashes = lines[i].split(/\s/);
                    if (!nodeMap[hashes[0]]) {
                      let node = new CommitGraphNode();
                      node.hash = hashes[0];
                      nodeMap[hashes[0]] = node;
                    }
                    for (let p of hashes.slice(1)) {
                      if (!nodeMap[p]) {
                        let parent = new CommitGraphNode();
                        parent.hash = p;
                        nodeMap[p] = parent;
                      }
                      nodeMap[hashes[0]].parents.push(nodeMap[p]);
                      nodeMap[p].children.push(nodeMap[hashes[0]]);
                    }
                    graph[i] = nodeMap[hashes[0]];

                    // let existingIndex = surface.indexOf(hashes[0]);
                    // if (existingIndex >= 0) {
                    //   surface[existingIndex] = hashes[1];
                    // } else {
                    //   surface.push(hashes[1]);
                    // }
                    // if (hashes.length > 2) {
                    //   surface.push(...hashes.slice(2));
                    // }
                    //
                    // for(let j=0;j<oldSurface.length;j++){
                    //   if(hashes[0]==oldSurface[j]){
                    //     result[i].graphBlockTargets[j]={source:j,target:j}
                    //   }
                    // }
                    //
                    // oldSurface = surface.map(x => x);
                  }
                  for (let i = 0; i < graph.length; i++) {
                    if(graph[i].children.length==0){
                      result[i].graphBlockTargets=[{}]
                    }
                  }

                  resolve(result);
                });
          });
    }));
  }

  addWorktree(location: string, branch: string, callback: (out: string, err: string, done: boolean) => any) {
    this.executeLive(
      'Add Worktree',
      this.getBashPath().replace(/"/g, ''),
      ['-c', this.getGitPath().replace(/"/g, '') + ' worktree add "' + location + '" ' +
      branch.replace(/^origin\//, '')],
      callback);
  }

  clone(location: string, url: string, callback: (out: string, err: string, done: boolean) => any) {
    this.executeLive(
      'Clone Repository',
      this.getBashPath().replace(/"/g, ''),
      ['-c', this.getGitPath().replace(/"/g, '') + ' clone ' + url + ' "' + location + '"'],
      callback);
  }

  getBranches(): Promise<RepositoryModel> {
    return new Promise<RepositoryModel>(((resolve, reject) => {
      let result = new RepositoryModel();
      let promises = [];
      let branchList = /^(\*)?\s*(\S+)\s+(\S+)\s+(\[\s*(\S+?)(\s*:\s*((ahead|behind)\s+(\d+)),?\s*((behind)\s+(\d+))?)?\])?\s*(.*)?$/gm;
      promises.push(this.execute(this.getGitPath() + ' branch -v -v --track', 'Get Local Branches').then(text => {
        let match = branchList.exec(text);
        while (match) {
          let branchModel = new BranchModel();
          branchModel.isCurrentBranch = match[1] == '*';
          branchModel.name = match[2];
          branchModel.currentHash = match[3];
          branchModel.lastCommitText = match[13];
          branchModel.trackingPath = match[5];
          if (match[8] === 'ahead') {
            branchModel.ahead = +match[9];
            if (match[11] === 'behind') {
              branchModel.behind = +match[12];
            }
          } else if (match[8] === 'behind') {
            branchModel.behind = +match[9];
          }

          result.localBranches.push(branchModel);
          match = branchList.exec(text);
        }
      }).catch(err => new ErrorModel('getLocalBranches', 'getting the list of locals', err)));
      promises.push(this.execute(this.getGitPath() + ' worktree list --porcelain', 'Get Worktrees').then(text => {
        let worktreeList = /^worktree\s+(.+?)$\s*(bare|(HEAD\s+(\S+)$\s*(detached|branch\s+(.+?))$))/gmi;
        let match = worktreeList.exec(text);
        while (match) {
          let worktreeModel = new WorktreeModel();
          worktreeModel.name = path.basename(match[1]);
          worktreeModel.path = match[1];
          worktreeModel.currentBranch = (match[6] || '').replace('refs/heads/', '') || match[5];
          worktreeModel.currentHash = match[4] || match[2];

          result.worktrees.push(worktreeModel);
          match = worktreeList.exec(text);
        }
      }).catch(err => new ErrorModel('getWorktreeList', 'getting the list of worktrees', err)));
      promises.push(this.execute(this.getGitPath() + ' submodule status --recursive', 'Get Submodules').then(text => {
        let submoduleList = /^\s*(\S+)\s+(\S+)\s+\((\S+)\)\s*$/gmi;
        let match = submoduleList.exec(text);
        while (match) {
          let submoduleModel = new SubmoduleModel();
          submoduleModel.hash = match[1];
          submoduleModel.path = match[2];
          submoduleModel.currentBranch = match[3];

          result.submodules.push(submoduleModel);
          match = submoduleList.exec(text);
        }
      }).catch(err => new ErrorModel('getSubmoduleList', 'getting the list of submodules', err)));
      promises.push(this.execute(this.getBashedGit() + ' stash list', 'Get Stashes').then(text => {
        let stashList = /^stash@{(\d+)}:\s+(WIP on|On)\s+(.+):\s+(.*)$/gmi;
        let match = stashList.exec(text);
        while (match) {
          let stashModel = new StashModel();
          stashModel.index = +match[1];
          stashModel.branchName = match[3];
          stashModel.message = match[4];

          result.stashes.push(stashModel);
          match = stashList.exec(text);
        }
      }).catch(err => new ErrorModel('getStashes', 'getting the list of stashes', err)));
      promises.push(this.execute(this.getGitPath() + ' branch -r -v -v', 'Get Remote Branches').then(text => {
        let match = branchList.exec(text);
        while (match) {
          let branchModel = new BranchModel();
          branchModel.name = match[2];
          branchModel.currentHash = match[3];
          branchModel.lastCommitText = match[13];

          result.remoteBranches.push(branchModel);
          match = branchList.exec(text);
        }
      }).catch(err => new ErrorModel('getRemoteBranches', 'getting the list of remote branches', err)));
      Promise.all(promises).then(ignore => {
        let currentBranch = result.localBranches.find(x => x.isCurrentBranch);
        if (currentBranch) {
          let currentBranchPath = currentBranch.name;
          result.worktrees[result.worktrees.findIndex(x => x.currentBranch == currentBranchPath)].isCurrent = true;
        }
        resolve(result);
      }).catch(error => {
        reject(serializeError(error));
      });
    }));
  }

  private commandHistoryListener: (history: CommandHistoryModel[]) => any = () => {
  };

  private parseDiffString(text: string, state: DiffHeaderStagedState): DiffHeaderModel[] {
    let diffHeader = /^diff --git a\/((\s*\S+)+?) b\/((\s*\S+)+?)(\r?\n(?!@@).*)+?((\r?\n(?!diff).*)*)/gm;
    let hunk = /\s*@@ -(\d+)(,(\d+))? \+(\d+)(,(\d+))? @@.*\r?\n(((\r?\n)?(?!@@).*)*)/gm;
    let line = /^([+\- ])(.*)$/gm;
    let headerMatch = diffHeader.exec(text);
    let result: DiffHeaderModel[] = [];
    while (headerMatch) {
      let header = new DiffHeaderModel();
      header.fromFilename = headerMatch[1];
      header.toFilename = headerMatch[3];
      header.stagedState = state;
      let hunkMatch = hunk.exec(headerMatch[6]);
      while (hunkMatch) {
        let h = new DiffHunkModel();
        let startTo = +hunkMatch[1];
        let startFrom = +hunkMatch[4];
        h.fromStartLine = startFrom;
        h.toStartLine = startTo;
        h.fromNumLines = +(hunkMatch[3] || hunkMatch[1]);
        h.toNumLines = +hunkMatch[6];
        let lineMatch = line.exec(hunkMatch[7]);
        // console.log(hunkMatch[6]);
        while (lineMatch) {
          // console.log(lineMatch);
          let l = new DiffLineModel();
          if (lineMatch[1] == ' ') {
            l.state = LineState.SAME;
            l.fromLineNumber = startFrom++;
            l.toLineNumber = startTo++;
            l.text = lineMatch[2];
          } else if (lineMatch[1] == '+') {
            l.state = LineState.ADDED;
            l.fromLineNumber = startFrom;
            l.toLineNumber = startTo++;
            l.text = lineMatch[2];
          } else {
            l.state = LineState.REMOVED;
            l.fromLineNumber = startFrom++;
            l.toLineNumber = startTo;
            l.text = lineMatch[2];
          }
          // console.log('------', l);
          h.lines.push(l);
          lineMatch = line.exec(hunkMatch[7]);
        }
        header.hunks.push(h);
        hunkMatch = hunk.exec(headerMatch[6]);
      }
      result.push(header);
      headerMatch = diffHeader.exec(text);
    }
    return result;
  }

  private getBashedGit() {
    return this.getBashPath() + ' -c \'' + this.getGitPath();
  }

  private getGitPath() {
    return SettingsModel.sanitizePath(GitClient.settings.gitPath);
  }

  private getBashPath() {
    return SettingsModel.sanitizePath(GitClient.settings.bashPath);
  }

  private execute(command: string, name: string): Promise<string> {
    let start = new Date();
    return Promise.race([new Promise<string>((resolve, reject) => {
      exec(
        command + ((command.match(/'/g) || []).length % 2 == 0 ? '' : '\''),
        {cwd: this.workingDir, maxBuffer: 1024 * 1024},
        (error, stdout, stderr) => {
          const commandHistoryModel = new CommandHistoryModel(name,
            command,
            stderr,
            stdout,
            start, new Date().getTime() - start.getTime(),
            !!error);
          this.commandHistory.push(commandHistoryModel);
          this.commandHistoryListener(this.commandHistory);
          if (!error || (stderr && stderr.split(/\r?\n/)
                                         .every(x => x.trim().length == 0 || x.trim().startsWith('warning:')))) {
            resolve(stdout);
          } else {
            console.error(JSON.stringify(commandHistoryModel));
            logger.error(JSON.stringify(commandHistoryModel));
            reject(error || stderr);
          }
        });
    }), new Promise<string>((resolve, reject) => {
      setTimeout(() => {
        reject('command timed out (>' + GitClient.settings.commandTimeoutSeconds + 's): ' + command +
          '\n\nEither adjust the timeout in the Settings menu or ' +
          '\nfind the root cause of the timeout');
      }, GitClient.settings.commandTimeoutSeconds * 1000);
    })]);
  }

  private executeLive(commandName: string,
                      command: string,
                      args: string[],
                      callback: (out: string, error: string, done: boolean) => any) {
    let start = new Date();
    let stderr = '', stdout = '';
    callback(command + ' ' + args.join(' '), undefined, false);
    let progress = spawn(command, args, {cwd: this.workingDir});
    progress.stdout.on('data', data => {
      stdout += data.toString();
      callback(data.toString(), undefined, false);
    });
    progress.stderr.on('data', data => {
      stderr += data.toString();
      callback(undefined, data.toString(), false);
    });
    progress.on('error', err => {
      callback(undefined, JSON.stringify(serializeError(err)), false);
    });
    progress.on('exit', code => {
      callback(undefined, code != 0 ? 'Non-zero exit code: ' + code : undefined, true);
      let commandHistoryModel = new CommandHistoryModel(commandName,
        command + ' ' + args.join(' '),
        stderr,
        stdout,
        start, new Date().getTime() - start.getTime(),
        !!stderr);
      this.commandHistory.push(commandHistoryModel);
      this.commandHistoryListener(this.commandHistory);
    });
  }
}
