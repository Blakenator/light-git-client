import React, { useState, useMemo } from 'react';
import { Button, ButtonGroup, Badge } from 'react-bootstrap';
import { LayoutCard } from '../../LayoutCard/LayoutCard';
import { Icon } from '@light-git/core';
import { CardHeaderContent, CardFilterInput, CardHeaderButtons } from '../RepoView.styles';
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
  onUnstageAll: () => void;
  onUnstageSelected: () => void;
  onUndoFile: (path: string) => void;
  onDeleteFiles: (paths: string[]) => void;
  onSetFilenameSplit: (split: boolean) => void;
  onFileClick: (path: string) => void;
}

export const StagedChangesCard: React.FC<StagedChangesCardProps> = React.memo(({
  changes,
  selectedChanges,
  splitFilenameDisplay,
  onSelectChange,
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
          <Button
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onUnstageAll();
            }}
            title="Unstage All"
          >
            <Icon name="fa-angle-double-down" />
          </Button>
          <Button
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onUnstageSelected();
            }}
            title="Unstage Selected"
            disabled={selectedPaths.length === 0}
          >
            <Icon name="fa-angle-down" />
          </Button>
        </ButtonGroup>
        <ButtonGroup size="sm">
          <Button
            variant={splitFilenameDisplay ? 'primary' : 'secondary'}
            onClick={(e) => {
              e.stopPropagation();
              onSetFilenameSplit(true);
            }}
            title="Split path and filename"
          >
            Split
          </Button>
          <Button
            variant={!splitFilenameDisplay ? 'primary' : 'secondary'}
            onClick={(e) => {
              e.stopPropagation();
              onSetFilenameSplit(false);
            }}
            title="Show full path"
          >
            Joined
          </Button>
        </ButtonGroup>
        <Button
          variant="warning"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            selectedPaths.forEach(onUndoFile);
          }}
          title="Undo changes for selected"
          disabled={selectedPaths.length === 0}
        >
          <Icon name="fa-undo" />
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteFiles(selectedPaths);
          }}
          title="Delete selected files"
          disabled={selectedPaths.length === 0}
        >
          <Icon name="fa-trash" />
        </Button>
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
        onFileClick={onFileClick}
        onUndoFile={onUndoFile}
        onDeleteFile={(path) => onDeleteFiles([path])}
        onCopyPath={handleCopyPath}
      />
    </LayoutCard>
  );
});

StagedChangesCard.displayName = 'StagedChangesCard';

export default StagedChangesCard;
