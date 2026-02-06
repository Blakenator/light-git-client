import {DiffLineModel} from './diff.line.model';

export class DiffHunkModel {
  public header: string;
  public fromStartLine: number;
  public toStartLine: number;
  public fromNumLines: number;
  public toNumLines: number;
  public lines: DiffLineModel[] = [];
}
