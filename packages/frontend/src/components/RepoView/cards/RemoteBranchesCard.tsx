import React, { useState, useCallback } from 'react';
import { Button, Tooltip } from 'react-bootstrap';
import { TooltipTrigger } from '@light-git/core';
import { LayoutCard } from '../../LayoutCard/LayoutCard';
import { Icon } from '@light-git/core';
import { CardHeaderContent, CardFilterInput, CardHeaderButtons } from '../RepoView.styles';
import { BranchTreeItem } from '../../BranchTreeItem/BranchTreeItem';
import type { BranchModel } from '@light-git/shared';

interface RemoteBranchesCardProps {
  branches: BranchModel[];
  localBranches?: BranchModel[];
  onCheckout: (branch: BranchModel) => void;
  onDelete: (branch: BranchModel) => void;
  onFetch?: () => void;
  onMerge?: (branch: BranchModel) => void;
  onViewChanges?: (branch: BranchModel) => void;
}

export const RemoteBranchesCard: React.FC<RemoteBranchesCardProps> = React.memo(({
  branches,
  localBranches = [],
  onCheckout,
  onDelete,
  onFetch,
  onMerge,
  onViewChanges,
}) => {
  const [filter, setFilter] = useState('');

  const handleCheckout = useCallback(
    (info: { branch: string; andPull: boolean }) => {
      const branch = branches.find((b) => b.name === info.branch);
      if (branch) {
        onCheckout(branch);
      }
    },
    [branches, onCheckout]
  );

  const handleCopyBranchName = useCallback((branch: any) => {
    // Copy already handled in BranchTreeItem
  }, []);

  const headerContent = (
    <CardHeaderContent>
      <CardFilterInput
        placeholder="Filter..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <CardHeaderButtons>
        {onFetch && (
          <TooltipTrigger
            placement="top"
            overlay={<Tooltip id="tooltip-fetch-remotes">Fetch all remotes</Tooltip>}
          >
            <Button
              variant="info"
              size="sm"
              onClick={() => onFetch()}
            >
              <Icon name="fa-sync" />
            </Button>
          </TooltipTrigger>
        )}
      </CardHeaderButtons>
    </CardHeaderContent>
  );

  return (
    <LayoutCard
      title="Remotes"
      iconClass="fa fa-cloud"
      expandKey="remotes"
      headerContent={headerContent}
    >
      <div className="px-2">
        <BranchTreeItem
          branches={branches as any}
          isLocal={false}
          filter={filter}
          localBranches={localBranches as any}
          onCheckoutClicked={handleCheckout}
          onDeleteClicked={(branch) => onDelete(branch as any)}
          onMergeClicked={onMerge ? (branch) => onMerge(branch as any) : undefined}
          onCopyBranchName={handleCopyBranchName}
          onViewChanges={onViewChanges ? (branch) => onViewChanges(branch as any) : undefined}
        />
        {branches.length === 0 && (
          <div className="text-muted text-center py-2">No remote branches found</div>
        )}
      </div>
    </LayoutCard>
  );
});

RemoteBranchesCard.displayName = 'RemoteBranchesCard';

export default RemoteBranchesCard;
