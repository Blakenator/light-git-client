import React, { useState, useMemo, useCallback } from 'react';
import { Button, ButtonGroup, Dropdown, Tooltip } from 'react-bootstrap';
import { LayoutCard } from '../../LayoutCard/LayoutCard';
import { Icon, TooltipTrigger } from '@light-git/core';
import { CardHeaderContent, CardFilterInput, CardHeaderButtons } from '../RepoView.styles';
import { BranchTreeItem } from '../../BranchTreeItem/BranchTreeItem';
import type { BranchModel } from '@light-git/shared';

interface LocalBranchesCardProps {
  branches: BranchModel[];
  worktrees?: any[];
  showTrackingPath?: boolean;
  onCheckout: (branch: BranchModel, andPull: boolean) => void;
  onCreateBranch: () => void;
  onMerge: (branch?: BranchModel) => void;
  onRebase?: (branch: BranchModel) => void;
  onInteractiveRebase?: (branch: BranchModel) => void;
  onPrune: () => void;
  onPush: (branch: BranchModel, force: boolean) => void;
  onPull: (branch: BranchModel | null, force: boolean) => void;
  onDelete: (branch: BranchModel) => void;
  onRename: (branch: BranchModel) => void;
  onFastForward?: (branch: BranchModel) => void;
  onViewChanges?: (branch: BranchModel) => void;
}

export const LocalBranchesCard: React.FC<LocalBranchesCardProps> = React.memo(({
  branches,
  worktrees,
  showTrackingPath = false,
  onCheckout,
  onCreateBranch,
  onMerge,
  onRebase,
  onInteractiveRebase,
  onPrune,
  onPush,
  onPull,
  onDelete,
  onRename,
  onFastForward,
  onViewChanges,
}) => {
  const [filter, setFilter] = useState('');

  const currentBranch = useMemo(
    () => branches.find((b) => b.isCurrentBranch),
    [branches]
  );

  const handleCheckout = useCallback(
    (info: { branch: string; andPull: boolean }) => {
      const branch = branches.find((b) => b.name === info.branch);
      if (branch) {
        onCheckout(branch, info.andPull);
      }
    },
    [branches, onCheckout]
  );

  const handleCopyBranchName = useCallback((branch: any) => {
    // Just copy to clipboard - the BranchTreeItem already does this
  }, []);

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
            onClick={() => onCreateBranch()}
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
            onClick={() => onPrune()}
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
              onClick={() => onMerge()}
            >
              <Icon name="merge_type" />
            </Button>
          </TooltipTrigger>
          <Dropdown.Toggle split variant="success" />
          <Dropdown.Menu popperConfig={{ strategy: 'fixed' }} renderOnMount>
            <Dropdown.Item onClick={() => {
              if (onRebase && currentBranch) {
                onRebase(currentBranch);
              } else {
                onMerge();
              }
            }}>
              Rebase
            </Dropdown.Item>
            <Dropdown.Item onClick={() => {
              if (onInteractiveRebase && currentBranch) {
                onInteractiveRebase(currentBranch);
              } else {
                onMerge();
              }
            }}>
              Interactive Rebase
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
        {currentBranch && (
          <Dropdown as={ButtonGroup} size="sm">
            <TooltipTrigger
              placement="top"
              overlay={<Tooltip id="tooltip-pull-local">Pull</Tooltip>}
            >
              <Button
                variant="info"
                onClick={() => onPull(currentBranch, false)}
              >
                <Icon name="fa-arrow-down" />
              </Button>
            </TooltipTrigger>
            <Dropdown.Toggle split variant="info" />
            <Dropdown.Menu popperConfig={{ strategy: 'fixed' }} renderOnMount>
              <Dropdown.Item onClick={() => onPull(currentBranch, true)}>
                <Icon name="fa-shield-alt" /> Force Pull
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        )}
        {currentBranch && (
          <Dropdown as={ButtonGroup} size="sm">
            <TooltipTrigger
              placement="top"
              overlay={<Tooltip id="tooltip-push-local">Push current branch</Tooltip>}
            >
              <Button
                variant="info"
                onClick={() => onPush(currentBranch, false)}
              >
                <Icon name="fa-arrow-up" />
              </Button>
            </TooltipTrigger>
            <Dropdown.Toggle split variant="info" />
            <Dropdown.Menu popperConfig={{ strategy: 'fixed' }} renderOnMount>
              <Dropdown.Item onClick={() => onPush(currentBranch, true)}>
                <Icon name="fa-shield-alt" /> Force Push
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        )}
      </CardHeaderButtons>
    </CardHeaderContent>
  );

  return (
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
          showTrackingPath={showTrackingPath}
          worktrees={worktrees}
          onCheckoutClicked={handleCheckout}
          onPushClicked={(branch, force) => onPush(branch as any, force)}
          onPullClicked={(branch, force) => onPull(branch as any, force)}
          onDeleteClicked={(branch) => onDelete(branch as any)}
          onMergeClicked={(branch) => onMerge(branch as any)}
          onRebaseClicked={onRebase ? (branch) => onRebase(branch as any) : undefined}
          onInteractiveRebaseClicked={onInteractiveRebase ? (branch) => onInteractiveRebase(branch as any) : undefined}
          onFastForwardClicked={(branch) => onFastForward?.(branch as any)}
          onBranchRename={(branch) => onRename(branch as any)}
          onCopyBranchName={handleCopyBranchName}
          onViewChanges={onViewChanges ? (branch) => onViewChanges(branch as any) : undefined}
        />
        {branches.length === 0 && (
          <div className="text-muted text-center py-2">No local branches found</div>
        )}
      </div>
    </LayoutCard>
  );
});

LocalBranchesCard.displayName = 'LocalBranchesCard';

export default LocalBranchesCard;
