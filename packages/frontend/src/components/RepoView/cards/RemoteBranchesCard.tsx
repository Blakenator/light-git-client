import React, { useState, useCallback } from 'react';
import { Button, Tooltip } from 'react-bootstrap';
import { TooltipTrigger } from '@light-git/core';
import { LayoutCard } from '../../LayoutCard/LayoutCard';
import { Icon } from '@light-git/core';
import { CardHeaderContent, CardFilterInput, CardHeaderButtons } from '../RepoView.styles';
import { BranchTreeItem } from '../../BranchTreeItem/BranchTreeItem';
import { useRepositoryStore } from '../../../stores';
import { useBranchActions } from '../hooks';

const _EMPTY_ARR: any[] = [];

interface RemoteBranchesCardProps {
  repoPath: string;
}

export const RemoteBranchesCard: React.FC<RemoteBranchesCardProps> = React.memo(({
  repoPath,
}) => {
  const [filter, setFilter] = useState('');

  const branches = useRepositoryStore((state) => state.repoCache[repoPath]?.remoteBranches) ?? _EMPTY_ARR;
  const localBranches = useRepositoryStore((state) => state.repoCache[repoPath]?.localBranches) ?? _EMPTY_ARR;

  const { handleRemoteCheckout, handleDeleteBranch } = useBranchActions(repoPath);

  const handleCheckout = useCallback(
    (info: { branch: string; andPull: boolean }) => {
      const branch = branches.find((b: any) => b.name === info.branch);
      if (branch) {
        handleRemoteCheckout(branch);
      }
    },
    [branches, handleRemoteCheckout]
  );

  const handleCopyBranchName = useCallback((branch: any) => {}, []);

  const headerContent = (
    <CardHeaderContent>
      <CardFilterInput
        placeholder="Filter..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <CardHeaderButtons />
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
          onDeleteClicked={(branch) => handleDeleteBranch(branch as any)}
          onCopyBranchName={handleCopyBranchName}
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
