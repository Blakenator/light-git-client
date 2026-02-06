import React, { useState, useMemo, useCallback } from 'react';
import { Button, ButtonGroup, Dropdown } from 'react-bootstrap';
import { LayoutCard } from '../../LayoutCard/LayoutCard';
import { Icon } from '@light-git/core';
import { CardHeaderContent, CardFilterInput, CardHeaderButtons } from '../RepoView.styles';
import { BranchTreeItem } from '../../BranchTreeItem/BranchTreeItem';
import type { BranchModel } from '@light-git/shared';

interface LocalBranchesCardProps {
  branches: BranchModel[];
  showTrackingPath?: boolean;
  onCheckout: (branch: BranchModel, andPull: boolean) => void;
  onCreateBranch: () => void;
  onMerge: (branch?: BranchModel) => void;
  onPrune: () => void;
  onPush: (branch: BranchModel, force: boolean) => void;
  onPull: (branch: BranchModel | null, force: boolean) => void;
  onDelete: (branch: BranchModel) => void;
  onRename: (branch: BranchModel) => void;
  onFastForward?: (branch: BranchModel) => void;
  onRebase?: (branch: BranchModel) => void;
  onViewChanges?: (branch: BranchModel) => void;
}

export const LocalBranchesCard: React.FC<LocalBranchesCardProps> = React.memo(({
  branches,
  showTrackingPath = false,
  onCheckout,
  onCreateBranch,
  onMerge,
  onPrune,
  onPush,
  onPull,
  onDelete,
  onRename,
  onFastForward,
  onRebase,
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
        onClick={(e) => e.stopPropagation()}
      />
      <CardHeaderButtons>
        <Button
          variant="primary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onCreateBranch();
          }}
          title="Create branch off current HEAD"
        >
          <Icon name="fa-plus" />
        </Button>
        <Button
          variant="warning"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onPrune();
          }}
          title="Prune local branches"
        >
          <Icon name="fa-cut" />
        </Button>
        <ButtonGroup size="sm">
          <Button
            variant="success"
            onClick={(e) => {
              e.stopPropagation();
              onMerge();
            }}
            title="Merge branches"
          >
            <Icon name="merge_type" />
          </Button>
        </ButtonGroup>
        {currentBranch && (
          <Dropdown as={ButtonGroup} size="sm">
            <Button
              variant="info"
              onClick={(e) => {
                e.stopPropagation();
                onPull(currentBranch, false);
              }}
              title="Pull"
            >
              <Icon name="fa-download" />
            </Button>
            <Dropdown.Toggle split variant="info" onClick={(e) => e.stopPropagation()} />
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => onPull(currentBranch, true)}>
                Force Pull
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        )}
        {currentBranch && (
          <Dropdown as={ButtonGroup} size="sm">
            <Button
              variant="info"
              onClick={(e) => {
                e.stopPropagation();
                onPush(currentBranch, false);
              }}
              title="Push current branch"
            >
              <Icon name="fa-upload" />
            </Button>
            <Dropdown.Toggle split variant="info" onClick={(e) => e.stopPropagation()} />
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => onPush(currentBranch, true)}>
                Force Push
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
          onCheckoutClicked={handleCheckout}
          onPushClicked={(branch, force) => onPush(branch as any, force)}
          onPullClicked={(branch, force) => onPull(branch as any, force)}
          onDeleteClicked={(branch) => onDelete(branch as any)}
          onMergeClicked={(branch) => onMerge(branch as any)}
          onRebaseClicked={(branch) => onRebase?.(branch as any)}
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
