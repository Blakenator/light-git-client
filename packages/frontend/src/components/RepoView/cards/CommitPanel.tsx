import React, { useCallback, useMemo } from 'react';
import { Button, ButtonGroup, Dropdown, Tooltip } from 'react-bootstrap';
import styled from 'styled-components';
import { Icon, PrettyCheckbox, TooltipTrigger } from '@light-git/core';
import {
  MarkdownEditor,
  type Suggestion,
} from '../../../common/components/MarkdownEditor/MarkdownEditor';
import { CodeWatcherAlertsModal } from '../dialogs';
import { LayoutCard } from '../../LayoutCard/LayoutCard';
import { useRepositoryStore, useSettingsStore, useUiStore } from '../../../stores';
import { useRepoViewStore } from '../../../stores/repoViewStore';
import { useCommitActions } from '../hooks';

const _EMPTY_ARR: any[] = [];

const CommitBody = styled.div`
  padding: 0.75rem;
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
    const stagedChanges = useRepositoryStore((state) => state.repoCache[repoPath]?.changes?.stagedChanges) ?? _EMPTY_ARR;
    const unstagedChanges = useRepositoryStore((state) => state.repoCache[repoPath]?.changes?.unstagedChanges) ?? _EMPTY_ARR;
    const localBranches = useRepositoryStore((state) => state.repoCache[repoPath]?.localBranches) ?? _EMPTY_ARR;
    const crlfError = useUiStore((state) => state.crlfError);
    const setCrlfError = useUiStore((state) => state.setCrlfError);
    const autocompletePhrases = useSettingsStore(
      (state) => state.settings.autocompletePhrases,
    );
    const activeBranches = useRepoViewStore(
      (state) => state.activeBranches[repoPath] || [],
    );

    const {
      commitMessage,
      commitAndPush,
      handleCommit,
      handleCommitAnyway,
      handleWatcherCancel,
      handleCommitAndPushChange,
      setCommitMessage,
      watcherAlerts,
      showWatcherAlerts,
    } = useCommitActions(repoPath);

    const hasWatcherAlerts = watcherAlerts.length > 0;

    const currentBranchName = useMemo(
      () =>
        (activeBranches.length === 1 ? activeBranches[0]?.name : null) ||
        localBranches.find((b: any) => b.isCurrentBranch)?.name ||
        '',
      [activeBranches, localBranches],
    );

    const disabledReason =
      stagedChanges.length === 0 ? 'No staged changes to commit' : undefined;
    const isDisabled = !!disabledReason;
    const isCommitDisabled = isDisabled || !commitMessage.trim();
    const commitDisabledReason =
      disabledReason ||
      (!commitMessage.trim() ? 'Enter a commit message' : undefined);

    const handleDismissCrlfError = useCallback(
      () => setCrlfError(null),
      [setCrlfError],
    );

    const suggestions: Suggestion[] = useMemo(() => {
      const chunks = new Map<string, string>();

      for (const change of stagedChanges)
        addFilenameChunks((change as any).file, 'file', chunks);
      for (const change of unstagedChanges)
        addFilenameChunks((change as any).file, 'file', chunks);
      if (currentBranchName)
        addFilenameChunks(currentBranchName, 'branch', chunks);

      const result: Suggestion[] = Array.from(chunks, ([label, source]) => ({
        label,
        source,
        type: source as 'file' | 'branch',
      }));

      if (autocompletePhrases?.length) {
        for (const phrase of autocompletePhrases) {
          if (phrase.keyword)
            result.push({ label: phrase.keyword, source: phrase.value, type: 'phrase' });
        }
      }

      return result;
    }, [stagedChanges, unstagedChanges, currentBranchName, autocompletePhrases]);

    const handleSubmit = useCallback(() => {
      handleCommit(false);
    }, [handleCommit]);

    const headerContent = (
      <>
        <span className="flex-grow-1" />
        {hasWatcherAlerts && (
          <TooltipTrigger
            placement="top"
            overlay={
              <Tooltip id="tooltip-code-watchers">
                View code watcher alerts
              </Tooltip>
            }
          >
            <Button
              variant="warning"
              size="sm"
              onClick={() => showWatcherAlerts()}
            >
              <Icon name="fa-glasses" />
            </Button>
          </TooltipTrigger>
        )}
        <PrettyCheckbox
          checked={commitAndPush}
          onChange={handleCommitAndPushChange}
        >
          Push
        </PrettyCheckbox>
        <Dropdown as={ButtonGroup}>
          <TooltipTrigger
            placement="top"
            overlay={
              <Tooltip id="tooltip-commit-changes">
                {commitDisabledReason || 'Commit changes'}
              </Tooltip>
            }
          >
            <Button
              variant="success"
              size="sm"
              onClick={() => handleCommit(false)}
              disabled={isCommitDisabled}
            >
              Commit
            </Button>
          </TooltipTrigger>
          <Dropdown.Toggle split variant="success" size="sm" disabled={isDisabled} />
          <Dropdown.Menu>
            <Dropdown.Item
              onClick={() => handleCommit(true)}
              disabled={isDisabled}
            >
              Amend
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </>
    );

    return (
      <>
        <LayoutCard
          title="Commit"
          iconClass="fa-solid fa-pen"
          expandKey="commit-panel"
          headerContent={headerContent}
          shrinkWrap
        >
          <CommitBody>
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
          </CommitBody>
        </LayoutCard>

        <CodeWatcherAlertsModal
          alerts={watcherAlerts}
          isCommit={true}
          onCommit={handleCommitAnyway}
          onCancel={handleWatcherCancel}
        />
      </>
    );
  },
);

CommitPanel.displayName = 'CommitPanel';

export default CommitPanel;
