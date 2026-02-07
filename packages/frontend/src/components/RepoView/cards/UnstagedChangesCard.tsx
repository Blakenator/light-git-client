import React, { useState, useMemo, useCallback } from 'react';
import { Button, ButtonGroup, Badge, Tooltip } from 'react-bootstrap';
import { LayoutCard } from '../../LayoutCard/LayoutCard';
import { Icon, TooltipTrigger } from '@light-git/core';
import {
  CardHeaderContent,
  CardFilterInput,
  CardHeaderButtons,
} from '../RepoView.styles';
import { ChangeList } from '../../ChangeList/ChangeList';
import { useRepositoryStore, useSettingsStore } from '../../../stores';
import { useStagingActions, useDiffActions } from '../hooks';

interface UnstagedChangesCardProps {
  repoPath: string;
}

export const UnstagedChangesCard: React.FC<UnstagedChangesCardProps> =
  React.memo(({ repoPath }) => {
    const [filter, setFilter] = useState('');

    const repoCache = useRepositoryStore((state) => state.getCacheFor(repoPath));
    const changes = useMemo(() => repoCache?.changes?.unstagedChanges || [], [repoCache?.changes?.unstagedChanges]);
    const selectedChanges = useMemo(() => repoCache?.selectedUnstagedChanges || {}, [repoCache?.selectedUnstagedChanges]);
    const splitFilenameDisplay = useSettingsStore((state) => state.settings.splitFilenameDisplay);

    const { refreshSelectedFilesDiff, handleFileClick } = useDiffActions(repoPath);
    const {
      handleStageAll,
      handleStageSelected,
      handleUndoFile,
      handleDeleteFiles,
      handleSelectUnstagedChange,
      handleBatchSelectUnstagedChange,
      handleSetFilenameSplit,
    } = useStagingActions(repoPath, refreshSelectedFilesDiff);

    const handleUnstagedFileClick = useCallback((path: string) => handleFileClick(path, false), [handleFileClick]);

    const normalizedChanges = useMemo(() => {
      return changes.map((c: any) => ({
        path: c.file,
        status: c.change,
        file: c.file,
        change: c.change,
      }));
    }, [changes]);

    const selectedPaths = Object.entries(selectedChanges)
      .filter(([_, selected]) => selected)
      .map(([path]) => path);

    const handleCopyPath = (path: string) => {
      navigator.clipboard.writeText(path);
    };

    const headerContent = (
      <CardHeaderContent>
        <Badge bg="light" text="dark" pill className="py-1 px-2">
          {changes.length}
        </Badge>
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
              overlay={<Tooltip id="tooltip-stage-all">Stage All</Tooltip>}
            >
              <Button
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStageAll();
                }}
              >
                <Icon name="fa-angle-double-up" />
              </Button>
            </TooltipTrigger>
            <TooltipTrigger
              placement="top"
              overlay={<Tooltip id="tooltip-stage-selected">Stage Selected</Tooltip>}
            >
              <Button
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStageSelected();
                }}
                disabled={selectedPaths.length === 0}
              >
                <Icon name="fa-angle-up" />
              </Button>
            </TooltipTrigger>
          </ButtonGroup>
          <ButtonGroup size="sm">
            <TooltipTrigger
              placement="top"
              overlay={<Tooltip id="tooltip-split-path">Split path and filename</Tooltip>}
            >
              <Button
                variant={splitFilenameDisplay ? 'primary' : 'secondary'}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetFilenameSplit(true);
                }}
              >
                Split
              </Button>
            </TooltipTrigger>
            <TooltipTrigger
              placement="top"
              overlay={<Tooltip id="tooltip-show-full-path">Show full path</Tooltip>}
            >
              <Button
                variant={!splitFilenameDisplay ? 'primary' : 'secondary'}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetFilenameSplit(false);
                }}
              >
                Joined
              </Button>
            </TooltipTrigger>
          </ButtonGroup>
          <TooltipTrigger
            placement="top"
            overlay={<Tooltip id="tooltip-undo-selected">Undo changes for selected</Tooltip>}
          >
            <Button
              variant="warning"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                selectedPaths.forEach(handleUndoFile);
              }}
              disabled={selectedPaths.length === 0}
            >
              <Icon name="fa-undo" />
            </Button>
          </TooltipTrigger>
          <TooltipTrigger
            placement="top"
            overlay={<Tooltip id="tooltip-delete-selected">Delete selected files</Tooltip>}
          >
            <Button
              variant="danger"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFiles(selectedPaths);
              }}
              disabled={selectedPaths.length === 0}
            >
              <Icon name="fa-trash" />
            </Button>
          </TooltipTrigger>
        </CardHeaderButtons>
      </CardHeaderContent>
    );

    return (
      <LayoutCard
        title="Unstaged Changes"
        expandKey="unstaged"
        headerContent={headerContent}
      >
        <ChangeList
          changes={normalizedChanges}
          selectedChanges={selectedChanges}
          splitFilenameDisplay={splitFilenameDisplay}
          filter={filter}
          onSelectChange={handleSelectUnstagedChange}
          onBatchSelectChange={handleBatchSelectUnstagedChange}
          onFileClick={handleUnstagedFileClick}
          onUndoFile={handleUndoFile}
          onDeleteFile={(path) => handleDeleteFiles([path])}
          onCopyPath={handleCopyPath}
        />
      </LayoutCard>
    );
  });

UnstagedChangesCard.displayName = 'UnstagedChangesCard';

export default UnstagedChangesCard;
