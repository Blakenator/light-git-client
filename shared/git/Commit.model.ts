export class CommitModel {
  public description = "";
  public stagedChanges: LightChange[] = [];
  public unstagedChanges: LightChange[] = [];
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
