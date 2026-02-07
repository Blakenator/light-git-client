import React, { useState, useMemo } from 'react';
import { Badge, Button, ButtonGroup, Tooltip } from 'react-bootstrap';
import { LayoutCard } from '../../LayoutCard/LayoutCard';
import { Icon, TooltipTrigger } from '@light-git/core';
import { CardHeaderContent, CardFilterInput, CardHeaderButtons } from '../RepoView.styles';
import type { StashModel } from '@light-git/shared';
import styled from 'styled-components';

interface StashesCardProps {
  stashes: StashModel[];
  onStash: (unstagedOnly: boolean) => void;
  onApplyStash: (stash: StashModel) => void;
  onDeleteStash: (stash: StashModel) => void;
  onViewStash: (stash: StashModel) => void;
  onRestoreStash: () => void;
}

export const StashesCard: React.FC<StashesCardProps> = React.memo(({
  stashes,
  onStash,
  onApplyStash,
  onDeleteStash,
  onViewStash,
  onRestoreStash,
}) => {
  const [filter, setFilter] = useState('');

  const filteredStashes = useMemo(() => {
    if (!filter) return stashes;
    const lowerFilter = filter.toLowerCase();
    return stashes.filter((s) =>
      s.message?.toLowerCase().includes(lowerFilter) ||
      s.branchName?.toLowerCase().includes(lowerFilter)
    );
  }, [stashes, filter]);

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
                onStash(false);
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
                onStash(true);
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
              onRestoreStash();
            }}
          >
            <Icon name="fa-history" />
          </Button>
        </TooltipTrigger>
      </CardHeaderButtons>
    </CardHeaderContent>
  );

  return (
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
            onApply={onApplyStash}
            onDelete={onDeleteStash}
            onView={onViewStash}
          />
        ))}
        {filteredStashes.length === 0 && (
          <div className="text-muted text-center py-2">No stashes found</div>
        )}
      </div>
    </LayoutCard>
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

const BranchBadge = styled(Badge)`
  min-width: 3em;
  flex-shrink: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
          <BranchBadge bg="primary">{stash.branchName}</BranchBadge>
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
