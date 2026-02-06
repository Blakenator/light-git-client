import React, { useState, useMemo } from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import { LayoutCard } from '../../LayoutCard/LayoutCard';
import { Icon } from '@light-git/core';
import { CardHeaderContent, CardFilterInput, CardHeaderButtons } from '../RepoView.styles';
import type { WorktreeModel } from '@light-git/shared';

interface WorktreesCardProps {
  worktrees: WorktreeModel[];
  onAddWorktree: () => void;
  onOpenFolder: (path: string) => void;
  onOpenNewTab: (path: string) => void;
  onSwitch: (path: string) => void;
  onDelete: (worktree: WorktreeModel) => void;
}

export const WorktreesCard: React.FC<WorktreesCardProps> = React.memo(({
  worktrees,
  onAddWorktree,
  onOpenFolder,
  onOpenNewTab,
  onSwitch,
  onDelete,
}) => {
  const [filter, setFilter] = useState('');

  const filteredWorktrees = useMemo(() => {
    if (!filter) return worktrees;
    const lowerFilter = filter.toLowerCase();
    return worktrees.filter((w) => w.name?.toLowerCase().includes(lowerFilter));
  }, [worktrees, filter]);

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
            onAddWorktree();
          }}
          title="Add Worktree"
        >
          <Icon name="fa-plus" />
        </Button>
      </CardHeaderButtons>
    </CardHeaderContent>
  );

  return (
    <LayoutCard
      title="Worktrees"
      iconClass="fa fa-copy"
      expandKey="worktrees"
      headerContent={headerContent}
    >
      <div className="card-body">
        {filteredWorktrees.map((worktree) => (
          <WorktreeItem
            key={worktree.path}
            worktree={worktree}
            onOpenFolder={onOpenFolder}
            onOpenNewTab={onOpenNewTab}
            onSwitch={onSwitch}
            onDelete={onDelete}
          />
        ))}
        {filteredWorktrees.length === 0 && (
          <div className="text-muted text-center py-2">No worktrees found</div>
        )}
      </div>
    </LayoutCard>
  );
});

interface WorktreeItemProps {
  worktree: WorktreeModel;
  onOpenFolder: (path: string) => void;
  onOpenNewTab: (path: string) => void;
  onSwitch: (path: string) => void;
  onDelete: (worktree: WorktreeModel) => void;
}

const WorktreeItem: React.FC<WorktreeItemProps> = ({
  worktree,
  onOpenFolder,
  onOpenNewTab,
  onSwitch,
  onDelete,
}) => {
  const isBare = worktree.currentHash === 'bare';
  const isCurrent = worktree.isCurrent;

  return (
    <div className="d-flex align-items-center py-1">
      <span
        className={`flex-grow-1 ${isCurrent ? 'fw-bold' : ''}`}
        title={worktree.path}
      >
        {worktree.name}
        {worktree.currentBranch === 'detached' && (
          <small className="text-muted ms-1">(detached)</small>
        )}
      </span>
      <ButtonGroup size="sm" className="ms-2">
        <Button
          variant="info"
          size="sm"
          onClick={() => onOpenFolder(worktree.path)}
          title="Open folder"
        >
          <Icon name="fa-folder-open" size="sm" />
        </Button>
        {!isBare && !isCurrent && (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onOpenNewTab(worktree.path)}
              title="Open in new tab"
            >
              <Icon name="fa-external-link-square-alt" size="sm" />
            </Button>
            <Button
              variant="light"
              size="sm"
              onClick={() => onSwitch(worktree.path)}
              title="Switch to this worktree"
            >
              <Icon name="fa-exchange-alt" size="sm" />
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(worktree)}
              title="Delete worktree"
            >
              <Icon name="fa-trash" size="sm" />
            </Button>
          </>
        )}
      </ButtonGroup>
    </div>
  );
};

WorktreesCard.displayName = 'WorktreesCard';

export default WorktreesCard;
