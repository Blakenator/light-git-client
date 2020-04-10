import {BranchModel} from './Branch.model';
import {WorktreeModel} from './worktree.model';
import {StashModel} from './stash.model';
import {SubmoduleModel} from './submodule.model';
import {CommitSummaryModel} from './CommitSummary.model';
import {CommitModel} from './Commit.model';
import * as _ from 'lodash';

export class RepositoryModel {
  public name = '';
  public path = '';
  public remotes: string[] = [];

  public remoteBranches: BranchModel[] = [];
  public localBranches: BranchModel[] = [];
  public worktrees: WorktreeModel[] = [];
  public stashes: StashModel[] = [];
  public submodules: SubmoduleModel[] = [];
  public commitHistory: CommitSummaryModel[] = [];
  public changes: CommitModel = new CommitModel();

  copy(obj: any | RepositoryModel): RepositoryModel {
    this.name = obj.name;
    this.path = obj.path;
    this.remotes = obj.remotes;
    this.localBranches = (obj.localBranches || []).map(x => Object.assign(new BranchModel(), x || {}));
    this.remoteBranches = (obj.remoteBranches || []).map(x => Object.assign(new BranchModel(), x || {}));
    this.worktrees = (obj.worktrees || []).map(x => Object.assign(new WorktreeModel(), x || {}));
    this.stashes = (obj.stashes || []).map(x => Object.assign(new StashModel(), x || {}));
    this.submodules = (obj.submodules || []).map(x => Object.assign(new SubmoduleModel(), x || {}));
    this.commitHistory = (obj.commitHistory || []).map(x => Object.assign(new CommitSummaryModel(), x || {}));
    this.changes = ({...new CommitModel(), ..._.cloneDeep(obj)});
    return this;
  }
}
