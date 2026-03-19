import React, { useState, useMemo, useCallback } from 'react';
import { Button, ButtonGroup, Dropdown, Tooltip } from 'react-bootstrap';
import { LayoutCard } from '../../LayoutCard/LayoutCard';
import { Icon, TooltipTrigger } from '@light-git/core';
import { CardHeaderContent, CardFilterInput, CardHeaderButtons } from '../RepoView.styles';
import { BranchTreeItem } from '../../BranchTreeItem/BranchTreeItem';
import { ConfirmModal } from '../../../common/components/ConfirmModal/ConfirmModal';
import { InputModal } from '../../../common/components/InputModal/InputModal';
import { PruneBranchDialog, MergeBranchDialog, CreateBranchDialog, ChangeRemoteDialog } from '../dialogs';
import { useRepositoryStore, useSettingsStore } from '../../../stores';
import { useBranchActions } from '../hooks';
import type { BranchModel } from '@light-git/shared';

const _EMPTY_ARR: any[] = [];

interface LocalBranchesCardProps {
  repoPath: string;
}

export const LocalBranchesCard: React.FC<LocalBranchesCardProps> = React.memo(({
  repoPath,
}) => {
  const [filter, setFilter] = useState('');

  const branches = (useRepositoryStore((state) => state.repoCache[repoPath]?.localBranches) ?? _EMPTY_ARR) as BranchModel[];
  const remoteBranches = (useRepositoryStore((state) => state.repoCache[repoPath]?.remoteBranches) ?? _EMPTY_ARR) as BranchModel[];
  const worktrees = useRepositoryStore((state) => state.repoCache[repoPath]?.worktrees) ?? _EMPTY_ARR;
  const stagedChanges = useRepositoryStore((state) => state.repoCache[repoPath]?.changes?.stagedChanges) ?? _EMPTY_ARR;
  const unstagedChanges = useRepositoryStore((state) => state.repoCache[repoPath]?.changes?.unstagedChanges) ?? _EMPTY_ARR;
  const branchNamePrefix = useSettingsStore((state) => state.settings.branchNamePrefix);
  const pushLockedBranches = useSettingsStore((state) => state.settings.pushLockBranches?.[repoPath] ?? []);
  const togglePushLockBranch = useSettingsStore((state) => state.togglePushLockBranch);

  const {
    activeMergeInfo,
    branchToDelete,
    branchToRename,
    handleCheckout,
    handlePush,
    handlePull,
    handleMerge,
    handleRebase,
    handleInteractiveRebase,
    handleMergeBranchSubmit,
    handleCreateBranch,
    handlePruneBranches,
    handleConfirmPruneBranches,
    handleDeleteBranch,
    handleConfirmDeleteBranch,
    handleRenameBranch,
    handleRenameBranchSubmit,
    handleCreateBranchSubmit,
    handleFastForward,
    handleBranchPremerge,
    handleChangeRemote,
    handleChangeRemoteSubmit,
    handleMatchNameUpstream,
    handleUnsetUpstream,
    changeRemoteBranch,
  } = useBranchActions(repoPath);

  const currentBranch = useMemo(
    () => branches.find((b) => b.isCurrentBranch),
    [branches]
  );

  const handleCheckoutFromTree = useCallback(
    (info: { branch: string; andPull: boolean }) => {
      const branch = branches.find((b) => b.name === info.branch);
      if (branch) {
        handleCheckout(branch, info.andPull);
      }
    },
    [branches, handleCheckout]
  );

  const handleTogglePushLock = useCallback((branch: any) => {
    if (!branch.trackingPath) return;
    togglePushLockBranch(repoPath, branch.trackingPath);
  }, [repoPath, togglePushLockBranch]);

  const handleCopyBranchName = useCallback((branch: any) => {}, []);
  const noop = useCallback(() => {}, []);

  const headerContent = (
    <CardHeaderContent>
      <CardFilterInput
        placeholder="Filter..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <CardHeaderButtons>
        <TooltipTrigger
          placement="top"
          overlay={<Tooltip id="tooltip-create-branch">Create branch off current HEAD</Tooltip>}
        >
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleCreateBranch()}
          >
            <Icon name="fa-code-branch" />
          </Button>
        </TooltipTrigger>
        <TooltipTrigger
          placement="top"
          overlay={<Tooltip id="tooltip-prune-branches">Prune local branches</Tooltip>}
        >
          <Button
            variant="warning"
            size="sm"
            onClick={() => handlePruneBranches()}
          >
            <Icon name="fa-cut" />
          </Button>
        </TooltipTrigger>
        <Dropdown as={ButtonGroup} size="sm">
          <TooltipTrigger
            placement="top"
            overlay={<Tooltip id="tooltip-merge-branches">Merge branches</Tooltip>}
          >
            <Button
              variant="success"
              onClick={() => handleMerge()}
            >
              <Icon name="merge_type" />
            </Button>
          </TooltipTrigger>
          <Dropdown.Toggle split variant="success" />
          <Dropdown.Menu popperConfig={{ strategy: 'fixed' }} renderOnMount>
            <Dropdown.Item onClick={() => {
              if (currentBranch) {
                handleRebase(currentBranch);
              } else {
                handleMerge();
              }
            }}>
              Rebase
            </Dropdown.Item>
            <Dropdown.Item onClick={() => {
              if (currentBranch) {
                handleInteractiveRebase(currentBranch);
              } else {
                handleMerge();
              }
            }}>
              Interactive Rebase
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </CardHeaderButtons>
    </CardHeaderContent>
  );

  return (
    <>
      <LayoutCard
        title="Locals"
        iconClass="fa fa-code-branch"
        expandKey="locals"
        headerContent={headerContent}
      >
        <div className="px-2">
          <BranchTreeItem
            branches={branches as any}
            isLocal={true}
            filter={filter}
            showTrackingPath={true}
            worktrees={worktrees}
            onCheckoutClicked={handleCheckoutFromTree}
            onPushClicked={(branch, force) => handlePush(branch as any, force)}
            onPullClicked={(branch, force) => handlePull(branch as any, force)}
            onDeleteClicked={(branch) => handleDeleteBranch(branch as any)}
            onMergeClicked={(branch) => handleMerge(branch as any)}
            onRebaseClicked={(branch) => handleRebase(branch as any)}
            onInteractiveRebaseClicked={(branch) => handleInteractiveRebase(branch as any)}
            onFastForwardClicked={(branch) => handleFastForward(branch as any)}
            onBranchRename={(branch) => handleRenameBranch(branch as any)}
            onCopyBranchName={handleCopyBranchName}
            onViewChanges={(branch) => handleBranchPremerge(branch as any)}
            pushLockedBranches={pushLockedBranches}
            onTogglePushLock={handleTogglePushLock}
            onChangeRemote={(branch) => handleChangeRemote(branch as any)}
          />
          {branches.length === 0 && (
            <div className="text-muted text-center py-2">No local branches found</div>
          )}
        </div>
      </LayoutCard>

      {/* Branch-related modals */}
      <CreateBranchDialog
        localBranches={branches}
        branchNamePrefix={branchNamePrefix}
        onSubmit={handleCreateBranchSubmit}
      />

      <PruneBranchDialog
        localBranches={branches}
        onConfirm={handleConfirmPruneBranches}
      />

      <MergeBranchDialog
        localBranches={branches}
        remoteBranches={remoteBranches}
        activeMergeInfo={activeMergeInfo}
        hasUncommittedChanges={(stagedChanges.length || 0) + (unstagedChanges.length || 0) > 0}
        onMerge={handleMergeBranchSubmit}
        onCancel={noop}
      />

      <ChangeRemoteDialog
        remoteBranches={remoteBranches}
        targetBranch={changeRemoteBranch}
        onSubmit={handleChangeRemoteSubmit}
        onMatchName={handleMatchNameUpstream}
        onUnset={handleUnsetUpstream}
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
        defaultValue={branchToRename?.name || ''}
        validPattern="[a-zA-Z0-9/._-]*[a-zA-Z0-9._-]"
        invalidMessage="Please enter a valid branch name"
        replaceChars={{ '\\s': '-' }}
        onOk={handleRenameBranchSubmit}
      />
    </>
  );
});

LocalBranchesCard.displayName = 'LocalBranchesCard';

export default LocalBranchesCard;
