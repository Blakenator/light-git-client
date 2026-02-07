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

interface StagedChangesCardProps {
  repoPath: string;
}

export const StagedChangesCard: React.FC<StagedChangesCardProps> = React.memo(
  ({ repoPath }) => {
    const [filter, setFilter] = useState('');

    const repoCache = useRepositoryStore((state) => state.getCacheFor(repoPath));
    const changes = useMemo(() => repoCache?.changes?.stagedChanges || [], [repoCache?.changes?.stagedChanges]);
    const selectedChanges = useMemo(() => repoCache?.selectedStagedChanges || {}, [repoCache?.selectedStagedChanges]);
    const splitFilenameDisplay = useSettingsStore((state) => state.settings.splitFilenameDisplay);

    const { refreshSelectedFilesDiff, handleFileClick } = useDiffActions(repoPath);
    const {
      handleUnstageAll,
      handleUnstageSelected,
      handleUndoFile,
      handleDeleteFiles,
      handleSelectStagedChange,
      handleBatchSelectStagedChange,
      handleSetFilenameSplit,
    } = useStagingActions(repoPath, refreshSelectedFilesDiff);

    const handleStagedFileClick = useCallback((path: string) => handleFileClick(path, true), [handleFileClick]);

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
              overlay={<Tooltip id="tooltip-unstage-all">Unstage All</Tooltip>}
            >
              <Button
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnstageAll();
                }}
              >
                <Icon name="fa-angle-double-down" />
              </Button>
            </TooltipTrigger>
            <TooltipTrigger
              placement="top"
              overlay={<Tooltip id="tooltip-unstage-selected">Unstage Selected</Tooltip>}
            >
              <Button
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnstageSelected();
                }}
                disabled={selectedPaths.length === 0}
              >
                <Icon name="fa-angle-down" />
              </Button>
            </TooltipTrigger>
          </ButtonGroup>
          <ButtonGroup size="sm">
            <TooltipTrigger
              placement="top"
              overlay={<Tooltip id="tooltip-split-path-staged">Split path and filename</Tooltip>}
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
              overlay={<Tooltip id="tooltip-show-full-path-staged">Show full path</Tooltip>}
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
            overlay={<Tooltip id="tooltip-undo-selected-staged">Undo changes for selected</Tooltip>}
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
            overlay={<Tooltip id="tooltip-delete-selected-staged">Delete selected files</Tooltip>}
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
        title="Staged Changes"
        expandKey="staged"
        headerContent={headerContent}
      >
        <ChangeList
          changes={normalizedChanges}
          selectedChanges={selectedChanges}
          splitFilenameDisplay={splitFilenameDisplay}
          filter={filter}
          onSelectChange={handleSelectStagedChange}
          onBatchSelectChange={handleBatchSelectStagedChange}
          onFileClick={handleStagedFileClick}
          onUndoFile={handleUndoFile}
          onDeleteFile={(path) => handleDeleteFiles([path])}
          onCopyPath={handleCopyPath}
        />
      </LayoutCard>
    );
  },
);

StagedChangesCard.displayName = 'StagedChangesCard';

export default StagedChangesCard;
