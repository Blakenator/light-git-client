import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import { useRepositoryStore, useSettingsStore, useUiStore } from '../../stores';
import { Icon } from '@light-git/core';
import { useIpc, useGitService } from '../../ipc';
import { Channels } from '@light-git/shared';
import { ConfirmModal } from '../../common/components/ConfirmModal/ConfirmModal';
import { InputModal } from '../../common/components/InputModal/InputModal';
import { PruneBranchDialog, MergeBranchDialog } from './dialogs';
import {
  RepoViewContainer,
  Column,
  RepoTitle,
  TitleButtonGroup,
  CardWrapper,
  FlexGrowCard,
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
  const [ignoreWhitespace, setIgnoreWhitespace] = React.useState(false);

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
    try {
      const data = await gitService.refreshAll();
      
      updateRepoCache(repoPath, {
        changes: data.changes,
        localBranches: data.localBranches,
        remoteBranches: data.remoteBranches,
        stashes: data.stashes,
        worktrees: data.worktrees,
        submodules: data.submodules,
        commitHistory: data.commitHistory,
      });
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

  // Git operation handlers (using job scheduler for proper queuing)
  const handleCheckout = useCallback(async (branch: any, andPull: boolean) => {
    try {
      await gitService.checkout(branch.name, andPull);
      await refreshRepo();
      addAlert(`Checked out ${branch.name}`, 'success');
    } catch (error: any) {
      addAlert(`Checkout failed: ${error.message}`, 'error');
    }
  }, [gitService, refreshRepo, addAlert]);

  const handlePush = useCallback(async (branch: any, force: boolean) => {
    try {
      await gitService.push(branch, force);
      await refreshRepo();
      addAlert('Push successful', 'success');
    } catch (error: any) {
      addAlert(`Push failed: ${error.message}`, 'error');
    }
  }, [gitService, refreshRepo, addAlert]);

  const handlePull = useCallback(async (branch: any, force: boolean) => {
    try {
      await gitService.pull(force);
      await refreshRepo();
      addAlert('Pull successful', 'success');
    } catch (error: any) {
      addAlert(`Pull failed: ${error.message}`, 'error');
    }
  }, [gitService, refreshRepo, addAlert]);

  const handleMerge = useCallback((branch?: any) => {
    showModal('mergeBranch');
  }, [showModal]);

  const handleCreateBranch = useCallback(() => {
    showModal('createBranch');
  }, [showModal]);

  const handlePruneBranches = useCallback(() => {
    showModal('pruneBranch');
  }, [showModal]);

  const handleConfirmPruneBranches = useCallback(async (branches: any[]) => {
    try {
      for (const branch of branches) {
        await gitService.deleteBranch(branch.name, false);
      }
      await refreshRepo();
      addAlert(`Deleted ${branches.length} branch(es)`, 'success');
    } catch (error: any) {
      addAlert(`Prune failed: ${error.message}`, 'error');
    }
  }, [gitService, refreshRepo, addAlert]);

  const handleDeleteBranch = useCallback(async (branch: any) => {
    try {
      await gitService.deleteBranch(branch.name, branch.isRemote);
      await refreshRepo();
      addAlert(`Deleted branch ${branch.name}`, 'success');
    } catch (error: any) {
      addAlert(`Delete failed: ${error.message}`, 'error');
    }
  }, [gitService, refreshRepo, addAlert]);

  const handleRenameBranch = useCallback(async (branch: any) => {
    // TODO: Show rename dialog
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
      await refreshRepo();
      addAlert('All changes discarded', 'info');
    } catch (error: any) {
      addAlert(`Hard reset failed: ${error.message}`, 'error');
    }
  }, [gitService, refreshRepo, addAlert]);

  const handleFastForward = useCallback(async (branch: any) => {
    try {
      await gitService.fastForward(branch);
      await refreshRepo();
      addAlert(`Fast-forwarded ${branch.name}`, 'success');
    } catch (error: any) {
      addAlert(`Fast-forward failed: ${error.message}`, 'error');
    }
  }, [gitService, refreshRepo, addAlert]);

  const handleCreateBranchSubmit = useCallback(async (branchName: string) => {
    try {
      const prefix = branchNamePrefix || '';
      await gitService.createBranch(prefix + branchName);
      await refreshRepo();
      addAlert(`Created branch ${prefix + branchName}`, 'success');
    } catch (error: any) {
      addAlert(`Create branch failed: ${error.message}`, 'error');
    }
  }, [gitService, branchNamePrefix, refreshRepo, addAlert]);

  const handleRenameBranchSubmit = useCallback(async (oldName: string, newName: string) => {
    try {
      await gitService.renameBranch(oldName, newName);
      await refreshRepo();
      addAlert(`Renamed branch to ${newName}`, 'success');
    } catch (error: any) {
      addAlert(`Rename branch failed: ${error.message}`, 'error');
    }
  }, [gitService, refreshRepo, addAlert]);

  const handleMergeFile = useCallback(async (file: string) => {
    try {
      await gitService.merge(file);
      await refreshRepo();
    } catch (error: any) {
      addAlert(`Merge failed: ${error.message}`, 'error');
    }
  }, [gitService, refreshRepo, addAlert]);

  const handleResolveConflict = useCallback(async (file: string, useTheirs: boolean) => {
    try {
      await gitService.resolveConflict(file, useTheirs);
      await refreshRepo();
      addAlert(`Conflict resolved using ${useTheirs ? 'theirs' : 'ours'}`, 'success');
    } catch (error: any) {
      addAlert(`Resolve conflict failed: ${error.message}`, 'error');
    }
  }, [gitService, refreshRepo, addAlert]);

  const handleAddSubmodule = useCallback(async (url: string, path: string) => {
    try {
      await gitService.addSubmodule(url, path);
      await refreshRepo();
      addAlert('Submodule added', 'success');
    } catch (error: any) {
      addAlert(`Add submodule failed: ${error.message}`, 'error');
    }
  }, [gitService, refreshRepo, addAlert]);

  const handleFetch = useCallback(async (prune: boolean = false) => {
    try {
      await gitService.fetch(prune);
      await refreshRepo();
    } catch (error: any) {
      // Only show error for certain cases
      if (!error.message?.includes('No remote repository')) {
        addAlert(`Fetch failed: ${error.message}`, 'error');
      }
    }
  }, [gitService, refreshRepo, addAlert]);

  const handleCommit = useCallback(async (amend: boolean) => {
    try {
      const currentBranch = commitAndPush
        ? repoRef.current?.localBranches?.find((b: any) => b.isCurrentBranch)
        : undefined;
      await gitService.commit(commitMessageRef.current, amend, commitAndPush, currentBranch);
      setCommitMessage('');
      await refreshRepo();
      addAlert(amend ? 'Commit amended' : 'Committed successfully', 'success');
    } catch (error: any) {
      addAlert(`Commit failed: ${error.message}`, 'error');
    }
  }, [gitService, commitAndPush, refreshRepo, addAlert]);

  const handleCommitAndPushChange = useCallback((value: boolean) => {
    updateSettings({ commitAndPush: value });
    saveSettings();
  }, [updateSettings, saveSettings]);

  const handleSetFilenameSplit = useCallback((split: boolean) => {
    updateSettings({ splitFilenameDisplay: split });
    saveSettings();
  }, [updateSettings, saveSettings]);

  const handleLoadMoreCommits = useCallback(async () => {
    try {
      const commits = await gitService.getCommitHistory(50);
      updateRepoCache(repoPath, { commitHistory: commits });
    } catch (error: any) {
      addAlert(`Failed to load commits: ${error.message}`, 'error');
    }
  }, [gitService, repoPath, updateRepoCache, addAlert]);

  // Staging/unstaging handlers
  const handleStageAll = useCallback(async () => {
    try {
      await gitService.stage(['.']);
      await refreshRepo();
      updateRepoCache(repoPath, { selectedUnstagedChanges: {} });
    } catch (error: any) {
      addAlert(`Stage failed: ${error.message}`, 'error');
    }
  }, [gitService, repoPath, refreshRepo, updateRepoCache, addAlert]);

  const handleUnstageAll = useCallback(async () => {
    try {
      await gitService.unstage(['.']);
      await refreshRepo();
      updateRepoCache(repoPath, { selectedStagedChanges: {} });
    } catch (error: any) {
      addAlert(`Unstage failed: ${error.message}`, 'error');
    }
  }, [gitService, repoPath, refreshRepo, updateRepoCache, addAlert]);

  const handleStageSelected = useCallback(async () => {
    try {
      const files = Object.entries(repoRef.current?.selectedUnstagedChanges || {})
        .filter(([_, selected]) => selected)
        .map(([file]) => file.replace(/.*?->\s*/, '')); // Handle renames
      if (files.length > 0) {
        await gitService.stage(files);
        await refreshRepo();
        updateRepoCache(repoPath, { selectedUnstagedChanges: {} });
      }
    } catch (error: any) {
      addAlert(`Stage failed: ${error.message}`, 'error');
    }
  }, [gitService, repoPath, refreshRepo, updateRepoCache, addAlert]);

  const handleUnstageSelected = useCallback(async () => {
    try {
      const files = Object.entries(repoRef.current?.selectedStagedChanges || {})
        .filter(([_, selected]) => selected)
        .map(([file]) => file.replace(/.*?->\s*/, '')); // Handle renames
      if (files.length > 0) {
        await gitService.unstage(files);
        await refreshRepo();
        updateRepoCache(repoPath, { selectedStagedChanges: {} });
      }
    } catch (error: any) {
      addAlert(`Unstage failed: ${error.message}`, 'error');
    }
  }, [gitService, repoPath, refreshRepo, updateRepoCache, addAlert]);

  const handleUndoFile = useCallback(async (path: string) => {
    try {
      await gitService.undoFileChanges([path]);
      await refreshRepo();
    } catch (error: any) {
      addAlert(`Undo failed: ${error.message}`, 'error');
    }
  }, [gitService, refreshRepo, addAlert]);

  const handleDeleteFiles = useCallback(async (paths: string[]) => {
    try {
      await gitService.deleteFiles(paths);
      await refreshRepo();
    } catch (error: any) {
      addAlert(`Delete failed: ${error.message}`, 'error');
    }
  }, [gitService, refreshRepo, addAlert]);

  // Helper to fetch diff for given staged and unstaged files
  const fetchDiffForFiles = useCallback(async (unstagedFiles: string[], stagedFiles: string[]) => {
    try {
      const diffResponse = await gitService.getFileDiff(unstagedFiles, stagedFiles) as any;
      // Extract content from response - backend returns {content, standardOutput, errorOutput, exitCode}
      const diff = Array.isArray(diffResponse) ? diffResponse : (diffResponse?.content || []);
      const normalizedDiff = normalizeDiff(diff || []);
      setCurrentDiff(normalizedDiff);
      setCommitInfo(null); // Not a commit diff
      setShowDiff(true);
    } catch (error: any) {
      addAlert(`Failed to show file: ${error.message}`, 'error');
    }
  }, [gitService, addAlert, normalizeDiff]);

  // Handler for clicking on staged/unstaged file changes (shows file diff)
  // isStaged parameter tells us which list the file was clicked from
  const handleFileClick = useCallback(async (filePath: string, isStaged: boolean) => {
    await fetchDiffForFiles(
      isStaged ? [] : [filePath],
      isStaged ? [filePath] : []
    );
  }, [fetchDiffForFiles]);

  // Collect all selected file paths and fetch diffs for them
  const refreshSelectedFilesDiff = useCallback(async (
    stagedChanges: Record<string, boolean>,
    unstagedChanges: Record<string, boolean>
  ) => {
    const stagedFiles = Object.entries(stagedChanges)
      .filter(([_, selected]) => selected)
      .map(([file]) => file.replace(/.*?->\s*/, '')); // Handle renames
    const unstagedFiles = Object.entries(unstagedChanges)
      .filter(([_, selected]) => selected)
      .map(([file]) => file.replace(/.*?->\s*/, '')); // Handle renames
    
    if (stagedFiles.length > 0 || unstagedFiles.length > 0) {
      await fetchDiffForFiles(unstagedFiles, stagedFiles);
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
      await refreshRepo();
      addAlert('Worktree deleted', 'success');
    } catch (error: any) {
      addAlert(`Delete worktree failed: ${error.message}`, 'error');
    }
  }, [gitService, refreshRepo, addAlert]);

  // Submodule handlers
  const handleUpdateSubmodules = useCallback(async (recursive: boolean) => {
    try {
      await gitService.updateSubmodules(recursive);
      await refreshRepo();
      addAlert('Submodules updated', 'success');
    } catch (error: any) {
      addAlert(`Update submodules failed: ${error.message}`, 'error');
    }
  }, [gitService, refreshRepo, addAlert]);

  // Stash handlers
  const [stashOnlyUnstaged, setStashOnlyUnstaged] = useState(false);
  
  const handleStash = useCallback((unstagedOnly: boolean) => {
    setStashOnlyUnstaged(unstagedOnly);
    showModal('createStash');
  }, [showModal]);

  const handleStashWithName = useCallback(async (stashName: string) => {
    try {
      await gitService.stash(stashOnlyUnstaged, stashName);
      await refreshRepo();
      addAlert('Changes stashed', 'success');
    } catch (error: any) {
      addAlert(`Stash failed: ${error.message}`, 'error');
    }
  }, [gitService, stashOnlyUnstaged, refreshRepo, addAlert]);

  const handleApplyStash = useCallback(async (stash: any) => {
    try {
      await gitService.applyStash(stash.index);
      await refreshRepo();
      addAlert('Stash applied', 'success');
    } catch (error: any) {
      addAlert(`Apply stash failed: ${error.message}`, 'error');
    }
  }, [gitService, refreshRepo, addAlert]);

  const handleDeleteStash = useCallback(async (stash: any) => {
    try {
      await gitService.deleteStash(stash.index);
      await refreshRepo();
      addAlert('Stash deleted', 'success');
    } catch (error: any) {
      addAlert(`Delete stash failed: ${error.message}`, 'error');
    }
  }, [gitService, refreshRepo, addAlert]);

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
    try {
      await gitService.changeActiveOperation('abort');
      setActiveOperation(null);
      await refreshRepo();
      addAlert('Operation aborted', 'info');
    } catch (error: any) {
      addAlert(`Abort failed: ${error.message}`, 'error');
    }
  }, [gitService, refreshRepo, addAlert]);

  const handleContinueOperation = useCallback(async () => {
    try {
      await gitService.changeActiveOperation('continue');
      setActiveOperation(null);
      await refreshRepo();
    } catch (error: any) {
      addAlert(`Continue failed: ${error.message}`, 'error');
    }
  }, [gitService, refreshRepo, addAlert]);

  // Commit history handlers
  const handleCherryPick = useCallback(async (commit: any) => {
    try {
      await gitService.cherryPick(commit.hash);
      await refreshRepo();
      addAlert('Cherry-pick successful', 'success');
    } catch (error: any) {
      addAlert(`Cherry-pick failed: ${error.message}`, 'error');
    }
  }, [gitService, refreshRepo, addAlert]);

  const handleCheckoutCommit = useCallback(async (hash: string) => {
    try {
      await gitService.checkout(hash, false);
      await refreshRepo();
      addAlert(`Checked out ${hash.substring(0, 7)}`, 'success');
    } catch (error: any) {
      addAlert(`Checkout failed: ${error.message}`, 'error');
    }
  }, [gitService, refreshRepo, addAlert]);

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
      await refreshRepo();
      addAlert(`Reverted commit ${commit.hash.substring(0, 7)}`, 'success');
    } catch (error: any) {
      addAlert(`Revert failed: ${error.message}`, 'error');
    }
  }, [gitService, refreshRepo, addAlert]);

  const handleCreateBranchFromCommit = useCallback(async (commit: any) => {
    // Store the commit hash for the create branch modal
    // For now, we'll just checkout the commit and then show the create branch modal
    try {
      await gitService.checkout(commit.hash, false);
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
      await refreshRepo();
      addAlert(`Reset to ${commit.hash.substring(0, 7)} (${mode})`, 'success');
    } catch (error: any) {
      addAlert(`Reset failed: ${error.message}`, 'error');
    }
  }, [gitService, refreshRepo, addAlert]);

  // Hunk editing handlers
  const handleHunkChange = useCallback(async (filename: string, hunk: any, newContent: string) => {
    try {
      await gitService.changeHunk(filename, hunk, newContent);
      await refreshRepo();
      // Refresh the diff to show the updated content
      const current = repoRef.current;
      refreshSelectedFilesDiff(current?.selectedStagedChanges || {}, current?.selectedUnstagedChanges || {});
    } catch (error: any) {
      throw error; // Let the error bubble up to onHunkChangeError
    }
  }, [gitService, refreshRepo, refreshSelectedFilesDiff]);

  const handleHunkChangeError = useCallback((error: Error) => {
    addAlert(`Failed to modify hunk: ${error.message}`, 'error');
  }, [addAlert]);

  // Load command history
  const handleLoadMoreCommands = useCallback(async () => {
    try {
      const history = await gitService.getCommandHistory();
      setCommandHistory(history || []);
    } catch (error: any) {
      console.error('Failed to load command history:', error);
    }
  }, [gitService]);

  // Load command history on mount only (no periodic refresh to avoid performance issues)
  const commandHistoryLoadedRef = React.useRef(false);
  useEffect(() => {
    if (!commandHistoryLoadedRef.current) {
      commandHistoryLoadedRef.current = true;
      handleLoadMoreCommands();
    }
  }, [handleLoadMoreCommands]);

  // Stable callback refs for inline closures (prevents defeating React.memo)
  const handleRemoteCheckout = useCallback((b: any) => handleCheckout(b, true), [handleCheckout]);
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
    if (!show) {
      setCurrentDiff([]);
      setCommitInfo(null);
    }
  }, []);

  const handlePrependClear = useCallback(() => {
    updateSettings({ branchNamePrefix: '' });
    saveSettings();
  }, [updateSettings, saveSettings]);

  const handleStashOk = useCallback((name: string) => handleStashWithName(name), [handleStashWithName]);

  const noop = useCallback(() => {}, []);

  // Memoize data arrays/objects to avoid new references on each render
  const stagedChanges = useMemo(() => repo.changes?.stagedChanges || [], [repo.changes?.stagedChanges]);
  const unstagedChanges = useMemo(() => repo.changes?.unstagedChanges || [], [repo.changes?.unstagedChanges]);
  const selectedStagedChanges = useMemo(() => repo.selectedStagedChanges || {}, [repo.selectedStagedChanges]);
  const selectedUnstagedChanges = useMemo(() => repo.selectedUnstagedChanges || {}, [repo.selectedUnstagedChanges]);
  const commitHistory = useMemo(() => repo.commitHistory || [], [repo.commitHistory]);
  const localBranches = useMemo(() => repo.localBranches || [], [repo.localBranches]);
  const remoteBranches = useMemo(() => repo.remoteBranches || [], [repo.remoteBranches]);
  const worktrees = useMemo(() => repo.worktrees || [], [repo.worktrees]);
  const submodules = useMemo(() => repo.submodules || [], [repo.submodules]);
  const stashes = useMemo(() => repo.stashes || [], [repo.stashes]);

  if (!repoPath) {
    return null;
  }

  return (
    <RepoViewContainer>
      {/* Left Column */}
      <Column>
        <RepoTitle>
          {activeTab?.name || 'Repository'}
          <TitleButtonGroup>
            <Button variant="primary" size="sm" onClick={handleOpenTerminal} title="Open Bash Terminal">
              <Icon name="fa-terminal" />
            </Button>
            <Button variant="info" size="sm" onClick={handleOpenFolderDefault} title="Open Folder">
              <Icon name="fa-folder-open" />
            </Button>
            <Button variant="primary" size="sm" onClick={handleFullRefresh} title="Refresh All">
              <Icon name="fa-sync-alt" />
            </Button>
            <Button variant="warning" size="sm" onClick={handleDiscardAll} title="Discard All Changes">
              <Icon name="fa-undo" /> Discard All
            </Button>
          </TitleButtonGroup>
        </RepoTitle>

        <CardWrapper>
          <LocalBranchesCard
            branches={localBranches}
            onCheckout={handleCheckout}
            onCreateBranch={handleCreateBranch}
            onMerge={handleMerge}
            onPrune={handlePruneBranches}
            onPush={handlePush}
            onPull={handlePull}
            onDelete={handleDeleteBranch}
            onRename={handleRenameBranch}
            onFastForward={handleFastForward}
          />
        </CardWrapper>

        <CardWrapper>
          <RemoteBranchesCard
            branches={remoteBranches}
            onCheckout={handleRemoteCheckout}
            onDelete={handleDeleteBranch}
          />
        </CardWrapper>

        <CardWrapper>
          <WorktreesCard
            worktrees={worktrees}
            onAddWorktree={handleShowAddWorktree}
            onOpenFolder={handleOpenFolder}
            onOpenNewTab={handleWorktreeOpenNewTab}
            onSwitch={handleSwitchWorktree}
            onDelete={handleDeleteWorktree}
          />
        </CardWrapper>

        <CardWrapper>
          <SubmodulesCard
            submodules={submodules}
            onAddSubmodule={handleShowAddSubmodule}
            onUpdateSubmodules={handleUpdateSubmodules}
            onOpenNewTab={handleOpenSubmoduleNewTab}
            onViewSubmodule={handleOpenSubmoduleNewTab}
          />
        </CardWrapper>

        <CardWrapper>
          <StashesCard
            stashes={stashes}
            onStash={handleStash}
            onApplyStash={handleApplyStash}
            onDeleteStash={handleDeleteStash}
            onViewStash={handleViewStash}
            onRestoreStash={handleShowRestoreStash}
          />
        </CardWrapper>

        <CardWrapper>
          <CommandHistoryCard
            commandHistory={commandHistory}
            onLoadMore={handleLoadMoreCommands}
          />
        </CardWrapper>
      </Column>

      {/* Middle Column */}
      <Column>
        <FlexGrowCard>
          <StagedChangesCard
            changes={stagedChanges}
            selectedChanges={selectedStagedChanges}
            splitFilenameDisplay={splitFilenameDisplay}
            onSelectChange={handleSelectStagedChange}
            onUnstageAll={handleUnstageAll}
            onUnstageSelected={handleUnstageSelected}
            onUndoFile={handleUndoFile}
            onDeleteFiles={handleDeleteFiles}
            onSetFilenameSplit={handleSetFilenameSplit}
            onFileClick={handleStagedFileClick}
          />
        </FlexGrowCard>

        <FlexGrowCard>
          <UnstagedChangesCard
            changes={unstagedChanges}
            selectedChanges={selectedUnstagedChanges}
            splitFilenameDisplay={splitFilenameDisplay}
            onSelectChange={handleSelectUnstagedChange}
            onStageAll={handleStageAll}
            onStageSelected={handleStageSelected}
            onUndoFile={handleUndoFile}
            onDeleteFiles={handleDeleteFiles}
            onSetFilenameSplit={handleSetFilenameSplit}
            onFileClick={handleUnstagedFileClick}
          />
        </FlexGrowCard>

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
            onMessageChange={setCommitMessage}
            onCommitAndPushChange={handleCommitAndPushChange}
            onCommit={handleCommit}
            onShowWatchers={handleShowCodeWatchers}
            onDismissCrlfError={handleDismissCrlfError}
          />
        )}
      </Column>

      {/* Right Column */}
      <Column>
        <CommitHistoryCard
          commits={commitHistory}
          showDiff={showDiff}
          diffHeaders={currentDiff}
          commitInfo={commitInfo}
          ignoreWhitespace={ignoreWhitespace}
          onToggleView={handleToggleDiffView}
          onClickCommit={handleClickCommit}
          onCherryPick={handleCherryPick}
          onCheckout={handleCheckoutCommit}
          onLoadMore={handleLoadMoreCommits}
          onIgnoreWhitespaceChange={setIgnoreWhitespace}
          onRevert={handleRevertCommit}
          onCreateBranchFromCommit={handleCreateBranchFromCommit}
          onCopyHash={handleCopyHash}
          onResetToCommit={handleResetToCommit}
          onHunkChange={handleHunkChange}
          onHunkChangeError={handleHunkChangeError}
        />
      </Column>

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
        hasUncommittedChanges={(stagedChanges.length || 0) + (unstagedChanges.length || 0) > 0}
        onMerge={handleMerge}
        onCancel={noop}
      />
    </RepoViewContainer>
  );
};

export default RepoView;
