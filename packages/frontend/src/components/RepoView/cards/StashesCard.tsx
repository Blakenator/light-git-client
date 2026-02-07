import React, { useState, useMemo, useCallback } from 'react';
import { Badge, Button, ButtonGroup, Tooltip } from 'react-bootstrap';
import { LayoutCard } from '../../LayoutCard/LayoutCard';
import { Icon, TooltipTrigger } from '@light-git/core';
import { CardHeaderContent, CardFilterInput, CardHeaderButtons } from '../RepoView.styles';
import { InputModal } from '../../../common/components/InputModal/InputModal';
import { useRepositoryStore } from '../../../stores';
import { useStashActions } from '../hooks';
import type { StashModel } from '@light-git/shared';
import styled from 'styled-components';

interface StashesCardProps {
  repoPath: string;
}

export const StashesCard: React.FC<StashesCardProps> = React.memo(({ repoPath }) => {
  const [filter, setFilter] = useState('');

  const repoCache = useRepositoryStore((state) => state.getCacheFor(repoPath));
  const stashes = useMemo(() => (repoCache?.stashes || []) as StashModel[], [repoCache?.stashes]);
  const localBranches = useMemo(() => repoCache?.localBranches || [], [repoCache?.localBranches]);
  const currentBranch = useMemo(
    () => localBranches.find((b: any) => b.isCurrentBranch) || null,
    [localBranches],
  );

  const {
    stashOnlyUnstaged,
    handleStash,
    handleStashWithName,
    handleApplyStash,
    handleDeleteStash,
    handleViewStash,
    handleShowRestoreStash,
  } = useStashActions(repoPath);

  const filteredStashes = useMemo(() => {
    if (!filter) return stashes;
    const lowerFilter = filter.toLowerCase();
    return stashes.filter((s) =>
      s.message?.toLowerCase().includes(lowerFilter) ||
      s.branchName?.toLowerCase().includes(lowerFilter)
    );
  }, [stashes, filter]);

  const handleStashOk = useCallback((name: string) => handleStashWithName(name), [handleStashWithName]);

  const headerContent = (
    <CardHeaderContent>
      <CardFilterInput
        placeholder="Filter..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        onClick={(e) => e.stopPropagation()}
      />
      <CardHeaderButtons>
        <ButtonGroup size="sm">
          <TooltipTrigger
            placement="top"
            overlay={<Tooltip id="tooltip-stash-all">Stash All Changes</Tooltip>}
          >
            <Button
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                handleStash(false);
              }}
            >
              <Icon name="fa-boxes" />
            </Button>
          </TooltipTrigger>
          <TooltipTrigger
            placement="top"
            overlay={<Tooltip id="tooltip-stash-unstaged">Stash Unstaged Changes Only</Tooltip>}
          >
            <Button
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                handleStash(true);
              }}
            >
              <Icon name="fa-box" />
            </Button>
          </TooltipTrigger>
        </ButtonGroup>
        <TooltipTrigger
          placement="top"
          overlay={<Tooltip id="tooltip-restore-stash">Restore deleted stash</Tooltip>}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleShowRestoreStash();
            }}
          >
            <Icon name="fa-history" />
          </Button>
        </TooltipTrigger>
      </CardHeaderButtons>
    </CardHeaderContent>
  );

  return (
    <>
      <LayoutCard
        title="Stashes"
        iconClass="fa fa-box"
        expandKey="stashes"
        headerContent={headerContent}
      >
        <div className="card-body">
          {filteredStashes.map((stash, index) => (
            <StashItem
              key={`${stash.hash}-${index}`}
              stash={stash}
              onApply={handleApplyStash}
              onDelete={handleDeleteStash}
              onView={handleViewStash}
            />
          ))}
          {filteredStashes.length === 0 && (
            <div className="text-muted text-center py-2">No stashes found</div>
          )}
        </div>
      </LayoutCard>

      <InputModal
        modalId="createStash"
        title={`Stash ${stashOnlyUnstaged ? 'Unstaged' : 'All'} Changes`}
        message="Please enter a name for the stash"
        placeholder="Stash name..."
        defaultValue={(currentBranch as any)?.lastCommitText ?? ''}
        validPattern='^[^"]*$'
        invalidMessage="Stash name cannot include double quotes"
        onOk={handleStashOk}
      />
    </>
  );
});

const StashRow = styled.div`
  padding: 0.25em 0.3em;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:nth-child(even) {
    background-color: rgba(128, 128, 128, 0.1);
  }
`;

const StashMessage = styled.div`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const BranchIcon = styled.span`
  color: ${({ theme }) => theme.colors.info};
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
`;

interface StashItemProps {
  stash: StashModel;
  onApply: (stash: StashModel) => void;
  onDelete: (stash: StashModel) => void;
  onView: (stash: StashModel) => void;
}

const StashItem: React.FC<StashItemProps> = ({
  stash,
  onApply,
  onDelete,
  onView,
}) => {
  return (
    <StashRow>
      <Badge bg="info">{stash.index}</Badge>
      <StashMessage>
        {stash.message || `stash@{${stash.index}}`}
      </StashMessage>
      {stash.branchName && (
        <TooltipTrigger
          placement="top"
          overlay={<Tooltip id={`tooltip-stash-branch-${stash.hash}`}>{stash.branchName}</Tooltip>}
        >
          <BranchIcon>
            <Icon name="fa-code-branch" size="sm" />
          </BranchIcon>
        </TooltipTrigger>
      )}
      <div className="d-inline-block flex-shrink-0">
        <ButtonGroup size="sm">
          <TooltipTrigger
            placement="top"
            overlay={<Tooltip id={`tooltip-view-stash-${stash.hash}`}>View Stash Diff</Tooltip>}
          >
            <Button
              variant="outline-warning"
              size="sm"
              onClick={() => onView(stash)}
            >
              <Icon name="fa-eye" size="sm" />
            </Button>
          </TooltipTrigger>
          <TooltipTrigger
            placement="top"
            overlay={<Tooltip id={`tooltip-apply-stash-${stash.hash}`}>Apply Stash</Tooltip>}
          >
            <Button
              variant="outline-light"
              size="sm"
              onClick={() => onApply(stash)}
            >
              <Icon name="fa-box-open" size="sm" />
            </Button>
          </TooltipTrigger>
          <TooltipTrigger
            placement="top"
            overlay={<Tooltip id={`tooltip-delete-stash-${stash.hash}`}>Delete Stash</Tooltip>}
          >
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => onDelete(stash)}
            >
              <Icon name="fa-trash" size="sm" />
            </Button>
          </TooltipTrigger>
        </ButtonGroup>
      </div>
    </StashRow>
  );
};

StashesCard.displayName = 'StashesCard';

export default StashesCard;
