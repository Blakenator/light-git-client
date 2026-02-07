import React, { useCallback, useMemo } from 'react';
import { Button, ButtonGroup, Dropdown, Tooltip } from 'react-bootstrap';
import styled from 'styled-components';
import { Icon, PrettyCheckbox, TooltipTrigger } from '@light-git/core';
import {
  MarkdownEditor,
  type Suggestion,
} from '../../../common/components/MarkdownEditor/MarkdownEditor';
import { useRepositoryStore, useUiStore } from '../../../stores';
import { useRepoViewStore } from '../../../stores/repoViewStore';
import { useCommitActions } from '../hooks';

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
  border-radius: 0 0 ${({ theme }) => theme.borderRadius}
    ${({ theme }) => theme.borderRadius};
  z-index: 10;
`;

// Add filename chunks directly into the target map for autocomplete.
const addFilenameChunks = (
  filename: string,
  source: string,
  target: Map<string, string>,
): void => {
  const parts = filename
    .replace('->', '/->/') // Handle renames
    .split('/')
    .filter((chunk) => chunk && chunk !== '->');

  for (const part of parts) {
    if (part.length > 2 && !target.has(part)) target.set(part, source);
    const withoutExt = part.replace(/\.[^.]*$/, '');
    if (withoutExt !== part && withoutExt.length > 2 && !target.has(withoutExt))
      target.set(withoutExt, source);
  }
};

interface CommitPanelProps {
  repoPath: string;
}

export const CommitPanel: React.FC<CommitPanelProps> = React.memo(
  ({ repoPath }) => {
    // Self-managed: read data from stores and hooks
    const repoCache = useRepositoryStore((state) => state.getCacheFor(repoPath));
    const stagedChanges = useMemo(() => repoCache?.changes?.stagedChanges || [], [repoCache?.changes?.stagedChanges]);
    const unstagedChanges = useMemo(() => repoCache?.changes?.unstagedChanges || [], [repoCache?.changes?.unstagedChanges]);
    const localBranches = useMemo(() => repoCache?.localBranches || [], [repoCache?.localBranches]);
    const crlfError = useUiStore((state) => state.crlfError);
    const setCrlfError = useUiStore((state) => state.setCrlfError);
    const showModal = useUiStore((state) => state.showModal);
    const activeBranch = useRepoViewStore((state) => state.activeBranch[repoPath] || null);

    const {
      commitMessage,
      commitAndPush,
      handleCommit,
      handleCommitAndPushChange,
      setCommitMessage,
    } = useCommitActions(repoPath);

    const currentBranchName = useMemo(
      () => activeBranch?.name || localBranches.find((b: any) => b.isCurrentBranch)?.name || '',
      [activeBranch, localBranches],
    );

    const disabledReason = stagedChanges.length === 0 ? 'No staged changes to commit' : undefined;
    const isDisabled = !!disabledReason;
    const isCommitDisabled = isDisabled || !commitMessage.trim();
    const commitDisabledReason = disabledReason || (!commitMessage.trim() ? 'Enter a commit message' : undefined);

    const handleShowCodeWatchers = useCallback(() => showModal('codeWatchers'), [showModal]);
    const handleDismissCrlfError = useCallback(() => setCrlfError(null), [setCrlfError]);

    // Generate suggestions from file names and branch name
    const suggestions: Suggestion[] = useMemo(() => {
      const chunks = new Map<string, string>();

      for (const change of stagedChanges)
        addFilenameChunks((change as any).file, 'file', chunks);
      for (const change of unstagedChanges)
        addFilenameChunks((change as any).file, 'file', chunks);
      if (currentBranchName)
        addFilenameChunks(currentBranchName, 'branch', chunks);

      return Array.from(chunks, ([label, source]) => ({ label, source }));
    }, [stagedChanges, unstagedChanges, currentBranchName]);

    const handleSubmit = useCallback(() => {
      handleCommit(false);
    }, [handleCommit]);

    return (
      <CommitContainer>
        <CommitRow>
          <PrettyCheckbox
            checked={commitAndPush}
            onChange={handleCommitAndPushChange}
          >
            Commit and Push
          </PrettyCheckbox>
          <span className="flex-grow-1" />
          <Dropdown as={ButtonGroup}>
            <TooltipTrigger
              placement="top"
              overlay={<Tooltip id="tooltip-commit-changes">{commitDisabledReason || 'Commit changes'}</Tooltip>}
            >
              <Button
                variant="success"
                onClick={() => handleCommit(false)}
                disabled={isCommitDisabled}
              >
                Commit
              </Button>
            </TooltipTrigger>
            <Dropdown.Toggle split variant="success" disabled={isDisabled} />
            <Dropdown.Menu>
              <Dropdown.Item
                onClick={() => handleCommit(true)}
                disabled={isDisabled}
              >
                Amend
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </CommitRow>
        <CommitMessageContainer>
          <MarkdownEditor
            value={commitMessage}
            onChange={setCommitMessage}
            onSubmit={handleSubmit}
            placeholder="Commit message..."
            suggestions={suggestions}
          />

          <CrlfWarning $show={!!crlfError}>
            {crlfError && (
              <>
                <span>
                  {crlfError.start} will be replaced by {crlfError.end} on
                  commit
                </span>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0"
                  onClick={handleDismissCrlfError}
                >
                  <Icon name="fa-times" />
                </Button>
              </>
            )}
          </CrlfWarning>
        </CommitMessageContainer>
      </CommitContainer>
    );
  },
);

CommitPanel.displayName = 'CommitPanel';

export default CommitPanel;
