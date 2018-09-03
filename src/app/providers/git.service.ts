import {Injectable} from '@angular/core';
import {Channels} from '../../../shared/Channels';
import {RepositoryModel} from '../../../shared/Repository.model';
import {ElectronService} from './electron.service';
import {ConfigItemModel} from '../../../shared/config-item.model';
import {DiffHunkModel, DiffModel} from '../../../shared/diff.model';
import {CommitModel} from '../../../shared/Commit.model';

@Injectable({
  providedIn: 'root'
})
export class GitService {
  public repo: RepositoryModel;

  constructor(private electronService: ElectronService) {
  }

  getConfigItems(): Promise<ConfigItemModel[]> {
    return this.electronService.rpc(Channels.GETCONFIGITEMS, [this.repo.path]);
  }

  setConfigItem(item: ConfigItemModel, rename: ConfigItemModel): Promise<ConfigItemModel[]> {
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

  getFileChanges(unstaged: string, staged: string): Promise<DiffModel[]> {
    return this.electronService.rpc(Channels.GETFILEDIFF, [this.repo.path, unstaged, staged]);
  }
}
