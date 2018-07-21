import {BranchModel} from "./Branch.model";
import {Remote} from "nodegit";

export class RepositoryModel {
  public name: string;
  public path: string;
  public remotes: Remote[];

  public remoteBranches: BranchModel[];
  public localBranches: BranchModel[];

  copy(obj: any | RepositoryModel): RepositoryModel {
    this.name = obj.name;
    this.path = obj.path;
    this.remotes = obj.remotes.map(x => Object.assign(new Remote(), x));
    this.localBranches = obj.localBranches.map(x => Object.assign(new BranchModel(), x));
    this.remoteBranches = obj.remoteBranches.map(x => Object.assign(new BranchModel(), x));
    return this;
  }
}
