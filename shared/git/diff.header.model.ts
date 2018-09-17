import {DiffHunkModel} from './diff.hunk.model';

export class DiffHeaderModel {
  public fromFilename: string;
  public toFilename: string;
  public stagedState: DiffHeaderStagedState;
  public hunks: DiffHunkModel[] = [];
}

export enum DiffHeaderStagedState {
  STAGED = 'Staged',
  UNSTAGED = 'Unstaged',
  NONE = '',
}
