import {DiffHunkModel} from './diff.hunk.model';

export class DiffHeaderModel {
  public fromFilename: string;
  public toFilename: string;
  public stagedState: DiffHeaderStagedState;
  public action: DiffHeaderAction;
  public hunks: DiffHunkModel[] = [];
}

export enum DiffHeaderStagedState {
  STAGED = 'Staged',
  UNSTAGED = 'Unstaged',
  NONE = '',
}

export enum DiffHeaderAction {
  ADDED = 'Added',
  DELETED= 'Deleted',
  CHANGED = 'Changed',
  RENAMED = 'Renamed',
  COPIED = 'Copied',
}
