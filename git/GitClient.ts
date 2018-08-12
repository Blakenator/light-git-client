import {RepositoryModel} from "../shared/Repository.model";
import {BranchModel} from "../shared/Branch.model";
import {ChangeType, CommitModel, LightChange} from "../shared/Commit.model";
import * as path from "path";
import {CommitSummaryModel} from "../shared/CommitSummary.model";
import {CommandHistoryModel} from "../shared/command-history.model";
import {SettingsModel} from "../shared/SettingsModel";
import {WorktreeModel} from "../shared/worktree.model";

const exec = require('child_process').exec;

export class GitClient {
  private commandHistory: CommandHistoryModel[] = [];

  constructor(private workingDir: string, public settings: SettingsModel) {
  }

  getCommandHistory(): CommandHistoryModel[] {
    return this.commandHistory;
  }

  openRepo(): Promise<RepositoryModel> {
    return new Promise<RepositoryModel>((resolve, reject) => {
      this.getBranches().then(rep => {
        rep.path = this.workingDir;
        rep.name = path.basename(this.workingDir);
        resolve(rep);
      }).catch(reject);
    });
  }

  getChanges(): Promise<CommitModel> {
    return new Promise<CommitModel>((resolve, reject) => {
      let result = new CommitModel();
      let promises = [];
      let changeList = /^(.)(.)\s*(.*)$/gm;
      promises.push(this.execute(this.settings.gitPath + "  status --porcelain", "Get Status").then(text => {
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
      }));
      Promise.all(promises).then(ignore => resolve(result)).catch(ignore => reject(result));
    });
  }

  stage(file: string) {
    return new Promise<CommitModel>((resolve, reject) => {
      this.execute(this.settings.gitPath + " add -- " + file, "Stage File").then(text => this.getChanges().then(resolve).catch(reject));
    });
  }

  unstage(file: string) {
    return new Promise<CommitModel>((resolve, reject) => {
      this.execute(this.settings.gitPath + " reset -- " + file, "Unstage File").then(text => this.getChanges().then(resolve).catch(reject));
    });
  }

  deleteBranch(branch: string) {
    return new Promise<RepositoryModel>((resolve, reject) => {
      this.execute(this.settings.gitPath + " branch -d -- " + branch, "Delete Branch").then(text => this.getBranches().then(resolve).catch(reject));
    });
  }

  deleteWorktree(worktree: string) {
    return new Promise<RepositoryModel>((resolve, reject) => {
      this.execute(this.settings.gitPath + " worktree remove " + worktree, "Delete Worktree").then(text => this.getBranches().then(resolve).catch(reject));
    });
  }

  openTerminal() {
    this.execute("start " + this.settings.bashPath + " --login", "Open Terminal").then(console.log);
  }

  getDiff(unstaged: string, staged: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let command = [];
      if (unstaged.trim()) {
        command.push(this.settings.gitPath + " diff -- " + unstaged);
      }
      if (staged.trim()) {
        command.push(this.settings.gitPath + " diff --staged -- " + staged);
      }
      this.execute(command.join(' && '), "Get Diff").then(resolve).catch(reject);
    });
  }

  commit(message: string, push: boolean): Promise<CommitModel> {
    return new Promise<CommitModel>((resolve, reject) => {
      let s = message.replace(/\"/g, "").replace(/\r?\n/g, '" -m "');
      this.execute(this.settings.bashPath + " -c '" + this.settings.gitPath + "  commit -m \"" + s + "\"" + (push ? "' && " + this.settings.gitPath + "  push" : ""), "Commit").then(text => this.getChanges().then(resolve).catch(reject));
    });
  }

  checkout(tag: string, toNewBranch: boolean, branchName: string = ''): Promise<CommitModel> {
    return new Promise<CommitModel>((resolve, reject) => {
      this.execute(this.settings.gitPath + " checkout " + tag + (toNewBranch ? " -b " + (branchName || tag.replace('origin/', '')) : ""), "Checkout")
        .then(text => this.getChanges().then(resolve).catch(reject)).catch(reject);
    });
  }

  undoFileChanges(file: string, revision: string): Promise<CommitModel> {
    return new Promise<CommitModel>((resolve, reject) => {
      this.execute(this.settings.gitPath + " checkout " + (revision || 'HEAD') + ' -- ' + file, "Undo File Changes")
        .then(text => this.getChanges().then(resolve).catch(reject)).catch(reject);
    });
  }

  hardReset(): Promise<CommitModel> {
    return new Promise<CommitModel>((resolve, reject) => {
      this.execute(this.settings.gitPath + " reset --hard", "Hard Reset/Undo All")
        .then(text => this.getChanges().then(resolve).catch(reject)).catch(reject);
    });
  }

  merge(file: string, tool: string): Promise<CommitModel> {
    return new Promise<CommitModel>((resolve, reject) => {
      this.execute(this.settings.gitPath + " mergetool --tool=" + (tool || 'meld') + ' ' + file, "Resolve Merge Conflict")
        .then(text => this.getChanges().then(resolve).catch(reject)).catch(reject);
    });
  }

  pushBranch(branch: string, force: boolean): Promise<CommitModel> {
    return new Promise<CommitModel>((resolve, reject) => {
      this.execute(this.settings.gitPath + " push origin " + (branch ? branch + ':' + branch : '') + (force ? ' --force' : ''), "Push")
        .then(text => this.getChanges().then(resolve).catch(reject)).catch(reject);
    });
  }

  pull(): Promise<CommitModel> {
    return new Promise<CommitModel>((resolve, reject) => {
      this.execute(this.settings.gitPath + " pull", "Pull")
        .then(text => {
          console.log(text);
          this.getChanges().then(resolve).catch(reject);
        })
        .catch(err => {
          this.getChanges().then(resolve).catch(reject);
        });
    });
  }

  getCommitHistory(): Promise<CommitSummaryModel[]> {
    return new Promise<CommitSummaryModel[]>(((resolve, reject) => {
      this.execute(this.settings.gitPath + " log -n300 --pretty=format:\"||||%H|%an|%ae|%ad|%B\"\n", "Get Commit History").then(text => {
        let result = [];
        let branchList = /\|\|\|\|(\S+?)\|(.+?)\|(.+?)\|(.+?)\|([^|]*)/g;
        let match = branchList.exec(text);
        while (match) {
          let commitSummary = new CommitSummaryModel();
          commitSummary.hash = match[1];
          commitSummary.authorName = match[2];
          commitSummary.authorEmail = match[3];
          commitSummary.authorDate = new Date(Date.parse(match[4]));
          commitSummary.message = match[5];
          result.push(commitSummary);
          match = branchList.exec(text);
        }
        resolve(result);
      });
    }));
  }

  getBranches(): Promise<RepositoryModel> {
    return new Promise<RepositoryModel>(((resolve, reject) => {
      let result = new RepositoryModel();
      let promises = [];
      let branchList = /^(\*)?\s*(\S+)\s+(\S+)\s+(\[\s*(\S+?)(\s*:\s*((ahead|behind)\s+(\d+)),?\s*((behind)\s+(\d+))?)?\])?\s*(.*)?$/gm;
      promises.push(this.execute(this.settings.gitPath + " branch -v -v", "Get Local Branches").then(text => {
        let match = branchList.exec(text);
        while (match) {
          let branchModel = new BranchModel();
          branchModel.isCurrentBranch = match[1] == '*';
          branchModel.name = match[2];
          branchModel.currentHash = match[3];
          branchModel.lastCommitText = match[13];
          branchModel.trackingPath = match[5];
          if (match[8] === 'ahead') {
            branchModel.ahead = +match[8];
            if (match[11] === 'behind') {
              branchModel.behind = +match[12];
            }
          } else if (match[8] === 'behind') {
            branchModel.behind = +match[9];
          }

          result.localBranches.push(branchModel);
          match = branchList.exec(text);
        }
      }));
      promises.push(this.execute(this.settings.gitPath + " worktree list --porcelain", "Get Worktrees").then(text => {
        let worktreeList = /^worktree\s+(.+?)$\s*(bare|(HEAD\s+(\S+)$\s*(detached|branch\s+(.+?)$)))/gmi;
        let match = worktreeList.exec(text);
        while (match) {
          let worktreeModel = new WorktreeModel();
          worktreeModel.name = path.basename(match[1]);
          worktreeModel.path = match[1];
          worktreeModel.currentBranch = match[6].replace('refs/heads/', '') || match[5];
          worktreeModel.currentHash = match[4] || match[2];

          result.worktrees.push(worktreeModel);
          match = worktreeList.exec(text);
        }
      }));
      promises.push(this.execute(this.settings.gitPath + " fetch", "Fetch Remote Branches"));
      promises.push(this.execute(this.settings.gitPath + " branch -r -v -v", "Get Remote Branches").then(text => {
        let match = branchList.exec(text);
        while (match) {
          let branchModel = new BranchModel();
          branchModel.name = match[2];
          branchModel.currentHash = match[3];
          branchModel.lastCommitText = match[13];

          result.remoteBranches.push(branchModel);
          match = branchList.exec(text);
        }
      }));
      Promise.all(promises).then(ignore => {
        let currentBranchPath = result.localBranches.find(x => x.isCurrentBranch).name;
        result.worktrees[result.worktrees.findIndex(x => x.currentBranch == currentBranchPath)].isCurrent = true;
        resolve(result);
      }).catch(ignore => reject(result));
    }));
  }

  private execute(command: string, name: string): Promise<string> {
    let start = new Date();
    return new Promise<string>((resolve, reject) => {
      exec(command, {cwd: this.workingDir}, (error, stdout, stderr) => {
        this.commandHistory.push(new CommandHistoryModel(name, command, stderr, stdout, start, new Date().getTime() - start.getTime()));
        if (!error) {
          resolve(stdout);
        } else {
          console.log("Err: " + error + " | " + stderr);
          reject(stderr);
        }
      });
    });
  }
}
