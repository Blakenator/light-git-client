
export class BranchModel {
  public name: string;
  public isCurrentBranch: boolean;
  public isRemote: boolean;
  public currentHash:string;
  public trackingPath:string;
  public lastCommitText:string;
  public lastCommitDate:string;
  public ahead: number;
  public behind: number;
}
