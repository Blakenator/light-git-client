import {Injectable} from '@angular/core';
import {Channels} from '../../../shared/Channels';
import {RepositoryModel} from '../../../shared/git/Repository.model';
import {ElectronService} from '../common/services/electron.service';
import {ConfigItemModel} from '../../../shared/git/config-item.model';
import {DiffHeaderModel} from '../../../shared/git/diff.header.model';
import {CommitModel} from '../../../shared/git/Commit.model';
import {Subject} from 'rxjs';
import {CommandHistoryModel} from '../../../shared/git/command-history.model';
import {DiffHunkModel} from '../../../shared/git/diff.hunk.model';
import {ErrorModel} from '../../../shared/common/error.model';
import {ErrorService} from '../common/services/error.service';

@Injectable({
  providedIn: 'root'
})
export class GitService {
  public repo: RepositoryModel;
  public onCommandHistoryUpdated = new Subject<CommandHistoryModel[]>();

  constructor(private electronService: ElectronService, private errorService: ErrorService) {
    electronService.listen(Channels.COMMANDHISTORYCHANGED, resp => this.onCommandHistoryUpdated.next(resp));
  }

  getConfigItems(): Promise<ConfigItemModel[]> {
    return this.electronService.rpc(Channels.GETCONFIGITEMS, [this.repo.path]);
  }

  setConfigItem(item: ConfigItemModel, rename?: ConfigItemModel): Promise<ConfigItemModel[]> {
    if (rename) {
      rename.value = '';
      return this.electronService.rpc(Channels.SETCONFIGITEM, [this.repo.path, rename])
                 .then(ignore => this.electronService.rpc(Channels.SETCONFIGITEM,
                   [this.repo.path, item]));
    }
    return this.electronService.rpc(Channels.SETCONFIGITEM, [this.repo.path, item]);
  }

  mergeBranch(branch: string): Promise<RepositoryModel> {
    return this.electronService.rpc(Channels.MERGEBRANCH, [this.repo.path, branch]);
  }

  addWorktree(location: string, branch: string, callback: (out: string, err: string, done: boolean) => any) {
    this.electronService.rpc(Channels.ADDWORKTREE, [this.repo.path, location, branch], false);
    this.electronService.listen(Channels.ADDWORKTREE, (result: { out: string, err: string, done: boolean }) => {
      callback(result.out, result.err, result.done);
      if (result.done) {
        this.electronService.cleanupChannel(Channels.ADDWORKTREE);
      }
    });
  }

  clone(location: string, url: string, callback: (out: string, err: string, done: boolean) => any) {
    this.electronService.rpc(Channels.CLONE, ['./', location, url], false);
    this.electronService.listen(Channels.CLONE, (result: { out: string, err: string, done: boolean }) => {
      callback(result.out, result.err, result.done);
      if (result.done) {
        this.electronService.cleanupChannel(Channels.CLONE);
      }
    });
  }

  changeHunk(filename: string, hunk: DiffHunkModel, changedText: string): Promise<CommitModel> {
    return this.electronService.rpc(Channels.CHANGEHUNK, [this.repo.path, filename, hunk, changedText]);
  }

  updateSubmodules(branch: string, recursive: boolean): Promise<any> {
    return this.electronService.rpc(Channels.UPDATESUBMODULES, [this.repo.path, branch, recursive]);
  }

  addSubmodule(url: string, path: string): Promise<any> {
    return this.electronService.rpc(Channels.ADDSUBMODULE, [this.repo.path, url, path]);
  }

  getFileChanges(unstaged: string, staged: string): Promise<DiffHeaderModel[]> {
    return this.electronService.rpc(Channels.GETFILEDIFF, [this.repo.path, unstaged, staged]);
  }

  cherryPickCommit(hash: string): Promise<CommitModel> {
    return this.electronService.rpc(Channels.CHERRYPICKCOMMIT, [this.repo.path, hash]);
  }

  fastForwardBranch(branch: string): Promise<CommitModel> {
    return this.electronService.rpc(Channels.FASTFORWARDBRANCH, [this.repo.path, branch]);
  }

  setBulkGitSettings(config: { [key: string]: string|number }): Promise<any> {
    return this.electronService.rpc(Channels.SETGITSETTINGS, [this.repo.path, config]);
  }

  checkGitBashVersions() {
    const handleResult = (err: { git: boolean, bash: boolean }) => {
      let errors = [];
      if (!err.git) {
        errors.push('git');
      }
      if (!err.bash) {
        errors.push('bash');
      }
      if (errors.length > 0) {
        this.errorService.receiveError(new ErrorModel('home component, git bash version check',
          'checking the versions of Git and Bash',
          'Invalid path configuration(s) detected:\n\t' + errors.join('\n\t') +
          '\n\nPlease configure your paths correctly in the Settings menu'));
      }
    };
    this.electronService.rpc(Channels.CHECKGITBASHVERSIONS, ['./']).then(handleResult).catch(handleResult);
  }
}
