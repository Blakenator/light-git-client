import type { BackendSyncApiType, BackendAsyncApiType } from '@superflag/super-ipc-core';
import { SYNC_CHANNELS, ASYNC_CHANNELS } from './Channels';
import type { SettingsModel } from './SettingsModel';
import type { CommitModel, ActiveOperation } from './git/Commit.model';
import type { BranchModel } from './git/Branch.model';
import type { CommitSummaryModel } from './git/CommitSummary.model';
import type { StashModel } from './git/stash.model';
import type { WorktreeModel } from './git/worktree.model';
import type { SubmoduleModel } from './git/submodule.model';
import type { DiffHeaderModel } from './git/diff.header.model';
import type { PaginatedDiffResponse } from './git/paginated-diff.model';
import type { ConfigItemModel } from './git/config-item.model';
import type { CommandHistoryModel } from './git/command-history.model';
import type { CommandOutputModel } from './common/command.output.model';

// ---- Re-usable shapes ----

interface RepoProps {
  repoPath: string;
}

/** Settings data as it flows over IPC (no class methods) */
export type SettingsData = Omit<SettingsModel, 'clone'>;

// ---- Sync API contract ----

export interface AppSyncApi extends BackendSyncApiType<SYNC_CHANNELS> {
  // --- Git Read Operations ---
  [SYNC_CHANNELS.GetFileChanges]: {
    props: RepoProps;
    result: CommitModel;
  };
  [SYNC_CHANNELS.GetLocalBranches]: {
    props: RepoProps;
    result: BranchModel[];
  };
  [SYNC_CHANNELS.GetRemoteBranches]: {
    props: RepoProps;
    result: BranchModel[];
  };
  [SYNC_CHANNELS.GetSubmodules]: {
    props: RepoProps;
    result: SubmoduleModel[];
  };
  [SYNC_CHANNELS.GetWorktrees]: {
    props: RepoProps;
    result: WorktreeModel[];
  };
  [SYNC_CHANNELS.GetStashes]: {
    props: RepoProps;
    result: StashModel[];
  };
  [SYNC_CHANNELS.GetCommitHistory]: {
    props: { repoPath: string; count?: number; skip?: number; activeBranch?: string };
    result: CommitSummaryModel[];
  };
  [SYNC_CHANNELS.GetFileDiff]: {
    props: { repoPath: string; unstaged: string[]; staged: string[]; cursor?: string | null; maxLines?: number };
    result: CommandOutputModel<PaginatedDiffResponse>;
  };
  [SYNC_CHANNELS.CommitDiff]: {
    props: { repoPath: string; hash: string };
    result: DiffHeaderModel[];
  };
  [SYNC_CHANNELS.StashDiff]: {
    props: { repoPath: string; index: number };
    result: DiffHeaderModel[];
  };
  [SYNC_CHANNELS.GetBranchPremerge]: {
    props: { repoPath: string; branchHash: string };
    result: DiffHeaderModel[];
  };
  [SYNC_CHANNELS.GetDeletedStashes]: {
    props: RepoProps;
    result: CommitSummaryModel[];
  };
  [SYNC_CHANNELS.GetConfigItems]: {
    props: RepoProps;
    result: ConfigItemModel[];
  };
  [SYNC_CHANNELS.GetCommandHistory]: {
    props: RepoProps;
    result: CommandHistoryModel[];
  };
  [SYNC_CHANNELS.CheckGitBashVersions]: {
    props: { repoPath: string };
    result: { bash: boolean; git: boolean };
  };

  // --- Git Write Operations ---
  [SYNC_CHANNELS.GitStage]: {
    props: { repoPath: string; files: string[] };
    result: void;
  };
  [SYNC_CHANNELS.GitUnstage]: {
    props: { repoPath: string; files: string[] };
    result: void;
  };
  [SYNC_CHANNELS.Commit]: {
    props: { repoPath: string; message: string; push: boolean; branch?: BranchModel; amend?: boolean };
    result: void;
  };
  [SYNC_CHANNELS.Checkout]: {
    props: { repoPath: string; branch: string; toNewBranch: boolean; andPull?: boolean };
    result: void;
  };
  [SYNC_CHANNELS.Push]: {
    props: { repoPath: string; branch?: BranchModel; force?: boolean };
    result: void;
  };
  [SYNC_CHANNELS.Pull]: {
    props: { repoPath: string; force?: boolean };
    result: void;
  };
  [SYNC_CHANNELS.Fetch]: {
    props: { repoPath: string; prune?: boolean };
    result: void;
  };
  [SYNC_CHANNELS.Merge]: {
    props: { repoPath: string; file: string; mergetool?: string };
    result: void;
  };
  [SYNC_CHANNELS.MergeBranch]: {
    props: { repoPath: string; branch: string };
    result: void;
  };
  [SYNC_CHANNELS.RebaseBranch]: {
    props: { repoPath: string; branch: string; interactive?: boolean };
    result: void;
  };
  [SYNC_CHANNELS.HardReset]: {
    props: RepoProps;
    result: void;
  };
  [SYNC_CHANNELS.CreateBranch]: {
    props: { repoPath: string; branchName: string };
    result: void;
  };
  [SYNC_CHANNELS.DeleteBranch]: {
    props: { repoPath: string; branches: BranchModel[] };
    result: void;
  };
  [SYNC_CHANNELS.RenameBranch]: {
    props: { repoPath: string; oldName: string; newName: string };
    result: void;
  };
  [SYNC_CHANNELS.FastForwardBranch]: {
    props: { repoPath: string; branch: BranchModel };
    result: void;
  };
  [SYNC_CHANNELS.CherryPickCommit]: {
    props: { repoPath: string; hash: string };
    result: void;
  };
  [SYNC_CHANNELS.RevertCommit]: {
    props: { repoPath: string; hash: string };
    result: void;
  };
  [SYNC_CHANNELS.ResetToCommit]: {
    props: { repoPath: string; hash: string; mode?: 'soft' | 'mixed' | 'hard' };
    result: void;
  };
  [SYNC_CHANNELS.UndoFileChanges]: {
    props: { repoPath: string; files: string[]; revision?: string; staged?: boolean };
    result: void;
  };
  [SYNC_CHANNELS.UndoSubmoduleChanges]: {
    props: { repoPath: string; submodules: SubmoduleModel[] };
    result: void;
  };
  [SYNC_CHANNELS.Stash]: {
    props: { repoPath: string; unstagedOnly: boolean; stashName?: string };
    result: void;
  };
  [SYNC_CHANNELS.ApplyStash]: {
    props: { repoPath: string; index: number };
    result: void;
  };
  [SYNC_CHANNELS.DeleteStash]: {
    props: { repoPath: string; index: number };
    result: void;
  };
  [SYNC_CHANNELS.RestoreDeletedStash]: {
    props: { repoPath: string; stashHash: string };
    result: void;
  };
  [SYNC_CHANNELS.ChangeHunk]: {
    props: { repoPath: string; filename: string; hunk: any; changedText: string };
    result: void;
  };
  [SYNC_CHANNELS.ResolveConflictUsing]: {
    props: { repoPath: string; file: string; useTheirs: boolean };
    result: void;
  };
  [SYNC_CHANNELS.ChangeActiveOperation]: {
    props: { repoPath: string; op: ActiveOperation; abort: boolean };
    result: void;
  };
  [SYNC_CHANNELS.SetConfigItem]: {
    props: { repoPath: string; item: ConfigItemModel };
    result: void;
  };
  [SYNC_CHANNELS.SetGitSettings]: {
    props: { repoPath: string; settings: Record<string, string | number>; scope?: boolean };
    result: void;
  };
  [SYNC_CHANNELS.DeleteWorktree]: {
    props: { repoPath: string; worktreePath: string };
    result: void;
  };
  [SYNC_CHANNELS.UpdateSubmodules]: {
    props: { repoPath: string; recursive: boolean; path?: string };
    result: void;
  };
  [SYNC_CHANNELS.AddSubmodule]: {
    props: { repoPath: string; url: string; path: string };
    result: void;
  };
  [SYNC_CHANNELS.DeleteFiles]: {
    props: { repoPath: string; files: string[] };
    result: void;
  };

  // --- Repo / Settings ---
  [SYNC_CHANNELS.LoadRepo]: {
    props: { repoPath: string };
    result: void;
  };
  [SYNC_CHANNELS.LoadSettings]: {
    props: void;
    result: SettingsData;
  };
  [SYNC_CHANNELS.SaveSettings]: {
    props: { settings: SettingsData };
    result: void;
  };
  [SYNC_CHANNELS.SettingsChanged]: {
    props: void;
    result: SettingsData;
  };

  // --- System / UI ---
  [SYNC_CHANNELS.OpenFolder]: {
    props: { repoPath?: string; path?: string };
    result: void;
  };
  [SYNC_CHANNELS.OpenUrl]: {
    props: { url: string; app?: string };
    result: void;
  };
  [SYNC_CHANNELS.OpenTerminal]: {
    props: RepoProps;
    result: void;
  };
  [SYNC_CHANNELS.OpenDevTools]: {
    props: void;
    result: void;
  };
  [SYNC_CHANNELS.OpenFileDialog]: {
    props: { options: any };
    result: string[] | undefined;
  };
  [SYNC_CHANNELS.Log]: {
    props: { message: string };
    result: void;
  };
  [SYNC_CHANNELS.CloseWindow]: {
    props: void;
    result: void;
  };
  [SYNC_CHANNELS.Minimize]: {
    props: void;
    result: void;
  };
  [SYNC_CHANNELS.Restore]: {
    props: void;
    result: void;
  };

  // --- Updates ---
  [SYNC_CHANNELS.GetVersion]: {
    props: void;
    result: string;
  };
  [SYNC_CHANNELS.CheckForUpdates]: {
    props: void;
    result: void;
  };
  [SYNC_CHANNELS.IsUpdateDownloaded]: {
    props: void;
    result: { downloaded: boolean; version: string };
  };
  [SYNC_CHANNELS.RestartAndInstallUpdate]: {
    props: void;
    result: void;
  };

  // --- Events (reply-only channels, not directly invoked) ---
  [SYNC_CHANNELS.CommandHistoryChanged]: {
    props: void;
    result: CommandHistoryModel[];
  };
}

// ---- Async API contract (streaming operations) ----

export interface AppAsyncApi extends BackendAsyncApiType<ASYNC_CHANNELS> {
  [ASYNC_CHANNELS.Clone]: {
    props: { repoPath: string; url: string; targetPath: string };
    initResult: void;
    progressResult: { out?: string; err?: string; done?: boolean };
    completeResult: { success: boolean };
  };
  [ASYNC_CHANNELS.AddWorktree]: {
    props: { repoPath: string; worktreePath: string; branch: string; createNewBranch?: boolean };
    initResult: void;
    progressResult: { out?: string; err?: string; done?: boolean };
    completeResult: { success: boolean };
  };
}
