
export class BranchModel {
  public name: string;
  public isCurrentBranch: boolean;
  public currentHash:string;
  public trackingPath:string;
  public lastCommitText:string;
  public ahead: number;
  public behind: number;
}
