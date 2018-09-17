export enum LineState {
  ADDED,
  REMOVED,
  SAME
}

export class DiffLineModel {
  public state: LineState;
  public text: string;
  public fromLineNumber: number;
  public toLineNumber: number;
}
