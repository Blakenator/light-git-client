export class DiffModel {
  public fromFilename: string;
  public toFilename: string;
  public hunks: DiffHunkModel[] = [];
}

export class DiffHunkModel {
  public fromStartLine: number;
  public toStartLine: number;
  public fromNumLines: number;
  public toNumLines: number;
  public lines: DiffLineModel[] = [];
}

export class DiffLineModel {
  public state: LineState;
  public text: string;
  public fromLineNumber: number;
  public toLineNumber: number;
}

export enum LineState {
  ADDED,
  REMOVED,
  SAME
}
