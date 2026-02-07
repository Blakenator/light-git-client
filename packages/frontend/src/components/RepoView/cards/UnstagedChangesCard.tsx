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

interface UnstagedChangesCardProps {
  changes: FileChange[];
  selectedChanges: { [key: string]: boolean };
  splitFilenameDisplay: boolean;
  onSelectChange: (path: string, selected: boolean) => void;
  onBatchSelectChange?: (changes: Record<string, boolean>) => void;
  onStageAll: () => void;
  onStageSelected: () => void;
  onUndoFile: (path: string) => void;
  onDeleteFiles: (paths: string[]) => void;
  onSetFilenameSplit: (split: boolean) => void;
  onFileClick: (path: string) => void;
}

export const UnstagedChangesCard: React.FC<UnstagedChangesCardProps> =
  React.memo(
    ({
      changes,
      selectedChanges,
      splitFilenameDisplay,
      onSelectChange,
      onBatchSelectChange,
      onStageAll,
      onStageSelected,
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
                overlay={<Tooltip id="tooltip-stage-all">Stage All</Tooltip>}
              >
                <Button
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStageAll();
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
                    onStageSelected();
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
                    onSetFilenameSplit(true);
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
                    onSetFilenameSplit(false);
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
                  selectedPaths.forEach(onUndoFile);
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
          title="Unstaged Changes"
          expandKey="unstaged"
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

UnstagedChangesCard.displayName = 'UnstagedChangesCard';

export default UnstagedChangesCard;
