import React, { useState, useMemo } from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import { LayoutCard } from '../../LayoutCard/LayoutCard';
import { Icon } from '@light-git/core';
import { CardHeaderContent, CardFilterInput, CardHeaderButtons } from '../RepoView.styles';
import type { StashModel } from '@light-git/shared';

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
    return stashes.filter((s) => s.message?.toLowerCase().includes(lowerFilter));
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
          <Button
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onStash(false);
            }}
            title="Stash All Changes"
          >
            <Icon name="fa-boxes" />
          </Button>
          <Button
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onStash(true);
            }}
            title="Stash Unstaged Changes Only"
          >
            <Icon name="fa-box" />
          </Button>
        </ButtonGroup>
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onRestoreStash();
          }}
          title="Restore deleted stash"
        >
          <Icon name="fa-history" />
        </Button>
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
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="d-flex align-items-center py-1 px-2 rounded"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <span className="flex-grow-1 text-truncate" title={stash.message}>
        {stash.message || `stash@{${stash.index}}`}
      </span>
      {showActions && (
        <ButtonGroup size="sm">
          <Button
            variant="outline-success"
            size="sm"
            onClick={() => onApply(stash)}
            title="Apply stash"
          >
            <Icon name="fa-download" size="sm" />
          </Button>
          <Button
            variant="outline-info"
            size="sm"
            onClick={() => onView(stash)}
            title="View stash"
          >
            <Icon name="fa-eye" size="sm" />
          </Button>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => onDelete(stash)}
            title="Delete stash"
          >
            <Icon name="fa-trash" size="sm" />
          </Button>
        </ButtonGroup>
      )}
    </div>
  );
};

StashesCard.displayName = 'StashesCard';

export default StashesCard;
