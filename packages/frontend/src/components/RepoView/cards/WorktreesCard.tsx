import React, { useState, useMemo, useCallback } from 'react';
import { Button, ButtonGroup, Tooltip } from 'react-bootstrap';
import { LayoutCard } from '../../LayoutCard/LayoutCard';
import { Icon, TooltipTrigger } from '@light-git/core';
import { CardHeaderContent, CardFilterInput, CardHeaderButtons } from '../RepoView.styles';
import { useRepositoryStore, useUiStore } from '../../../stores';
import { useIpc, useGitService } from '../../../ipc';
import { Channels } from '@light-git/shared';
import type { WorktreeModel } from '@light-git/shared';

interface WorktreesCardProps {
  repoPath: string;
  onOpenRepoNewTab?: (path: string) => void;
}

export const WorktreesCard: React.FC<WorktreesCardProps> = React.memo(({
  repoPath,
  onOpenRepoNewTab,
}) => {
  const [filter, setFilter] = useState('');
  const ipc = useIpc();
  const gitService = useGitService(repoPath);
  const addAlert = useUiStore((state) => state.addAlert);
  const showModal = useUiStore((state) => state.showModal);

  const repoCache = useRepositoryStore((state) => state.getCacheFor(repoPath));
  const worktrees = useMemo(() => (repoCache?.worktrees || []) as WorktreeModel[], [repoCache?.worktrees]);

  const filteredWorktrees = useMemo(() => {
    if (!filter) return worktrees;
    const lowerFilter = filter.toLowerCase();
    return worktrees.filter((w) => w.name?.toLowerCase().includes(lowerFilter));
  }, [worktrees, filter]);

  const handleAddWorktree = useCallback(() => showModal('addWorktree'), [showModal]);

  const handleOpenFolder = useCallback(async (path: string) => {
    try {
      await gitService.openFolder(path);
    } catch (error: any) {
      addAlert(`Failed to open folder: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const handleOpenNewTab = useCallback((path: string) => {
    onOpenRepoNewTab?.(path);
  }, [onOpenRepoNewTab]);

  const handleSwitch = useCallback(async (path: string) => {
    try {
      await ipc.rpc(Channels.LOADREPO, path);
    } catch (error: any) {
      addAlert(`Failed to switch worktree: ${error.message}`, 'error');
    }
  }, [ipc, addAlert]);

  const handleDelete = useCallback(async (worktree: WorktreeModel) => {
    try {
      await gitService.deleteWorktree(worktree.path);
      addAlert('Worktree deleted', 'success');
    } catch (error: any) {
      addAlert(`Delete worktree failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert]);

  const headerContent = (
    <CardHeaderContent>
      <CardFilterInput
        placeholder="Filter..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        onClick={(e) => e.stopPropagation()}
      />
      <CardHeaderButtons>
        <TooltipTrigger
          placement="top"
          overlay={<Tooltip id="tooltip-add-worktree">Add Worktree</Tooltip>}
        >
          <Button
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleAddWorktree();
            }}
          >
            <Icon name="fa-plus" />
          </Button>
        </TooltipTrigger>
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
            onOpenFolder={handleOpenFolder}
            onOpenNewTab={handleOpenNewTab}
            onSwitch={handleSwitch}
            onDelete={handleDelete}
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
      <TooltipTrigger
        placement="bottom"
        overlay={<Tooltip id={`tooltip-worktree-path-${worktree.path}`}>{worktree.path}</Tooltip>}
      >
        <span className={`flex-grow-1 ${isCurrent ? 'fw-bold' : ''}`}>
          {worktree.name}
          {worktree.currentBranch === 'detached' && (
            <small className="text-muted ms-1">(detached)</small>
          )}
        </span>
      </TooltipTrigger>
      <ButtonGroup size="sm" className="ms-2">
        <TooltipTrigger
          placement="top"
          overlay={<Tooltip id={`tooltip-open-folder-${worktree.path}`}>Open folder</Tooltip>}
        >
          <Button
            variant="info"
            size="sm"
            onClick={() => onOpenFolder(worktree.path)}
          >
            <Icon name="fa-folder-open" size="sm" />
          </Button>
        </TooltipTrigger>
        {!isBare && !isCurrent && (
          <>
            <TooltipTrigger
              placement="top"
              overlay={<Tooltip id={`tooltip-open-new-tab-${worktree.path}`}>Open in new tab</Tooltip>}
            >
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpenNewTab(worktree.path)}
              >
                <Icon name="fa-external-link-square-alt" size="sm" />
              </Button>
            </TooltipTrigger>
            <TooltipTrigger
              placement="top"
              overlay={<Tooltip id={`tooltip-switch-worktree-${worktree.path}`}>Switch to this worktree</Tooltip>}
            >
              <Button
                variant="light"
                size="sm"
                onClick={() => onSwitch(worktree.path)}
              >
                <Icon name="fa-exchange-alt" size="sm" />
              </Button>
            </TooltipTrigger>
            <TooltipTrigger
              placement="top"
              overlay={<Tooltip id={`tooltip-delete-worktree-${worktree.path}`}>Delete worktree</Tooltip>}
            >
              <Button
                variant="danger"
                size="sm"
                onClick={() => onDelete(worktree)}
              >
                <Icon name="fa-trash" size="sm" />
              </Button>
            </TooltipTrigger>
          </>
        )}
      </ButtonGroup>
    </div>
  );
};

WorktreesCard.displayName = 'WorktreesCard';

export default WorktreesCard;
