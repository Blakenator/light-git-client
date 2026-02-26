import React, { useMemo, useCallback } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { useRepoViewStore } from '../../stores/repoViewStore';
import { CardId } from '@light-git/shared';
import { PreCommitStatusModal } from './dialogs';
import { EditSectionsContext } from './EditSectionsContext';
import { RepoViewContainer, Column } from './RepoView.styles';
import { RepoTitleBar } from './RepoTitleBar';
import { useRepoLifecycle, useSectionLayout } from './hooks';
import {
  LocalBranchesCard,
  RemoteBranchesCard,
  WorktreesCard,
  SubmodulesCard,
  StashesCard,
  CommandHistoryCard,
  StagedChangesCard,
  UnstagedChangesCard,
  ActiveOperationBanner,
  CommitPanel,
  CommitHistoryCard,
} from './cards';

// Re-export for backward compatibility
export type { CardConfig } from './hooks';
export { CARD_CONFIGS } from './hooks';

interface RepoViewProps {
  repoPath: string;
  isNested?: boolean;
  onOpenRepoNewTab?: (path: string) => void;
  onLoadRepoFailed?: (error: any) => void;
}

export const RepoView: React.FC<RepoViewProps> = ({
  repoPath,
  isNested = false,
  onOpenRepoNewTab,
  onLoadRepoFailed,
}) => {
  // Lifecycle: loading, refresh, job queue auto-refresh
  const { refreshRepo, noMoreCommits } = useRepoLifecycle(repoPath, onLoadRepoFailed);

  // Section layout: drag-and-drop, edit sections mode
  const {
    isEditingSections,
    setIsEditingSections,
    leftCards,
    middleCards,
    rightCards,
    leftHasVisible,
    middleHasVisible,
    rightHasVisible,
    handleDragEnd,
    renderColumnCards,
  } = useSectionLayout(repoPath);

  // Active operation from store
  const activeOperation = useRepoViewStore((state) => state.activeOperation[repoPath] || null);

  const handleToggleEditSections = useCallback(() => {
    setIsEditingSections(!isEditingSections);
  }, [isEditingSections, setIsEditingSections]);

  // Map of card ID -> JSX element (self-managed, only needs repoPath)
  const cardComponents: Record<string, React.ReactNode> = useMemo(
    () => ({
      [CardId.LocalBranches]: <LocalBranchesCard repoPath={repoPath} />,
      [CardId.RemoteBranches]: <RemoteBranchesCard repoPath={repoPath} />,
      [CardId.Worktrees]: <WorktreesCard repoPath={repoPath} onOpenRepoNewTab={onOpenRepoNewTab} />,
      [CardId.Submodules]: <SubmodulesCard repoPath={repoPath} onOpenRepoNewTab={onOpenRepoNewTab} />,
      [CardId.Stashes]: <StashesCard repoPath={repoPath} />,
      [CardId.CommandHistory]: <CommandHistoryCard repoPath={repoPath} />,
      [CardId.StagedChanges]: <StagedChangesCard repoPath={repoPath} />,
      [CardId.UnstagedChanges]: <UnstagedChangesCard repoPath={repoPath} />,
      [CardId.CommitHistory]: <CommitHistoryCard repoPath={repoPath} noMoreCommits={noMoreCommits} />,
    }),
    [repoPath, onOpenRepoNewTab, noMoreCommits],
  );

  if (!repoPath) {
    return null;
  }

  const editSectionsContextValue = { isEditing: isEditingSections, setIsEditing: setIsEditingSections };

  return (
    <EditSectionsContext.Provider value={editSectionsContextValue}>
    <DragDropContext onDragEnd={handleDragEnd}>
    <RepoViewContainer>
      {/* Left Column */}
      {(leftHasVisible || isEditingSections) && (
      <Column>
        <RepoTitleBar
          repoPath={repoPath}
          refreshRepo={refreshRepo}
          isEditingSections={isEditingSections}
          onToggleEditSections={handleToggleEditSections}
        />
        {renderColumnCards(leftCards, 0, cardComponents)}
      </Column>
      )}

      {/* Middle Column */}
      {(middleHasVisible || isEditingSections) && (
      <Column>
        {renderColumnCards(middleCards, 1, cardComponents)}

        <ActiveOperationBanner repoPath={repoPath} />

        {!activeOperation && (
          <CommitPanel repoPath={repoPath} />
        )}
      </Column>
      )}

      {/* Right Column */}
      {(rightHasVisible || isEditingSections) && (
      <Column>
        {renderColumnCards(rightCards, 2, cardComponents)}
      </Column>
      )}

      {/* Shared modals */}
      <PreCommitStatusModal />
    </RepoViewContainer>
    </DragDropContext>
    </EditSectionsContext.Provider>
  );
};

export default RepoView;
