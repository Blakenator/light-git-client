import React, { useState, useCallback } from 'react';
import { Button } from 'react-bootstrap';
import { LayoutCard } from '../../LayoutCard/LayoutCard';
import { Icon } from '@light-git/core';
import { CardHeaderContent, CardFilterInput, CardHeaderButtons } from '../RepoView.styles';
import { BranchTreeItem } from '../../BranchTreeItem/BranchTreeItem';
import type { BranchModel } from '@light-git/shared';

interface RemoteBranchesCardProps {
  branches: BranchModel[];
  onCheckout: (branch: BranchModel) => void;
  onDelete: (branch: BranchModel) => void;
  onFetch?: () => void;
  onMerge?: (branch: BranchModel) => void;
  onViewChanges?: (branch: BranchModel) => void;
}

export const RemoteBranchesCard: React.FC<RemoteBranchesCardProps> = React.memo(({
  branches,
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
        onClick={(e) => e.stopPropagation()}
      />
      <CardHeaderButtons>
        {onFetch && (
          <Button
            variant="info"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onFetch();
            }}
            title="Fetch all remotes"
          >
            <Icon name="fa-sync" />
          </Button>
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
