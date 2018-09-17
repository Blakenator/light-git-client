import {Injectable} from '@angular/core';
import {Channels} from '../../../shared/Channels';
import {RepositoryModel} from '../../../shared/git/Repository.model';
import {ElectronService} from './electron.service';
import {ConfigItemModel} from '../../../shared/git/config-item.model';
import {DiffHeaderModel} from '../../../shared/git/diff.header.model';
import {CommitModel} from '../../../shared/git/Commit.model';
import {Subject} from 'rxjs';
import {CommandHistoryModel} from '../../../shared/git/command-history.model';
import {DiffHunkModel} from '../../../shared/git/diff.hunk.model';

@Injectable({
  providedIn: 'root'
})
export class GitService {
  public repo: RepositoryModel;
  public onCommandHistoryUpdated = new Subject<CommandHistoryModel[]>();

  constructor(private electronService: ElectronService) {
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

  changeHunk(filename: string, hunk: DiffHunkModel, changedText: string): Promise<CommitModel> {
    return this.electronService.rpc(Channels.CHANGEHUNK, [this.repo.path, filename, hunk, changedText]);
  }

  getFileChanges(unstaged: string, staged: string): Promise<DiffHeaderModel[]> {
    return this.electronService.rpc(Channels.GETFILEDIFF, [this.repo.path, unstaged, staged]);
  }
}
