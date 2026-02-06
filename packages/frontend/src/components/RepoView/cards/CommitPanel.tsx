import React, { useState, useCallback, useMemo } from 'react';
import { Button, ButtonGroup, Dropdown } from 'react-bootstrap';
import styled from 'styled-components';
import { Icon, PrettyCheckbox } from '@light-git/core';
import { MarkdownEditor } from '../../../common/components/MarkdownEditor/MarkdownEditor';

const CommitContainer = styled.div`
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadows.material};
  padding: 0.75rem;
`;

const CommitRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const CommitMessageContainer = styled.div`
  position: relative;
`;

const CrlfWarning = styled.div<{ $show: boolean }>`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  transform: translateY(${({ $show }) => ($show ? '100%' : '50%')});
  opacity: ${({ $show }) => ($show ? 1 : 0)};
  transition: all 0.2s;
  background-color: ${({ theme }) => theme.colors.alertWarningBg};
  color: ${({ theme }) => theme.colors.alertWarningText};
  padding: 0.5rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 0 0 ${({ theme }) => theme.borderRadius} ${({ theme }) => theme.borderRadius};
  z-index: 10;
`;

interface FileChange {
  file: string;
}

interface CommitPanelProps {
  commitMessage: string;
  commitAndPush: boolean;
  hasWatcherAlerts: boolean;
  disabledReason?: string;
  crlfError?: { start: string; end: string } | null;
  stagedChanges?: FileChange[];
  unstagedChanges?: FileChange[];
  currentBranchName?: string;
  enableAutocomplete?: boolean;
  onMessageChange: (message: string) => void;
  onCommitAndPushChange: (value: boolean) => void;
  onCommit: (amend: boolean) => void;
  onShowWatchers: () => void;
  onDismissCrlfError: () => void;
}

// Extract filename chunks for autocomplete
const getFilenameChunks = (filename: string): string[] => {
  return filename
    .replace('->', '/->/') // Handle renames
    .split('/')
    .filter((chunk) => chunk && chunk !== '->')
    .map((chunk) => chunk.replace(/\.[^.]*$/, '')); // Remove file extensions
};

export const CommitPanel: React.FC<CommitPanelProps> = React.memo(({
  commitMessage,
  commitAndPush,
  hasWatcherAlerts,
  disabledReason,
  crlfError,
  stagedChanges = [],
  unstagedChanges = [],
  currentBranchName = '',
  enableAutocomplete = true,
  onMessageChange,
  onCommitAndPushChange,
  onCommit,
  onShowWatchers,
  onDismissCrlfError,
}) => {
  const isDisabled = !!disabledReason;

  // Generate suggestions from file names and branch name
  const suggestions = useMemo(() => {
    if (!enableAutocomplete) return [];

    const chunks = new Set<string>();

    // Add chunks from staged changes
    stagedChanges.forEach((change) => {
      getFilenameChunks(change.file).forEach((chunk) => {
        if (chunk.length > 2) {
          chunks.add(chunk);
        }
      });
    });

    // Add chunks from unstaged changes
    unstagedChanges.forEach((change) => {
      getFilenameChunks(change.file).forEach((chunk) => {
        if (chunk.length > 2) {
          chunks.add(chunk);
        }
      });
    });

    // Add branch name chunks
    if (currentBranchName) {
      getFilenameChunks(currentBranchName).forEach((chunk) => {
        if (chunk.length > 2) {
          chunks.add(chunk);
        }
      });
    }

    return Array.from(chunks);
  }, [enableAutocomplete, stagedChanges, unstagedChanges, currentBranchName]);

  const handleSubmit = useCallback(() => {
    onCommit(false);
  }, [onCommit]);

  return (
    <CommitContainer>
      <CommitRow>
        <PrettyCheckbox checked={commitAndPush} onChange={onCommitAndPushChange}>
          Commit and Push
        </PrettyCheckbox>
        <span className="flex-grow-1" />
        {hasWatcherAlerts && (
          <Button variant="warning" size="sm" onClick={onShowWatchers}>
            <Icon name="fa-glasses" />
          </Button>
        )}
        <Dropdown as={ButtonGroup}>
          <Button
            variant="success"
            onClick={() => onCommit(false)}
            disabled={isDisabled}
            title={disabledReason || 'Commit changes'}
          >
            Commit
          </Button>
          <Dropdown.Toggle split variant="success" disabled={isDisabled} />
          <Dropdown.Menu>
            <Dropdown.Item onClick={() => onCommit(true)} disabled={isDisabled}>
              Amend
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </CommitRow>
      <CommitMessageContainer>
        <MarkdownEditor
          value={commitMessage}
          onChange={onMessageChange}
          onSubmit={handleSubmit}
          placeholder="Commit message..."
          suggestions={suggestions}
        />

        <CrlfWarning $show={!!crlfError}>
          {crlfError && (
            <>
              <span>
                {crlfError.start} will be replaced by {crlfError.end} on commit
              </span>
              <Button
                variant="link"
                size="sm"
                className="p-0"
                onClick={onDismissCrlfError}
              >
                <Icon name="fa-times" />
              </Button>
            </>
          )}
        </CrlfWarning>
      </CommitMessageContainer>
    </CommitContainer>
  );
});

CommitPanel.displayName = 'CommitPanel';

export default CommitPanel;
