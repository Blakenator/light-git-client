import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, ButtonGroup, Dropdown, Tooltip } from 'react-bootstrap';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useRepositoryStore, useSettingsStore, useUiStore, useJobStore, RepoArea } from '../../stores';
import type { RepoSectionLayout, SectionCardLayout } from '../../stores/settingsStore';
import { Icon, TooltipTrigger } from '@light-git/core';
import { useIpc, useGitService, useIpcListener } from '../../ipc';
import { Channels, CardId } from '@light-git/shared';
import { ConfirmModal } from '../../common/components/ConfirmModal/ConfirmModal';
import { InputModal } from '../../common/components/InputModal/InputModal';
import { PruneBranchDialog, MergeBranchDialog } from './dialogs';
import { calculateGraphBlocks } from '../../utils/calculateGraphBlocks';
import { EditSectionsContext } from './EditSectionsContext';
import { EditableCard } from './EditableCard';
import {
  RepoViewContainer,
  Column,
  RepoTitle,
  TitleButtonGroup,
  EllipsisDropdownWrapper,
  DroppableColumn,
} from './RepoView.styles';
import {
  LocalBranchesCard,
  RemoteBranchesCard,
  WorktreesCard,
  SubmodulesCard,
  StashesCard,
  CommandHistoryCard,
  StagedChangesCard,
  UnstagedChangesCard,
  ActiveOperationBanner,
  CommitPanel,
  CommitHistoryCard,
  ActiveOperation,
} from './cards';

// Card configuration: defines the default column and order for each card section
export interface CardConfig {
  id: CardId;
  title: string;
  defaultColumn: number; // 0=left, 1=middle, 2=right
  defaultOrder: number;
}

const CARD_CONFIGS: CardConfig[] = [
  { id: CardId.LocalBranches, title: 'Local Branches', defaultColumn: 0, defaultOrder: 0 },
  { id: CardId.RemoteBranches, title: 'Remote Branches', defaultColumn: 0, defaultOrder: 1 },
  { id: CardId.Worktrees, title: 'Worktrees', defaultColumn: 0, defaultOrder: 2 },
  { id: CardId.Submodules, title: 'Submodules', defaultColumn: 0, defaultOrder: 3 },
  { id: CardId.Stashes, title: 'Stashes', defaultColumn: 0, defaultOrder: 4 },
  { id: CardId.CommandHistory, title: 'Command History', defaultColumn: 0, defaultOrder: 5 },
  { id: CardId.StagedChanges, title: 'Staged Changes', defaultColumn: 1, defaultOrder: 0 },
  { id: CardId.UnstagedChanges, title: 'Unstaged Changes', defaultColumn: 1, defaultOrder: 1 },
  { id: CardId.CommitHistory, title: 'Commit History', defaultColumn: 2, defaultOrder: 0 },
];

function getDefaultLayout(): RepoSectionLayout {
  const layout: RepoSectionLayout = {};
  for (const config of CARD_CONFIGS) {
    layout[config.id] = {
      visible: true,
      order: config.defaultOrder,
      column: config.defaultColumn,
    };
  }
  return layout;
}

function getEffectiveLayout(persisted: RepoSectionLayout | undefined): RepoSectionLayout {
  const defaults = getDefaultLayout();
  if (!persisted) return defaults;
  // Merge: persisted values win, but fill in any missing cards from defaults
  const result: RepoSectionLayout = { ...defaults };
  for (const [id, val] of Object.entries(persisted)) {
    if (result[id]) {
      result[id] = val;
    }
  }
  return result;
}

function getColumnCards(layout: RepoSectionLayout, column: number): { id: string; config: SectionCardLayout }[] {
  return Object.entries(layout)
    .filter(([, cfg]) => cfg.column === column)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([id, config]) => ({ id, config }));
}

interface MergeInfo {
  sourceBranch?: any;
  targetBranch?: any;
  isRebase?: boolean;
  isInteractive?: boolean;
}

interface RepoViewProps {
  repoPath: string;
  isNested?: boolean;
  onOpenRepoNewTab?: (path: string) => void;
  onLoadRepoFailed?: (error: any) => void;
}

export const RepoView: React.FC<RepoViewProps> = ({
  repoPath,
  isNested = false,
  onOpenRepoNewTab,
  onLoadRepoFailed,
}) => {
  const ipc = useIpc();
  const gitService = useGitService(repoPath);
  
  // Get repo data from store
  const repoCache = useRepositoryStore((state) => state.getCacheFor(repoPath));
  const updateRepoCache = useRepositoryStore((state) => state.updateRepoCache);
  const getActiveTab = useRepositoryStore((state) => state.getActiveTab);
  // Granular settings selectors: only re-render when these specific values change,
  // not when unrelated settings (like expandStates from card collapse) change.
  const splitFilenameDisplay = useSettingsStore((state) => state.settings.splitFilenameDisplay);
  const commitAndPush = useSettingsStore((state) => state.settings.commitAndPush);
  const branchNamePrefix = useSettingsStore((state) => state.settings.branchNamePrefix);
  const diffIgnoreWhitespace = useSettingsStore((state) => state.settings.diffIgnoreWhitespace);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const saveSettings = useSettingsStore((state) => state.saveSettings);
  const showModal = useUiStore((state) => state.showModal);
  const addAlert = useUiStore((state) => state.addAlert);
  const crlfError = useUiStore((state) => state.crlfError);
  const setCrlfError = useUiStore((state) => state.setCrlfError);

  // Local state
  const [showDiff, setShowDiff] = React.useState(false);
  const [activeOperation, setActiveOperation] = React.useState<ActiveOperation>(null);
  const [commitMessage, setCommitMessage] = React.useState('');
  const [commandHistory, setCommandHistory] = React.useState<any[]>([]);
  const [currentDiff, setCurrentDiff] = React.useState<any[]>([]);
  const [commitInfo, setCommitInfo] = React.useState<any>(null);
  const [activeBranch, setActiveBranch] = React.useState<any>(null);
  // Pagination state for file diffs
  const [diffCursor, setDiffCursor] = React.useState<string | null>(null);
  const [hasMoreDiffs, setHasMoreDiffs] = React.useState(false);
  const [isLoadingMoreDiffs, setIsLoadingMoreDiffs] = React.useState(false);
  // Track current file selection for loading subsequent pages (ref to avoid re-renders)
  const currentDiffFilesRef = React.useRef<{ unstaged: string[]; staged: string[] }>({ unstaged: [], staged: [] });

  // Pagination guards for commit history infinite scrolling
  const isLoadingMoreCommits = React.useRef(false);
  const noMoreCommits = React.useRef(false);

  // Refs for values that callbacks need to READ at call time but shouldn't trigger callback recreation.
  // This prevents cascading re-renders when selection/commit data changes.
  const repoRef = React.useRef(repoCache);
  repoRef.current = repoCache;
  const commitMessageRef = React.useRef(commitMessage);
  commitMessageRef.current = commitMessage;
  // Refs for callback props to prevent cascading when parent re-renders
  const onLoadRepoFailedRef = React.useRef(onLoadRepoFailed);
  onLoadRepoFailedRef.current = onLoadRepoFailed;
  const onOpenRepoNewTabRef = React.useRef(onOpenRepoNewTab);
  onOpenRepoNewTabRef.current = onOpenRepoNewTab;
  // Refs for UI state that effects need to read without triggering re-runs
  const showDiffRef = React.useRef(showDiff);
  showDiffRef.current = showDiff;
  const commitInfoRef = React.useRef(commitInfo);
  commitInfoRef.current = commitInfo;
  const activeBranchRef = React.useRef(activeBranch);
  activeBranchRef.current = activeBranch;

  // Normalize diff data from backend format to frontend format
  const normalizeDiff = React.useCallback((diffHeaders: any[]): any[] => {
    if (!diffHeaders || !Array.isArray(diffHeaders)) return [];
    
    return diffHeaders.map((header: any) => {
      // Normalize hunks first so we can compute additions/deletions
      const normalizedHunks = (header.hunks || []).map((hunk: any) => ({
        header: hunk.header || `@@ -${hunk.fromStartLine},${hunk.fromNumLines} +${hunk.toStartLine},${hunk.toNumLines} @@`,
        fromStartLine: hunk.fromStartLine || 0,
        toStartLine: hunk.toStartLine || 0,
        lines: (hunk.lines || []).map((line: any) => {
          // Normalize LineState: backend uses numeric enum (0=ADDED, 1=REMOVED, 2=SAME)
          // Frontend expects string enum ('added', 'removed', 'unchanged')
          let state = 'unchanged';
          if (line.state === 0 || line.state === 'ADDED' || line.state === 'added') {
            state = 'added';
          } else if (line.state === 1 || line.state === 'REMOVED' || line.state === 'removed') {
            state = 'removed';
          }
          
          return {
            text: line.text || '',
            state,
            oldLineNumber: line.fromLineNumber ?? line.oldLineNumber,
            newLineNumber: line.toLineNumber ?? line.newLineNumber,
          };
        }),
      }));

      // Compute additions and deletions from hunks if not provided
      let additions = header.additions || 0;
      let deletions = header.deletions || 0;
      
      if (additions === 0 && deletions === 0 && normalizedHunks.length > 0) {
        normalizedHunks.forEach((hunk: any) => {
          (hunk.lines || []).forEach((line: any) => {
            if (line.state === 'added') {
              additions++;
            } else if (line.state === 'removed') {
              deletions++;
            }
          });
        });
      }

      return {
        fromFilename: header.fromFilename || '',
        toFilename: header.toFilename || '',
        additions,
        deletions,
        action: header.action,
        stagedState: header.stagedState,
        hunks: normalizedHunks,
      };
    });
  }, []);

  const activeTab = getActiveTab();

  // Default empty data if repo not loaded
  const repo = repoCache || {
    localBranches: [] as any[],
    remoteBranches: [] as any[],
    worktrees: [] as any[],
    submodules: [] as any[],
    stashes: [] as any[],
    commitHistory: [] as any[],
    changes: { stagedChanges: [], unstagedChanges: [], description: '' } as any,
    selectedStagedChanges: {} as Record<string, boolean>,
    selectedUnstagedChanges: {} as Record<string, boolean>,
  };

  // Helper to refresh repo data (uses job scheduler for proper queuing)
  const refreshRepo = useCallback(async () => {
    noMoreCommits.current = false;
    try {
      const data = await gitService.refreshAll();
      
      // Filter out undefined values - these can occur when overlapping refreshes
      // cause the job scheduler to supersede (deduplicate) pending read jobs.
      const update: Record<string, any> = {};
      if (data.changes !== undefined) update.changes = data.changes;
      if (data.localBranches !== undefined) update.localBranches = data.localBranches;
      if (data.remoteBranches !== undefined) update.remoteBranches = data.remoteBranches;
      if (data.stashes !== undefined) update.stashes = data.stashes;
      if (data.worktrees !== undefined) update.worktrees = data.worktrees;
      if (data.submodules !== undefined) update.submodules = data.submodules;
      if (data.commitHistory !== undefined) update.commitHistory = data.commitHistory;
      
      if (Object.keys(update).length > 0) {
        updateRepoCache(repoPath, update);
      }
    } catch (error) {
      console.error('Failed to refresh repo:', error);
      addAlert('Failed to refresh repository', 'error');
      onLoadRepoFailedRef.current?.(error);
    }
  }, [gitService, repoPath, updateRepoCache, addAlert]);

  // Load repo data on mount or when repoPath changes
  // Track the last refreshed path to prevent infinite loops
  const lastRefreshedPath = React.useRef<string | null>(null);
  
  useEffect(() => {
    // Only refresh if repoPath changed (not on every re-render)
    if (repoPath && repoPath !== lastRefreshedPath.current) {
      lastRefreshedPath.current = repoPath;
      refreshRepo();
      // Also load command history on initial load
      gitService.getCommandHistory().then(history => {
        setCommandHistory(history || []);
      }).catch(console.error);
    }
  }, [repoPath, refreshRepo, gitService]);

  // Auto-refresh affected areas when the job queue finishes (mirrors Angular TabDataService.updateAreas).
  // Write operations declare which RepoAreas they affect. When all queued jobs finish,
  // onFinishQueue fires with the accumulated affected areas, and we refresh only those.
  // Read operations have affectedAreas: [], so they don't trigger further refreshes.
  const onFinishQueue = useJobStore((state) => state.onFinishQueue);

  useEffect(() => {
    const unsubscribe = onFinishQueue(({ affectedAreas, path }) => {
      if (affectedAreas.size === 0 || path !== repoPath) return;

      const promises: Promise<any>[] = [];

      if (affectedAreas.has(RepoArea.LOCAL_BRANCHES)) {
        promises.push(
          gitService.getLocalBranches()
            .then((result: any) => result !== undefined ? { localBranches: result } : null)
            .catch((err: any) => { console.error('Failed to refresh local branches:', err); return null; })
        );
      }
      if (affectedAreas.has(RepoArea.REMOTE_BRANCHES)) {
        promises.push(
          gitService.getRemoteBranches()
            .then((result: any) => result !== undefined ? { remoteBranches: result } : null)
            .catch((err: any) => { console.error('Failed to refresh remote branches:', err); return null; })
        );
      }
      if (affectedAreas.has(RepoArea.LOCAL_CHANGES)) {
        promises.push(
          gitService.getFileChanges()
            .then((result: any) => result !== undefined ? { changes: result } : null)
            .catch((err: any) => { console.error('Failed to refresh file changes:', err); return null; })
        );
      }
      if (affectedAreas.has(RepoArea.COMMIT_HISTORY)) {
        noMoreCommits.current = false;
        promises.push(
          gitService.getCommitHistory(50, 0, activeBranchRef.current?.name)
            .then((result: any) => result !== undefined ? { commitHistory: result } : null)
            .catch((err: any) => { console.error('Failed to refresh commit history:', err); return null; })
        );
      }
      if (affectedAreas.has(RepoArea.STASHES)) {
        promises.push(
          gitService.getStashes()
            .then((result: any) => result !== undefined ? { stashes: result } : null)
            .catch((err: any) => { console.error('Failed to refresh stashes:', err); return null; })
        );
      }
      if (affectedAreas.has(RepoArea.WORKTREES)) {
        promises.push(
          gitService.getWorktrees()
            .then((result: any) => result !== undefined ? { worktrees: result } : null)
            .catch((err: any) => { console.error('Failed to refresh worktrees:', err); return null; })
        );
      }
      if (affectedAreas.has(RepoArea.SUBMODULES)) {
        promises.push(
          gitService.getSubmodules()
            .then((result: any) => result !== undefined ? { submodules: result } : null)
            .catch((err: any) => { console.error('Failed to refresh submodules:', err); return null; })
        );
      }

      if (promises.length > 0) {
        Promise.all(promises).then((results) => {
          const update: Record<string, any> = {};
          results.forEach((r) => {
            if (r) Object.assign(update, r);
          });
          if (Object.keys(update).length > 0) {
            updateRepoCache(repoPath, update);
          }
        });
      }
    });

    return unsubscribe;
  }, [onFinishQueue, repoPath, gitService, updateRepoCache]);

  // Git operation handlers (using job scheduler for proper queuing).
  // Note: handlers do NOT call refreshRepo() manually. The onFinishQueue
  // subscription above auto-refreshes the affected areas when the job queue
  // finishes, matching the Angular TabDataService.updateAreas() pattern.
  const handleCheckout = useCallback(async (branch: any, andPull: boolean) => {
    try {
      // Local branches: toNewBranch=false
      await gitService.checkout(branch.name, false, andPull);
      addAlert(`Checked out ${branch.name}`, 'success');
    } catch (error: any) {
      addAlert(`Checkout failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handlePush = useCallback(async (branch: any, force: boolean) => {
    try {
      await gitService.push(branch, force);
      addAlert('Push successful', 'success');
    } catch (error: any) {
      addAlert(`Push failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handlePull = useCallback(async (branch: any, force: boolean) => {
    try {
      await gitService.pull(force);
      addAlert('Pull successful', 'success');
    } catch (error: any) {
      addAlert(`Pull failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  // State for merge dialog pre-selection
  const [activeMergeInfo, setActiveMergeInfo] = useState<MergeInfo | null>(null);

  // State for branch delete confirmation
  const [branchToDelete, setBranchToDelete] = useState<any>(null);

  // State for rename branch
  const [branchToRename, setBranchToRename] = useState<any>(null);

  const handleMerge = useCallback((branch?: any) => {
    if (branch) {
      setActiveMergeInfo({ sourceBranch: branch });
    } else {
      setActiveMergeInfo(null);
    }
    showModal('mergeBranch');
  }, [showModal]);

  const handleRebase = useCallback((branch: any) => {
    setActiveMergeInfo({ sourceBranch: branch, isRebase: true });
    showModal('mergeBranch');
  }, [showModal]);

  const handleInteractiveRebase = useCallback((branch: any) => {
    setActiveMergeInfo({ sourceBranch: branch, isRebase: true, isInteractive: true });
    showModal('mergeBranch');
  }, [showModal]);

  const handleMergeBranchSubmit = useCallback(async (
    source: string,
    target: string,
    options: { rebase: boolean; interactive: boolean }
  ) => {
    try {
      const currentBranch = repoRef.current?.localBranches?.find((b: any) => b.isCurrentBranch);
      if (options.rebase) {
        // Rebase: checkout source, then rebase onto target
        if (currentBranch?.name !== source) {
          await gitService.checkout(source, false, false);
        }
        await gitService.rebaseBranch(target, options.interactive);
      } else {
        // Merge: checkout target, then merge source
        if (currentBranch?.name !== target) {
          await gitService.checkout(target, false, false);
        }
        await gitService.mergeBranch(source);
      }
      addAlert(
        options.rebase
          ? `Rebased ${source} onto ${target}`
          : `Merged ${source} into ${target}`,
        'success'
      );
    } catch (error: any) {
      addAlert(
        `${options.rebase ? 'Rebase' : 'Merge'} failed: ${error.message}`,
        'error'
      );
    }
  }, [gitService, addAlert]);

  const handleCreateBranch = useCallback(() => {
    showModal('createBranch');
  }, [showModal]);

  const handlePruneBranches = useCallback(() => {
    showModal('pruneBranch');
  }, [showModal]);

  const handleConfirmPruneBranches = useCallback(async (branches: any[]) => {
    try {
      await gitService.deleteBranch(branches);
      addAlert(`Deleted ${branches.length} branch(es)`, 'success');
    } catch (error: any) {
      addAlert(`Prune failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleDeleteBranch = useCallback(async (branch: any) => {
    // Show confirmation modal instead of deleting directly
    setBranchToDelete(branch);
    showModal('confirmDeleteBranch');
  }, [showModal]);

  const handleConfirmDeleteBranch = useCallback(async () => {
    if (!branchToDelete) return;
    try {
      await gitService.deleteBranch([branchToDelete]);
      addAlert(`Deleted branch ${branchToDelete.name}`, 'success');
    } catch (error: any) {
      addAlert(`Delete failed: ${error.message}`, 'error');
    }
    setBranchToDelete(null);
  }, [gitService, addAlert, branchToDelete]);

  const handleRenameBranch = useCallback(async (branch: any) => {
    setBranchToRename(branch);
    showModal('renameBranch');
  }, [showModal]);

  const handleOpenTerminal = useCallback(async () => {
    try {
      await gitService.openTerminal();
    } catch (error: any) {
      addAlert(`Failed to open terminal: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleOpenFolder = useCallback(async (path?: string) => {
    try {
      await gitService.openFolder(path);
    } catch (error: any) {
      addAlert(`Failed to open folder: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleFullRefresh = useCallback(async () => {
    await refreshRepo();
    addAlert('Refreshed', 'info');
  }, [refreshRepo, addAlert]);

  const handleDiscardAll = useCallback(() => {
    showModal('discardAllModal');
  }, [showModal]);

  const handleHardReset = useCallback(async () => {
    try {
      await gitService.hardReset();
      addAlert('All changes discarded', 'info');
    } catch (error: any) {
      addAlert(`Hard reset failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleFastForward = useCallback(async (branch: any) => {
    try {
      await gitService.fastForward(branch);
      addAlert(`Fast-forwarded ${branch.name}`, 'success');
    } catch (error: any) {
      addAlert(`Fast-forward failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleCreateBranchSubmit = useCallback(async (branchName: string) => {
    try {
      const prefix = branchNamePrefix || '';
      await gitService.createBranch(prefix + branchName);
      addAlert(`Created branch ${prefix + branchName}`, 'success');
    } catch (error: any) {
      addAlert(`Create branch failed: ${error.message}`, 'error');
    }
  }, [gitService, branchNamePrefix, addAlert]);

  const handleRenameBranchSubmit = useCallback(async (newName: string) => {
    if (!branchToRename) return;
    try {
      await gitService.renameBranch(branchToRename.name, newName);
      addAlert(`Renamed branch to ${newName}`, 'success');
    } catch (error: any) {
      addAlert(`Rename branch failed: ${error.message}`, 'error');
    }
    setBranchToRename(null);
  }, [gitService, addAlert, branchToRename]);

  const mergetool = useSettingsStore((state) => state.settings.mergetool);
  
  const handleMergeFile = useCallback(async (file: string) => {
    try {
      await gitService.merge(file, mergetool);
    } catch (error: any) {
      addAlert(`Merge failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert, mergetool]);

  const handleResolveConflict = useCallback(async (file: string, useTheirs: boolean) => {
    try {
      await gitService.resolveConflict(file, useTheirs);
      addAlert(`Conflict resolved using ${useTheirs ? 'theirs' : 'ours'}`, 'success');
    } catch (error: any) {
      addAlert(`Resolve conflict failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleAddSubmodule = useCallback(async (url: string, path: string) => {
    try {
      await gitService.addSubmodule(url, path);
      addAlert('Submodule added', 'success');
    } catch (error: any) {
      addAlert(`Add submodule failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleFetch = useCallback(async (prune: boolean = false) => {
    try {
      await gitService.fetch(prune);
    } catch (error: any) {
      // Only show error for certain cases
      if (!error.message?.includes('No remote repository')) {
        addAlert(`Fetch failed: ${error.message}`, 'error');
      }
    }
  }, [gitService, addAlert]);

  const handleCommit = useCallback(async (amend: boolean) => {
    try {
      const currentBranch = commitAndPush
        ? repoRef.current?.localBranches?.find((b: any) => b.isCurrentBranch)
        : undefined;
      await gitService.commit(commitMessageRef.current, amend, commitAndPush, currentBranch);
      setCommitMessage('');
      addAlert(amend ? 'Commit amended' : 'Committed successfully', 'success');
    } catch (error: any) {
      addAlert(`Commit failed: ${error.message}`, 'error');
    }
  }, [gitService, commitAndPush, addAlert]);

  const handleCommitAndPushChange = useCallback((value: boolean) => {
    updateSettings({ commitAndPush: value });
    saveSettings();
  }, [updateSettings, saveSettings]);

  const handleSetFilenameSplit = useCallback((split: boolean) => {
    updateSettings({ splitFilenameDisplay: split });
    saveSettings();
  }, [updateSettings, saveSettings]);

  const handleIgnoreWhitespaceChange = useCallback((value: boolean) => {
    updateSettings({ diffIgnoreWhitespace: value });
    saveSettings();
  }, [updateSettings, saveSettings]);

  const handleLoadMoreCommits = useCallback(async () => {
    if (isLoadingMoreCommits.current || noMoreCommits.current) return;
    isLoadingMoreCommits.current = true;
    try {
      const existing = repoRef.current?.commitHistory || [];
      const branchName = activeBranchRef.current?.name;
      const newCommits = await gitService.getCommitHistory(50, existing.length, branchName);
      if (!newCommits || newCommits.length === 0) {
        noMoreCommits.current = true;
        return;
      }
      updateRepoCache(repoPath, { commitHistory: [...existing, ...newCommits] });
    } catch (error: any) {
      addAlert(`Failed to load commits: ${error.message}`, 'error');
    } finally {
      isLoadingMoreCommits.current = false;
    }
  }, [gitService, repoPath, updateRepoCache, addAlert]);

  // Staging/unstaging handlers
  const handleStageAll = useCallback(async () => {
    try {
      await gitService.stage(['.']);
      updateRepoCache(repoPath, { selectedUnstagedChanges: {} });
    } catch (error: any) {
      addAlert(`Stage failed: ${error.message}`, 'error');
    }
  }, [gitService, repoPath, updateRepoCache, addAlert]);

  const handleUnstageAll = useCallback(async () => {
    try {
      await gitService.unstage(['.']);
      updateRepoCache(repoPath, { selectedStagedChanges: {} });
    } catch (error: any) {
      addAlert(`Unstage failed: ${error.message}`, 'error');
    }
  }, [gitService, repoPath, updateRepoCache, addAlert]);

  const handleStageSelected = useCallback(async () => {
    try {
      const files = Object.entries(repoRef.current?.selectedUnstagedChanges || {})
        .filter(([_, selected]) => selected)
        .map(([file]) => file.replace(/.*?->\s*/, '')); // Handle renames
      if (files.length > 0) {
        await gitService.stage(files);
        updateRepoCache(repoPath, { selectedUnstagedChanges: {} });
      }
    } catch (error: any) {
      addAlert(`Stage failed: ${error.message}`, 'error');
    }
  }, [gitService, repoPath, updateRepoCache, addAlert]);

  const handleUnstageSelected = useCallback(async () => {
    try {
      const files = Object.entries(repoRef.current?.selectedStagedChanges || {})
        .filter(([_, selected]) => selected)
        .map(([file]) => file.replace(/.*?->\s*/, '')); // Handle renames
      if (files.length > 0) {
        await gitService.unstage(files);
        updateRepoCache(repoPath, { selectedStagedChanges: {} });
      }
    } catch (error: any) {
      addAlert(`Unstage failed: ${error.message}`, 'error');
    }
  }, [gitService, repoPath, updateRepoCache, addAlert]);

  const handleUndoFile = useCallback(async (path: string) => {
    try {
      await gitService.undoFileChanges([path]);
    } catch (error: any) {
      addAlert(`Undo failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleDeleteFiles = useCallback(async (paths: string[]) => {
    try {
      await gitService.deleteFiles(paths);
    } catch (error: any) {
      addAlert(`Delete failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  // Fetch a single page of file diffs. When append=true, adds to existing diffs.
  const fetchDiffPage = useCallback(async (
    unstagedFiles: string[],
    stagedFiles: string[],
    cursor: string | null,
    append: boolean,
  ) => {
    try {
      const diffResponse = await gitService.getFileDiff(unstagedFiles, stagedFiles, cursor) as any;
      // Backend returns { content: PaginatedDiffResponse, standardOutput, errorOutput, exitCode }
      const content = diffResponse?.content ?? diffResponse;
      const items = content?.items ?? (Array.isArray(content) ? content : []);
      const normalizedDiff = normalizeDiff(Array.isArray(items) ? items : []);

      if (append) {
        setCurrentDiff((prev) => [...prev, ...normalizedDiff]);
      } else {
        setCurrentDiff(normalizedDiff);
      }

      setDiffCursor(content?.nextCursor ?? null);
      setHasMoreDiffs(content?.hasMore ?? false);
      setCommitInfo(null); // Not a commit diff
      setShowDiff(true);
    } catch (error: any) {
      addAlert(`Failed to show file: ${error.message}`, 'error');
    }
  }, [gitService, addAlert, normalizeDiff]);

  // Helper to start fetching diffs for given files (resets pagination)
  const fetchDiffForFiles = useCallback(async (unstagedFiles: string[], stagedFiles: string[]) => {
    currentDiffFilesRef.current = { unstaged: unstagedFiles, staged: stagedFiles };
    await fetchDiffPage(unstagedFiles, stagedFiles, null, false);
  }, [fetchDiffPage]);

  // Load the next page of file diffs (called on scroll-to-bottom)
  const loadMoreDiffs = useCallback(async () => {
    if (!hasMoreDiffs || isLoadingMoreDiffs || !diffCursor) return;
    setIsLoadingMoreDiffs(true);
    try {
      const { unstaged, staged } = currentDiffFilesRef.current;
      await fetchDiffPage(unstaged, staged, diffCursor, true);
    } finally {
      setIsLoadingMoreDiffs(false);
    }
  }, [hasMoreDiffs, isLoadingMoreDiffs, diffCursor, fetchDiffPage]);

  // Handler for clicking on staged/unstaged file changes (shows file diff)
  // isStaged parameter tells us which list the file was clicked from
  const handleFileClick = useCallback(async (filePath: string, isStaged: boolean) => {
    await fetchDiffForFiles(
      isStaged ? [] : [filePath],
      isStaged ? [filePath] : []
    );
  }, [fetchDiffForFiles]);

  // Collect all selected file paths and fetch diffs for them.
  // When no files are selected, show diff for ALL files.
  const refreshSelectedFilesDiff = useCallback(async (
    selectedStaged: Record<string, boolean>,
    selectedUnstaged: Record<string, boolean>
  ) => {
    const stagedFiles = Object.entries(selectedStaged)
      .filter(([_, selected]) => selected)
      .map(([file]) => file.replace(/.*?->\s*/, '')); // Handle renames
    const unstagedFiles = Object.entries(selectedUnstaged)
      .filter(([_, selected]) => selected)
      .map(([file]) => file.replace(/.*?->\s*/, '')); // Handle renames
    
    if (stagedFiles.length > 0 || unstagedFiles.length > 0) {
      // Show diff for selected files only
      await fetchDiffForFiles(unstagedFiles, stagedFiles);
    } else {
      // No files selected - show diff for all files
      const current = repoRef.current;
      const allStaged = (current?.changes?.stagedChanges || [])
        .map((c: any) => (c.path || c.file || '').replace(/.*?->\s*/, ''))
        .filter(Boolean);
      const allUnstaged = (current?.changes?.unstagedChanges || [])
        .map((c: any) => (c.path || c.file || '').replace(/.*?->\s*/, ''))
        .filter(Boolean);
      if (allStaged.length > 0 || allUnstaged.length > 0) {
        await fetchDiffForFiles(allUnstaged, allStaged);
      }
    }
  }, [fetchDiffForFiles]);

  const handleSelectStagedChange = useCallback((path: string, selected: boolean) => {
    const current = repoRef.current;
    const currentStaged = current?.selectedStagedChanges || {};
    const newStagedChanges = { ...currentStaged, [path]: selected };
    updateRepoCache(repoPath, {
      selectedStagedChanges: newStagedChanges,
    });
    // Show diff for all selected files (both staged and unstaged)
    refreshSelectedFilesDiff(newStagedChanges, current?.selectedUnstagedChanges || {});
  }, [repoPath, updateRepoCache, refreshSelectedFilesDiff]);

  const handleSelectUnstagedChange = useCallback((path: string, selected: boolean) => {
    const current = repoRef.current;
    const currentUnstaged = current?.selectedUnstagedChanges || {};
    const newUnstagedChanges = { ...currentUnstaged, [path]: selected };
    updateRepoCache(repoPath, {
      selectedUnstagedChanges: newUnstagedChanges,
    });
    // Show diff for all selected files (both staged and unstaged)
    refreshSelectedFilesDiff(current?.selectedStagedChanges || {}, newUnstagedChanges);
  }, [repoPath, updateRepoCache, refreshSelectedFilesDiff]);

  const handleBatchSelectStagedChange = useCallback((changes: Record<string, boolean>) => {
    const current = repoRef.current;
    const currentStaged = current?.selectedStagedChanges || {};
    const newStagedChanges = { ...currentStaged, ...changes };
    updateRepoCache(repoPath, {
      selectedStagedChanges: newStagedChanges,
    });
    refreshSelectedFilesDiff(newStagedChanges, current?.selectedUnstagedChanges || {});
  }, [repoPath, updateRepoCache, refreshSelectedFilesDiff]);

  const handleBatchSelectUnstagedChange = useCallback((changes: Record<string, boolean>) => {
    const current = repoRef.current;
    const currentUnstaged = current?.selectedUnstagedChanges || {};
    const newUnstagedChanges = { ...currentUnstaged, ...changes };
    updateRepoCache(repoPath, {
      selectedUnstagedChanges: newUnstagedChanges,
    });
    refreshSelectedFilesDiff(current?.selectedStagedChanges || {}, newUnstagedChanges);
  }, [repoPath, updateRepoCache, refreshSelectedFilesDiff]);

  // Worktree handlers
  const handleSwitchWorktree = useCallback(async (path: string) => {
    try {
      await ipc.rpc(Channels.LOADREPO, path);
    } catch (error: any) {
      addAlert(`Failed to switch worktree: ${error.message}`, 'error');
    }
  }, [ipc, addAlert]);

  const handleDeleteWorktree = useCallback(async (worktree: any) => {
    try {
      await gitService.deleteWorktree(worktree.path);
      addAlert('Worktree deleted', 'success');
    } catch (error: any) {
      addAlert(`Delete worktree failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  // Submodule handlers
  const handleUpdateSubmodules = useCallback(async (recursive: boolean) => {
    try {
      await gitService.updateSubmodules(recursive);
      addAlert('Submodules updated', 'success');
    } catch (error: any) {
      addAlert(`Update submodules failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  // Stash handlers
  const [stashOnlyUnstaged, setStashOnlyUnstaged] = useState(false);
  
  const handleStash = useCallback((unstagedOnly: boolean) => {
    setStashOnlyUnstaged(unstagedOnly);
    showModal('createStash');
  }, [showModal]);

  const handleStashWithName = useCallback(async (stashName: string) => {
    try {
      await gitService.stash(stashOnlyUnstaged, stashName);
      addAlert('Changes stashed', 'success');
    } catch (error: any) {
      addAlert(`Stash failed: ${error.message}`, 'error');
    }
  }, [gitService, stashOnlyUnstaged, addAlert]);

  const handleApplyStash = useCallback(async (stash: any) => {
    try {
      await gitService.applyStash(stash.index);
      addAlert('Stash applied', 'success');
    } catch (error: any) {
      addAlert(`Apply stash failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleDeleteStash = useCallback(async (stash: any) => {
    try {
      await gitService.deleteStash(stash.index);
      addAlert('Stash deleted', 'success');
    } catch (error: any) {
      addAlert(`Delete stash failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleViewStash = useCallback(async (stash: any) => {
    try {
      const diffResponse = await gitService.getStashDiff(stash.index) as any;
      const diff = Array.isArray(diffResponse) ? diffResponse : (diffResponse?.content || []);
      setCurrentDiff(normalizeDiff(diff || []));
      setCommitInfo({ 
        hash: stash.hash, 
        message: stash.message || `stash@{${stash.index}}`, 
        author: '',
        date: ''
      });
      setShowDiff(true);
    } catch (error: any) {
      addAlert(`View stash failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert, normalizeDiff]);

  // Active operation handlers
  const handleAbortOperation = useCallback(async () => {
    if (!activeOperation) return;
    try {
      await gitService.changeActiveOperation(activeOperation, true);
      setActiveOperation(null);
      addAlert('Operation aborted', 'info');
    } catch (error: any) {
      addAlert(`Abort failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert, activeOperation]);

  const handleContinueOperation = useCallback(async () => {
    if (!activeOperation) return;
    try {
      await gitService.changeActiveOperation(activeOperation, false);
      setActiveOperation(null);
    } catch (error: any) {
      addAlert(`Continue failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert, activeOperation]);

  // Commit history handlers
  const handleCherryPick = useCallback(async (commit: any) => {
    try {
      await gitService.cherryPick(commit.hash);
      addAlert('Cherry-pick successful', 'success');
    } catch (error: any) {
      addAlert(`Cherry-pick failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleCheckoutCommit = useCallback(async (hash: string) => {
    try {
      await gitService.checkout(hash, false, false);
      addAlert(`Checked out ${hash.substring(0, 7)}`, 'success');
    } catch (error: any) {
      addAlert(`Checkout failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleClickCommit = useCallback(async (hash: string) => {
    try {
      const diffResponse = await gitService.getCommitDiff(hash) as any;
      const diff = Array.isArray(diffResponse) ? diffResponse : (diffResponse?.content || []);
      const commits = repoRef.current?.commitHistory || [];
      const commit = commits.find((c: any) => c.hash === hash) as any;
      setCurrentDiff(normalizeDiff(diff || []));
      // Format date to string if it's a Date object
      const commitDate = commit?.authorDate || commit?.date;
      const formattedDate = commitDate instanceof Date 
        ? commitDate.toLocaleString() 
        : (typeof commitDate === 'string' ? commitDate : '');
      
      setCommitInfo(commit ? {
        hash: commit.hash,
        message: commit.message,
        author: commit.authorName || commit.author,
        date: formattedDate,
        parents: commit.parentHashes || commit.parents,
      } : null);
      setShowDiff(true);
    } catch (error: any) {
      addAlert(`Failed to load commit diff: ${error.message}`, 'error');
    }
  }, [gitService, addAlert, normalizeDiff]);

  const handleRevertCommit = useCallback(async (commit: any) => {
    try {
      await gitService.revert(commit.hash);
      addAlert(`Reverted commit ${commit.hash.substring(0, 7)}`, 'success');
    } catch (error: any) {
      addAlert(`Revert failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleCreateBranchFromCommit = useCallback(async (commit: any) => {
    // Store the commit hash for the create branch modal
    // For now, we'll just checkout the commit and then show the create branch modal
    try {
      await gitService.checkout(commit.hash, false, false);
      showModal('createBranch');
    } catch (error: any) {
      addAlert(`Failed to create branch: ${error.message}`, 'error');
    }
  }, [gitService, showModal, addAlert]);

  const handleCopyHash = useCallback((hash: string) => {
    navigator.clipboard.writeText(hash);
    addAlert(`Copied ${hash.substring(0, 7)} to clipboard`, 'info');
  }, [addAlert]);

  const handleResetToCommit = useCallback(async (commit: any, mode: 'soft' | 'mixed' | 'hard') => {
    try {
      await gitService.reset(commit.hash, mode);
      addAlert(`Reset to ${commit.hash.substring(0, 7)} (${mode})`, 'success');
    } catch (error: any) {
      addAlert(`Reset failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  // Hunk editing handlers
  const handleHunkChange = useCallback(async (filename: string, hunk: any, newContent: string) => {
    try {
      await gitService.changeHunk(filename, hunk, newContent);
      // The onFinishQueue auto-refresh will update file changes, and the
      // useEffect watching stagedChanges/unstagedChanges will refresh the diff.
    } catch (error: any) {
      throw error; // Let the error bubble up to onHunkChangeError
    }
  }, [gitService]);

  const handleHunkChangeError = useCallback((error: Error) => {
    addAlert(`Failed to modify hunk: ${error.message}`, 'error');
  }, [addAlert]);

  // Load command history
  const handleLoadMoreCommands = useCallback(async () => {
    try {
      const history = await gitService.getCommandHistory();
      // Sort newest first (backend uses executedAt, frontend may use timestamp)
      const sorted = (history || []).sort((a: any, b: any) => {
        const dateA = new Date(a.executedAt ?? a.timestamp).getTime() || 0;
        const dateB = new Date(b.executedAt ?? b.timestamp).getTime() || 0;
        return dateB - dateA;
      });
      setCommandHistory(sorted);
    } catch (error: any) {
      console.error('Failed to load command history:', error);
    }
  }, [gitService]);

  // Listen for command history changes from backend
  useIpcListener(Channels.COMMANDHISTORYCHANGED, () => {
    handleLoadMoreCommands();
  });

  // Remote checkout handler - strips origin/ prefix and checks if local branch exists
  const handleRemoteCheckout = useCallback(async (branch: any) => {
    try {
      const localBranchName = branch.name.replace('origin/', '');
      const localBranch = repoRef.current?.localBranches?.find(
        (b: any) => b.name === localBranchName
      );
      // If the local branch already exists, just checkout (no new branch)
      // If it doesn't exist, create a new local branch from the remote
      const branchName = localBranch ? localBranchName : branch.name;
      const toNewBranch = !localBranch;
      const andPull = !!localBranch; // Pull if branch already exists locally
      await gitService.checkout(branchName, toNewBranch, andPull);
      addAlert(`Checked out ${localBranchName}`, 'success');
    } catch (error: any) {
      addAlert(`Checkout failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  // Branch premerge diff view handler
  const handleBranchPremerge = useCallback(async (branch: any) => {
    try {
      const diffResponse = await gitService.getBranchPremerge(branch.hash || branch.name) as any;
      const diff = Array.isArray(diffResponse) ? diffResponse : (diffResponse?.content || []);
      setCurrentDiff(normalizeDiff(diff || []));
      setCommitInfo({
        hash: branch.hash || branch.name,
        message: `Changes between current branch and ${branch.name}`,
        author: '',
        date: '',
      });
      setShowDiff(true);
    } catch (error: any) {
      addAlert(`Failed to load premerge diff: ${error.message}`, 'error');
    }
  }, [gitService, addAlert, normalizeDiff]);

  // Stable callback refs for inline closures (prevents defeating React.memo)
  const handleShowAddWorktree = useCallback(() => showModal('addWorktree'), [showModal]);
  const handleShowAddSubmodule = useCallback(() => showModal('addSubmodule'), [showModal]);
  const handleShowRestoreStash = useCallback(() => showModal('restoreStash'), [showModal]);
  const handleShowCodeWatchers = useCallback(() => showModal('codeWatchers'), [showModal]);
  const handleDismissCrlfError = useCallback(() => setCrlfError(null), [setCrlfError]);
  const handleOpenFolderDefault = useCallback(() => handleOpenFolder(), [handleOpenFolder]);
  const handleStagedFileClick = useCallback((path: string) => handleFileClick(path, true), [handleFileClick]);
  const handleUnstagedFileClick = useCallback((path: string) => handleFileClick(path, false), [handleFileClick]);
  const handleOpenSubmoduleNewTab = useCallback((s: any) => onOpenRepoNewTabRef.current?.(repoPath + '/' + s.path), [repoPath]);
  const handleWorktreeOpenNewTab = useCallback((path: string) => onOpenRepoNewTabRef.current?.(path), []);
  const handleToggleDiffView = useCallback((show: boolean) => {
    setShowDiff(show);
    // When switching to diff view, auto-fetch diffs so the view isn't empty
    if (show && !commitInfoRef.current) {
      refreshSelectedFilesDiff(
        repoRef.current?.selectedStagedChanges || {},
        repoRef.current?.selectedUnstagedChanges || {},
      );
    }
  }, [refreshSelectedFilesDiff]);

  const handleExitDiffView = useCallback(() => {
    setShowDiff(false);
    setCurrentDiff([]);
    setCommitInfo(null);
    setDiffCursor(null);
    setHasMoreDiffs(false);
  }, []);

  const handleBranchChange = useCallback(async (branch: any | null) => {
    setActiveBranch(branch);
    noMoreCommits.current = false;
    try {
      const commits = await gitService.getCommitHistory(50, 0, branch?.name);
      updateRepoCache(repoPath, { commitHistory: commits });
    } catch (error: any) {
      addAlert(`Failed to load commits: ${error.message}`, 'error');
    }
  }, [gitService, repoPath, updateRepoCache, addAlert]);

  const handlePrependClear = useCallback(() => {
    updateSettings({ branchNamePrefix: '' });
    saveSettings();
  }, [updateSettings, saveSettings]);

  const handleStashOk = useCallback((name: string) => handleStashWithName(name), [handleStashWithName]);

  const noop = useCallback(() => {}, []);

  // Detect active operation from changes data (mirrors Angular getActiveOperation)
  useEffect(() => {
    const activeOps = repo.changes?.activeOperations;
    if (activeOps) {
      const [op] = Object.entries(activeOps).find(([, val]) => val) ?? [];
      setActiveOperation((op as ActiveOperation) || null);
    } else {
      setActiveOperation(null);
    }
  }, [repo.changes?.activeOperations]);

  // Memoize data arrays/objects to avoid new references on each render
  const stagedChanges = useMemo(() => repo.changes?.stagedChanges || [], [repo.changes?.stagedChanges]);
  const unstagedChanges = useMemo(() => repo.changes?.unstagedChanges || [], [repo.changes?.unstagedChanges]);
  const selectedStagedChanges = useMemo(() => repo.selectedStagedChanges || {}, [repo.selectedStagedChanges]);
  const selectedUnstagedChanges = useMemo(() => repo.selectedUnstagedChanges || {}, [repo.selectedUnstagedChanges]);
  // Recalculate graph blocks across the full commit list so branch
  // visualization stays continuous when new pages are loaded.
  const commitHistory = useMemo(
    () => calculateGraphBlocks(repo.commitHistory || []),
    [repo.commitHistory],
  );
  const localBranches = useMemo(() => repo.localBranches || [], [repo.localBranches]);
  const remoteBranches = useMemo(() => repo.remoteBranches || [], [repo.remoteBranches]);
  const worktrees = useMemo(() => repo.worktrees || [], [repo.worktrees]);
  const submodules = useMemo(() => repo.submodules || [], [repo.submodules]);
  const stashes = useMemo(() => repo.stashes || [], [repo.stashes]);
  const currentBranch = useMemo(
    () => localBranches.find((b: any) => b.isCurrentBranch) || null,
    [localBranches],
  );

  // Push/Pull handlers for the repo title bar
  const handlePushCurrent = useCallback(() => {
    if (currentBranch) handlePush(currentBranch, false);
  }, [currentBranch, handlePush]);

  const handlePullCurrent = useCallback(() => {
    if (currentBranch) handlePull(currentBranch, false);
  }, [currentBranch, handlePull]);

  const handleForcePushCurrent = useCallback(() => {
    if (currentBranch) handlePush(currentBranch, true);
  }, [currentBranch, handlePush]);

  const handleForcePullCurrent = useCallback(() => {
    if (currentBranch) handlePull(currentBranch, true);
  }, [currentBranch, handlePull]);

  // Auto-refresh diff when file change lists update (after stage/unstage/commit/refresh).
  // When no files are selected, refreshSelectedFilesDiff shows diff for all files.
  // Uses refs for showDiff/commitInfo to avoid triggering when those change independently.
  useEffect(() => {
    if (showDiffRef.current && !commitInfoRef.current) {
      refreshSelectedFilesDiff(
        repoRef.current?.selectedStagedChanges || {},
        repoRef.current?.selectedUnstagedChanges || {},
      );
    }
  }, [stagedChanges, unstagedChanges, refreshSelectedFilesDiff]);

  // ─── Edit Sections mode ───
  const [isEditingSections, setIsEditingSections] = useState(false);
  const persistedLayout = useSettingsStore((state) => state.settings.sectionLayouts[repoPath]);
  const setSectionLayout = useSettingsStore((state) => state.setSectionLayout);

  const sectionLayout = useMemo(() => getEffectiveLayout(persistedLayout), [persistedLayout]);

  const leftCards = useMemo(() => getColumnCards(sectionLayout, 0), [sectionLayout]);
  const middleCards = useMemo(() => getColumnCards(sectionLayout, 1), [sectionLayout]);
  const rightCards = useMemo(() => getColumnCards(sectionLayout, 2), [sectionLayout]);

  const leftHasVisible = useMemo(() => leftCards.some((c) => c.config.visible), [leftCards]);
  const middleHasVisible = useMemo(
    () => middleCards.some((c) => c.config.visible),
    [middleCards],
  );
  const rightHasVisible = useMemo(() => rightCards.some((c) => c.config.visible), [rightCards]);

  const handleToggleCardVisibility = useCallback(
    (cardId: string) => {
      const current = sectionLayout[cardId];
      if (!current) return;
      const newLayout: RepoSectionLayout = {
        ...sectionLayout,
        [cardId]: { ...current, visible: !current.visible },
      };
      setSectionLayout(repoPath, newLayout);
    },
    [sectionLayout, setSectionLayout, repoPath],
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const sourceDroppableId = result.source.droppableId;
      const destDroppableId = result.destination.droppableId;
      if (sourceDroppableId !== destDroppableId) return; // no cross-column

      const columnIndex = parseInt(sourceDroppableId.replace('column-', ''), 10);
      const columnCards = getColumnCards(sectionLayout, columnIndex);
      const reordered = [...columnCards];
      const [moved] = reordered.splice(result.source.index, 1);
      reordered.splice(result.destination.index, 0, moved);

      const newLayout: RepoSectionLayout = { ...sectionLayout };
      reordered.forEach((card, idx) => {
        newLayout[card.id] = { ...newLayout[card.id], order: idx };
      });
      setSectionLayout(repoPath, newLayout);
    },
    [sectionLayout, setSectionLayout, repoPath],
  );

  // Map of card ID -> JSX element
  const cardComponents: Record<CardId, React.ReactNode> = useMemo(
    () => ({
      [CardId.LocalBranches]: (
        <LocalBranchesCard
          branches={localBranches}
          worktrees={worktrees}
          showTrackingPath={true}
          onCheckout={handleCheckout}
          onCreateBranch={handleCreateBranch}
          onMerge={handleMerge}
          onRebase={handleRebase}
          onInteractiveRebase={handleInteractiveRebase}
          onPrune={handlePruneBranches}
          onPush={handlePush}
          onPull={handlePull}
          onDelete={handleDeleteBranch}
          onRename={handleRenameBranch}
          onFastForward={handleFastForward}
          onViewChanges={handleBranchPremerge}
        />
      ),
      [CardId.RemoteBranches]: (
        <RemoteBranchesCard
          branches={remoteBranches}
          localBranches={localBranches}
          onCheckout={handleRemoteCheckout}
          onDelete={handleDeleteBranch}
        />
      ),
      [CardId.Worktrees]: (
        <WorktreesCard
          worktrees={worktrees}
          onAddWorktree={handleShowAddWorktree}
          onOpenFolder={handleOpenFolder}
          onOpenNewTab={handleWorktreeOpenNewTab}
          onSwitch={handleSwitchWorktree}
          onDelete={handleDeleteWorktree}
        />
      ),
      [CardId.Submodules]: (
        <SubmodulesCard
          submodules={submodules}
          onAddSubmodule={handleShowAddSubmodule}
          onUpdateSubmodules={handleUpdateSubmodules}
          onOpenNewTab={handleOpenSubmoduleNewTab}
          onViewSubmodule={handleOpenSubmoduleNewTab}
        />
      ),
      [CardId.Stashes]: (
        <StashesCard
          stashes={stashes}
          onStash={handleStash}
          onApplyStash={handleApplyStash}
          onDeleteStash={handleDeleteStash}
          onViewStash={handleViewStash}
          onRestoreStash={handleShowRestoreStash}
        />
      ),
      [CardId.CommandHistory]: (
        <CommandHistoryCard
          commandHistory={commandHistory}
          onLoadMore={handleLoadMoreCommands}
        />
      ),
      [CardId.StagedChanges]: (
        <StagedChangesCard
          changes={stagedChanges}
          selectedChanges={selectedStagedChanges}
          splitFilenameDisplay={splitFilenameDisplay}
          onSelectChange={handleSelectStagedChange}
          onBatchSelectChange={handleBatchSelectStagedChange}
          onUnstageAll={handleUnstageAll}
          onUnstageSelected={handleUnstageSelected}
          onUndoFile={handleUndoFile}
          onDeleteFiles={handleDeleteFiles}
          onSetFilenameSplit={handleSetFilenameSplit}
          onFileClick={handleStagedFileClick}
        />
      ),
      [CardId.UnstagedChanges]: (
        <UnstagedChangesCard
          changes={unstagedChanges}
          selectedChanges={selectedUnstagedChanges}
          splitFilenameDisplay={splitFilenameDisplay}
          onSelectChange={handleSelectUnstagedChange}
          onBatchSelectChange={handleBatchSelectUnstagedChange}
          onStageAll={handleStageAll}
          onStageSelected={handleStageSelected}
          onUndoFile={handleUndoFile}
          onDeleteFiles={handleDeleteFiles}
          onSetFilenameSplit={handleSetFilenameSplit}
          onFileClick={handleUnstagedFileClick}
        />
      ),
      [CardId.CommitHistory]: (
        <CommitHistoryCard
          commits={commitHistory}
          showDiff={showDiff}
          diffHeaders={currentDiff}
          commitInfo={commitInfo}
          localBranches={localBranches}
          remoteBranches={remoteBranches}
          activeBranch={activeBranch}
          ignoreWhitespace={diffIgnoreWhitespace}
          hasMoreDiffs={hasMoreDiffs}
          isLoadingMoreDiffs={isLoadingMoreDiffs}
          onToggleView={handleToggleDiffView}
          onClickCommit={handleClickCommit}
          onCherryPick={handleCherryPick}
          onCheckout={handleCheckoutCommit}
          onLoadMore={handleLoadMoreCommits}
          onLoadMoreDiffs={loadMoreDiffs}
          onBranchChange={handleBranchChange}
          onIgnoreWhitespaceChange={handleIgnoreWhitespaceChange}
          onExitDiffView={handleExitDiffView}
          onRevert={handleRevertCommit}
          onCreateBranchFromCommit={handleCreateBranchFromCommit}
          onCopyHash={handleCopyHash}
          onResetToCommit={handleResetToCommit}
          onHunkChange={handleHunkChange}
          onHunkChangeError={handleHunkChangeError}
        />
      ),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      localBranches, remoteBranches, worktrees, submodules, stashes, commandHistory,
      stagedChanges, unstagedChanges, selectedStagedChanges, selectedUnstagedChanges,
      commitHistory, showDiff, currentDiff, commitInfo, activeBranch,
      splitFilenameDisplay, diffIgnoreWhitespace, commitAndPush,
      hasMoreDiffs, isLoadingMoreDiffs,
    ],
  );

  const cardTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cfg of CARD_CONFIGS) {
      map[cfg.id] = cfg.title;
    }
    return map;
  }, []);

  // Render a column's cards, optionally wrapped with drag-and-drop
  const renderColumnCards = useCallback(
    (cards: { id: string; config: SectionCardLayout }[], columnIndex: number) => {
      if (isEditingSections) {
        return (
          <Droppable droppableId={`column-${columnIndex}`}>
            {(provided) => (
              <DroppableColumn ref={provided.innerRef} {...provided.droppableProps}>
                {cards.map((card, index) => (
                  <Draggable key={card.id} draggableId={card.id} index={index}>
                    {(dragProvided) => (
                      <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                        <EditableCard
                          cardId={card.id}
                          cardTitle={cardTitleMap[card.id] || card.id}
                          visible={card.config.visible}
                          onToggleVisibility={handleToggleCardVisibility}
                          dragHandleProps={dragProvided.dragHandleProps}
                        >
                          {cardComponents[card.id]}
                        </EditableCard>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </DroppableColumn>
            )}
          </Droppable>
        );
      }

      // Normal mode: render visible cards without DnD wrappers
      return cards
        .filter((card) => card.config.visible)
        .map((card) => (
          <React.Fragment key={card.id}>{cardComponents[card.id]}</React.Fragment>
        ));
    },
    [isEditingSections, cardComponents, cardTitleMap, handleToggleCardVisibility],
  );

  if (!repoPath) {
    return null;
  }

  const editSectionsContextValue = { isEditing: isEditingSections, setIsEditing: setIsEditingSections };

  return (
    <EditSectionsContext.Provider value={editSectionsContextValue}>
    <DragDropContext onDragEnd={handleDragEnd}>
    <RepoViewContainer>
      {/* Left Column */}
      {(leftHasVisible || isEditingSections) && (
      <Column>
        <RepoTitle>
          {activeTab?.name || 'Repository'}
          <TitleButtonGroup>
            <Dropdown as={ButtonGroup} size="sm">
              <TooltipTrigger
                placement="bottom"
                overlay={<Tooltip id="tooltip-pull-repo">Pull</Tooltip>}
              >
                <Button variant="info" onClick={handlePullCurrent}>
                  <Icon name="fa-arrow-down" />
                </Button>
              </TooltipTrigger>
              <Dropdown.Toggle split variant="info" />
              <Dropdown.Menu popperConfig={{ strategy: 'fixed' }} renderOnMount>
                <Dropdown.Item onClick={handleForcePullCurrent}>
                  <Icon name="fa-shield-alt" /> Force Pull
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            <Dropdown as={ButtonGroup} size="sm">
              <TooltipTrigger
                placement="bottom"
                overlay={<Tooltip id="tooltip-push-repo">Push</Tooltip>}
              >
                <Button variant="info" onClick={handlePushCurrent}>
                  <Icon name="fa-arrow-up" />
                </Button>
              </TooltipTrigger>
              <Dropdown.Toggle split variant="info" />
              <Dropdown.Menu popperConfig={{ strategy: 'fixed' }} renderOnMount>
                <Dropdown.Item onClick={handleForcePushCurrent}>
                  <Icon name="fa-shield-alt" /> Force Push
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            <TooltipTrigger
              placement="bottom"
              overlay={<Tooltip id="tooltip-refresh-all">Refresh All</Tooltip>}
            >
              <Button variant="primary" size="sm" onClick={handleFullRefresh}>
                <Icon name="fa-sync-alt" />
              </Button>
            </TooltipTrigger>
            <TooltipTrigger
              placement="bottom"
              overlay={<Tooltip id="tooltip-discard-all">Discard All Changes</Tooltip>}
            >
              <Button variant="warning" size="sm" onClick={handleDiscardAll}>
                <Icon name="fa-undo" />
              </Button>
            </TooltipTrigger>
          </TitleButtonGroup>
          <EllipsisDropdownWrapper>
            <Dropdown align="end">
              <Dropdown.Toggle variant="link" size="sm" id="repo-menu-dropdown">
                <Icon name="fa-ellipsis-vertical" />
              </Dropdown.Toggle>
              <Dropdown.Menu popperConfig={{ strategy: 'fixed' }} renderOnMount>
                <Dropdown.Item onClick={handleOpenTerminal}>
                  <Icon name="fa-terminal" /> Open Terminal
                </Dropdown.Item>
                <Dropdown.Item onClick={handleOpenFolderDefault}>
                  <Icon name="fa-folder-open" /> Open Folder
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={() => setIsEditingSections(!isEditingSections)}>
                  {isEditingSections ? 'Done Editing' : 'Edit Sections'}
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </EllipsisDropdownWrapper>
        </RepoTitle>

        {renderColumnCards(leftCards, 0)}
      </Column>
      )}

      {/* Middle Column */}
      {(middleHasVisible || isEditingSections) && (
      <Column>
        {renderColumnCards(middleCards, 1)}

        <ActiveOperationBanner
          operation={activeOperation}
          onAbort={handleAbortOperation}
          onContinue={handleContinueOperation}
        />

        {!activeOperation && (
          <CommitPanel
            commitMessage={commitMessage}
            commitAndPush={commitAndPush}
            hasWatcherAlerts={false}
            disabledReason={undefined}
            crlfError={crlfError}
            stagedChanges={stagedChanges}
            unstagedChanges={unstagedChanges}
            currentBranchName={activeBranch?.name || localBranches.find((b: any) => b.isCurrentBranch)?.name || ''}
            onMessageChange={setCommitMessage}
            onCommitAndPushChange={handleCommitAndPushChange}
            onCommit={handleCommit}
            onShowWatchers={handleShowCodeWatchers}
            onDismissCrlfError={handleDismissCrlfError}
          />
        )}
      </Column>
      )}

      {/* Right Column */}
      {(rightHasVisible || isEditingSections) && (
      <Column>
        {renderColumnCards(rightCards, 2)}
      </Column>
      )}

      {/* Modals */}
      <ConfirmModal
        modalId="discardAllModal"
        title="Confirm Discard All"
        confirmText="Discard All"
        confirmVariant="danger"
        onConfirm={handleHardReset}
      >
        <p>Are you sure you want to discard <em>all changes</em>?</p>
        <p><strong>This cannot be undone</strong></p>
      </ConfirmModal>

      <InputModal
        modalId="createBranch"
        title="Create Branch"
        message="Create branch off current HEAD"
        placeholder="Branch name..."
        validPattern="[a-zA-Z0-9/._-]*[a-zA-Z0-9._-]"
        invalidMessage="Please enter a valid branch name"
        inputPrepend={branchNamePrefix}
        showPrependClearButton={!!branchNamePrefix}
        replaceChars={{ '\\s': '-' }}
        onOk={handleCreateBranchSubmit}
        onPrependClear={handlePrependClear}
      />

      <InputModal
        modalId="createStash"
        title="Stash Changes"
        message="Please enter a name for the stash"
        placeholder="Stash name..."
        validPattern='^[^"]*$'
        invalidMessage="Stash name cannot include double quotes"
        onOk={handleStashOk}
      />

      <PruneBranchDialog
        localBranches={localBranches}
        onConfirm={handleConfirmPruneBranches}
      />

      <MergeBranchDialog
        localBranches={localBranches}
        remoteBranches={remoteBranches}
        activeMergeInfo={activeMergeInfo}
        hasUncommittedChanges={(stagedChanges.length || 0) + (unstagedChanges.length || 0) > 0}
        onMerge={handleMergeBranchSubmit}
        onCancel={noop}
      />

      <ConfirmModal
        modalId="confirmDeleteBranch"
        title="Confirm Delete Branch"
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={handleConfirmDeleteBranch}
      >
        <p>Are you sure you want to delete branch <strong>{branchToDelete?.name}</strong>?</p>
        {branchToDelete?.isRemote && (
          <p className="text-danger"><strong>This will affect everyone and cannot be undone.</strong></p>
        )}
      </ConfirmModal>

      <InputModal
        modalId="renameBranch"
        title="Rename Branch"
        message={`Rename branch "${branchToRename?.name || ''}"`}
        placeholder="New branch name..."
        validPattern="[a-zA-Z0-9/._-]*[a-zA-Z0-9._-]"
        invalidMessage="Please enter a valid branch name"
        replaceChars={{ '\\s': '-' }}
        onOk={handleRenameBranchSubmit}
      />
    </RepoViewContainer>
    </DragDropContext>
    </EditSectionsContext.Provider>
  );
};

export default RepoView;
