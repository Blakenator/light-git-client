export class CommitModel {
  public description = '';
  public stagedChanges: LightChange[] = [];
  public unstagedChanges: LightChange[] = [];
  public activeOperations: Record<ActiveOperation, boolean> = {
    [ActiveOperation.Merge]: false,
    [ActiveOperation.Rebase]: false,
    [ActiveOperation.CherryPick]: false,
    [ActiveOperation.Revert]: false,
  };
}

export enum ActiveOperation {
  Merge = 'MERGE',
  Rebase = 'REBASE',
  CherryPick = 'CHERRY_PICK',
  Revert = 'REVERT',
}

export class LightChange {
  change: ChangeType;
  file: string;
  staged: boolean;
}

export class ChangeType {
  public static Addition = 'A';
  public static Deletion = 'D';
  public static Modified = 'M';
  public static Rename = 'R';
  public static MergeConflict = 'U';
  public static Untracked = '?';
}
