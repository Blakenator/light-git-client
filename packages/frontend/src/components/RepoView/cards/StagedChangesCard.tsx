import React, { useState, useMemo } from 'react';
import { Button, ButtonGroup, Badge, Tooltip } from 'react-bootstrap';
import { LayoutCard } from '../../LayoutCard/LayoutCard';
import { Icon, TooltipTrigger } from '@light-git/core';
import {
  CardHeaderContent,
  CardFilterInput,
  CardHeaderButtons,
} from '../RepoView.styles';
import { ChangeList } from '../../ChangeList/ChangeList';

interface FileChange {
  file: string;
  change: string;
  staged: boolean;
}

interface StagedChangesCardProps {
  changes: FileChange[];
  selectedChanges: { [key: string]: boolean };
  splitFilenameDisplay: boolean;
  onSelectChange: (path: string, selected: boolean) => void;
  onBatchSelectChange?: (changes: Record<string, boolean>) => void;
  onUnstageAll: () => void;
  onUnstageSelected: () => void;
  onUndoFile: (path: string) => void;
  onDeleteFiles: (paths: string[]) => void;
  onSetFilenameSplit: (split: boolean) => void;
  onFileClick: (path: string) => void;
}

export const StagedChangesCard: React.FC<StagedChangesCardProps> = React.memo(
  ({
    changes,
    selectedChanges,
    splitFilenameDisplay,
    onSelectChange,
    onBatchSelectChange,
    onUnstageAll,
    onUnstageSelected,
    onUndoFile,
    onDeleteFiles,
    onSetFilenameSplit,
    onFileClick,
  }) => {
    const [filter, setFilter] = useState('');

    const normalizedChanges = useMemo(() => {
      return changes.map((c) => ({
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
                  onUnstageAll();
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
                  onUnstageSelected();
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
                  onSetFilenameSplit(true);
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
                  onSetFilenameSplit(false);
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
                selectedPaths.forEach(onUndoFile);
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
                onDeleteFiles(selectedPaths);
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
          onSelectChange={onSelectChange}
          onBatchSelectChange={onBatchSelectChange}
          onFileClick={onFileClick}
          onUndoFile={onUndoFile}
          onDeleteFile={(path) => onDeleteFiles([path])}
          onCopyPath={handleCopyPath}
        />
      </LayoutCard>
    );
  },
);

StagedChangesCard.displayName = 'StagedChangesCard';

export default StagedChangesCard;
