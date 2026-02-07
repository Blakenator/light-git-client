import React, { useState, useMemo, useCallback } from 'react';
import { Button, ButtonGroup, Badge, Dropdown, Form, Table, Tooltip } from 'react-bootstrap';
import { TooltipTrigger } from '@light-git/core';
import styled, { useTheme } from 'styled-components';
import { LayoutCard } from '../../LayoutCard/LayoutCard';
import { AgeInfo, Icon, GitGraphCanvas } from '../../../common/components';
import { CardHeaderContent } from '../RepoView.styles';
import { DiffViewer } from '../../DiffViewer/DiffViewer';
import { useRepositoryStore, useSettingsStore } from '../../../stores';
import { useDiffActions, useCommitHistoryActions } from '../hooks';
import { calculateGraphBlocks } from '../../../utils/calculateGraphBlocks';

const CommitListContainer = styled.div`
  overflow: hidden;
`;

const CommitTable = styled(Table)`
  margin-bottom: 0;
  border-collapse: separate;
  border-spacing: 0;
  
  tbody tr {
    &:hover td {
      background-color: ${({ theme }) => theme.colors.light};
    }
  }
  
  td {
    vertical-align: top;
    padding: 0.375rem 0.5rem;
    border: none;
    position: relative;
    background-color: transparent;
  }

  tbody tr:nth-child(odd) td {
    background-color: ${({ theme }) => theme.colors.text}08;
  }
`;

const GraphCell = styled.td`
  width: 1%;
  white-space: nowrap;
  padding: 0 !important;
  overflow: hidden;
  position: relative;
  vertical-align: middle !important;
  background-color: transparent !important;
`;

const MessageCell = styled.td`
  max-width: 0;
  width: 100%;
`;

const MessageRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.25rem;
`;

const ExpandCaret = styled.span`
  flex-shrink: 0;
  cursor: pointer;
  padding: 0.125rem;
  display: flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.secondary};

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const MessageContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const MessageFirstLine = styled.span<{ $expanded?: boolean }>`
  font-weight: 500;
  ${({ $expanded }) =>
    !$expanded &&
    `
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  `}
`;

const MessageBody = styled.pre`
  margin: 0.25rem 0 0 0;
  font-family: inherit;
  font-size: 0.8rem;
  white-space: pre-wrap;
  word-break: break-word;
  color: ${({ theme }) => theme.colors.secondary};
`;

const TagRow = styled.div`
  display: flex;
  gap: 0.25rem;
  margin-top: 0.25rem;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: thin;
  
  &::-webkit-scrollbar {
    height: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.colors.secondary}40;
    border-radius: 3px;
  }
`;

const TagBadge = styled(Badge)<{ $tagType: 'local' | 'remote' | 'tag' | 'head' }>`
  font-size: 0.65rem;
  font-weight: 500;
  flex-shrink: 0;
  background-color: ${({ $tagType, theme }) => {
    switch ($tagType) {
      case 'head': return theme.colors.warning;
      case 'remote': return theme.colors.primary;
      case 'tag': return theme.colors.success;
      default: return theme.colors.info;
    }
  }} !important;
  color: ${({ $tagType, theme }) => {
    switch ($tagType) {
      case 'head': return theme.colors.black;
      default: return theme.colors.white;
    }
  }} !important;
`;

const CopyMessageButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.125rem 0.25rem;
  color: ${({ theme }) => theme.colors.secondary};
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;

  tr:hover & {
    opacity: 0.6;
  }

  &:hover {
    opacity: 1 !important;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const CommitMeta = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.secondary};
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 0.125rem;
`;

const CommitHash = styled.span`
  font-family: ${({ theme }) => theme.fonts.monospace};
`;

const BranchSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
  min-width: 0;
`;

const BranchDropdownMenu = styled(Dropdown.Menu)`
  max-height: 300px;
  overflow-y: auto;
  max-width: 320px;
  min-width: 220px;
`;

const BranchToggleText = styled.span`
  display: inline-block;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
`;

const BranchItemText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
  padding-left: 1.25em;
`;

const BranchItemWithIcon = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
`;

const SearchInput = styled(Form.Control)`
  max-width: 150px;
`;

const ActionsCell = styled.td`
  width: 1%;
  white-space: nowrap;
  vertical-align: middle !important;
`;

const ActionsToggle = styled(Dropdown.Toggle)`
  &::after {
    display: none;
  }
  line-height: 1;
  padding: 0.25rem 0.4rem;
`;

interface CommitHistoryCardProps {
  repoPath: string;
  noMoreCommits: React.MutableRefObject<boolean>;
}

export const CommitHistoryCard: React.FC<CommitHistoryCardProps> = React.memo(({
  repoPath,
  noMoreCommits,
}) => {
  const theme = useTheme();
  const [searchFilter, setSearchFilter] = useState('');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [branchFilter, setBranchFilter] = useState('');
  const [expandedCommits, setExpandedCommits] = useState<Set<string>>(new Set());

  // Self-managed: read data from stores
  const repoCache = useRepositoryStore((state) => state.getCacheFor(repoPath));
  const rawCommitHistory = useMemo(() => repoCache?.commitHistory || [], [repoCache?.commitHistory]);
  const commits = useMemo(() => calculateGraphBlocks(rawCommitHistory), [rawCommitHistory]);
  const localBranches = useMemo(() => (repoCache?.localBranches || []) as any[], [repoCache?.localBranches]);
  const remoteBranches = useMemo(() => (repoCache?.remoteBranches || []) as any[], [repoCache?.remoteBranches]);
  const ignoreWhitespace = useSettingsStore((state) => state.settings.diffIgnoreWhitespace);

  // Hooks for operations
  const {
    showDiff,
    currentDiff: diffHeaders,
    commitInfo,
    hasMoreDiffs,
    isLoadingMoreDiffs,
    loadMoreDiffs,
    handleToggleDiffView,
    handleExitDiffView,
    handleIgnoreWhitespaceChange,
    handleHunkChange,
    handleHunkChangeError,
  } = useDiffActions(repoPath);

  const {
    activeBranch,
    handleLoadMoreCommits,
    handleClickCommit,
    handleCherryPick,
    handleCheckoutCommit,
    handleRevertCommit,
    handleCreateBranchFromCommit,
    handleCopyHash,
    handleResetToCommit,
    handleBranchChange,
  } = useCommitHistoryActions(repoPath, noMoreCommits);

  // Filter branches for the dropdown
  const filteredBranches = useMemo(() => {
    const filter = branchFilter.toLowerCase();
    const allBranches = [...localBranches, ...remoteBranches];
    return filter
      ? allBranches.filter((b: any) => b.name.toLowerCase().includes(filter))
      : allBranches;
  }, [localBranches, remoteBranches, branchFilter]);

  // Filter commits by search
  const filteredCommits = useMemo(() => {
    if (!searchFilter) return commits;
    const filter = searchFilter.toLowerCase();
    return commits.filter(
      (c: any) =>
        c.message.toLowerCase().includes(filter) ||
        c.hash.toLowerCase().includes(filter) ||
        c.authorName.toLowerCase().includes(filter)
    );
  }, [commits, searchFilter]);

  const handleBranchSelect = useCallback(
    (branch: any | null) => {
      handleBranchChange(branch);
      setShowBranchDropdown(false);
      setBranchFilter('');
    },
    [handleBranchChange]
  );

  const currentBranch = useMemo(
    () => localBranches.find((b: any) => b.isCurrentBranch),
    [localBranches]
  );

  const isCurrentBranchActive = activeBranch && currentBranch && activeBranch.name === currentBranch.name;

  const toggleCurrentBranchFilter = useCallback(() => {
    if (!currentBranch) return;
    handleBranchChange(isCurrentBranchActive ? null : currentBranch);
  }, [currentBranch, isCurrentBranchActive, handleBranchChange]);

  const toggleExpand = useCallback((hash: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedCommits((prev) => {
      const next = new Set(prev);
      if (next.has(hash)) {
        next.delete(hash);
      } else {
        next.add(hash);
      }
      return next;
    });
  }, []);

  const copyMessage = useCallback((message: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(message);
  }, []);

  const getTagType = useCallback((tag: string): 'local' | 'remote' | 'tag' | 'head' => {
    if (tag.startsWith('HEAD')) return 'head';
    if (tag.startsWith('tag: ')) return 'tag';
    if (tag.startsWith('origin/')) return 'remote';
    return 'local';
  }, []);

  const getTagIcon = useCallback((tag: string): string | null => {
    if (tag.startsWith('origin/')) return 'fa-cloud';
    if (tag.startsWith('tag: ')) return 'fa-tag';
    return null;
  }, []);

  const getTagLabel = useCallback((tag: string): string => {
    return tag.replace('tag: ', '');
  }, []);

  const isExpandable = useCallback((commit: any): boolean => {
    return commit.message.includes('\n');
  }, []);

  const handleLayoutScroll = useCallback(() => {
    if (showDiff) {
      loadMoreDiffs();
    } else {
      handleLoadMoreCommits();
    }
  }, [showDiff, handleLoadMoreCommits, loadMoreDiffs]);

  const onToggleView = handleToggleDiffView;
  const onExitDiffView = handleExitDiffView;

  const headerContent = (
    <CardHeaderContent>
      <ButtonGroup size="sm">
        <Button
          variant={!showDiff ? 'primary' : 'secondary'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleView(false);
          }}
        >
          Commit History
        </Button>
        <Button
          variant={showDiff ? 'primary' : 'secondary'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleView(true);
          }}
        >
          Diff
        </Button>
      </ButtonGroup>

      {!showDiff && <BranchSelector onClick={(e) => e.stopPropagation()}>
        <SearchInput
          size="sm"
          placeholder="Search commits..."
          value={searchFilter}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearchFilter(e.target.value)
          }
        />
        
        <ButtonGroup size="sm">
          {currentBranch && (
            <TooltipTrigger
              placement="top"
              overlay={<Tooltip id="tooltip-filter-current-branch">Filter to current branch</Tooltip>}
            >
              <Button
                variant={isCurrentBranchActive ? 'primary' : 'secondary'}
                onClick={toggleCurrentBranchFilter}
              >
                <Icon name={isCurrentBranchActive ? 'fa-eye-slash' : 'fa-eye'} size="sm" />
              </Button>
            </TooltipTrigger>
          )}
          <Dropdown
            show={showBranchDropdown}
            onToggle={(open) => setShowBranchDropdown(open)}
            as={ButtonGroup}
          >
            <TooltipTrigger
              placement="top"
              overlay={<Tooltip id="tooltip-active-branch">{activeBranch?.name || 'All branches'}</Tooltip>}
            >
              <Dropdown.Toggle variant={activeBranch ? 'primary' : 'secondary'} size="sm">
                {activeBranch && (
                  <>
                    <Icon name="fa-filter" className="me-1" />
                    <BranchToggleText>{activeBranch.name}</BranchToggleText>
                  </>
                )}
              </Dropdown.Toggle>
            </TooltipTrigger>
            <BranchDropdownMenu>
              <div className="px-2 py-1">
                <Form.Control
                  size="sm"
                  placeholder="Filter branches..."
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  autoFocus
                />
              </div>
              <Dropdown.Divider />
              {currentBranch && (
                <>
                  <Dropdown.Header>Current Branch</Dropdown.Header>
                  <Dropdown.Item
                    active={activeBranch?.name === currentBranch.name}
                    onClick={() => handleBranchSelect(currentBranch)}
                  >
                    <BranchItemWithIcon>
                      <Icon name="fa-shopping-cart" className="me-1" />
                      {currentBranch.name}
                    </BranchItemWithIcon>
                  </Dropdown.Item>
                  <Dropdown.Divider />
                </>
              )}
              <Dropdown.Item onClick={() => handleBranchSelect(null)}>
                <BranchItemText>All branches</BranchItemText>
              </Dropdown.Item>
              <Dropdown.Divider />
              {localBranches.length > 0 && (
                <>
                  <Dropdown.Header>Local</Dropdown.Header>
                  {filteredBranches
                    .filter((b: any) => localBranches.includes(b))
                    .map((branch: any) => (
                      <Dropdown.Item
                        key={branch.name}
                        active={activeBranch?.name === branch.name}
                        onClick={() => handleBranchSelect(branch)}
                      >
                        {branch.isCurrentBranch ? (
                          <BranchItemWithIcon>
                            <Icon name="fa-shopping-cart" className="me-1" />
                            {branch.name}
                          </BranchItemWithIcon>
                        ) : (
                          <BranchItemText>{branch.name}</BranchItemText>
                        )}
                      </Dropdown.Item>
                    ))}
                </>
              )}
              {remoteBranches.length > 0 && (
                <>
                  <Dropdown.Header>Remote</Dropdown.Header>
                  {filteredBranches
                    .filter((b: any) => remoteBranches.includes(b))
                    .map((branch: any) => (
                      <Dropdown.Item
                        key={branch.name}
                        active={activeBranch?.name === branch.name}
                        onClick={() => handleBranchSelect(branch)}
                      >
                        <BranchItemText>{branch.name}</BranchItemText>
                      </Dropdown.Item>
                    ))}
                </>
              )}
            </BranchDropdownMenu>
          </Dropdown>
        </ButtonGroup>
      </BranchSelector>}
    </CardHeaderContent>
  );

  return (
    <LayoutCard
      title=""
      expandKey="commit-history"
      headerContent={headerContent}
      fillHeight={true}
      onScroll={handleLayoutScroll}
    >
      {!showDiff ? (
        <CommitListContainer>
          <CommitTable hover size="sm">
            <tbody>
              {filteredCommits.map((commit: any) => {
                const isExpanded = expandedCommits.has(commit.hash);
                const expandable = isExpandable(commit);
                const tags = commit.currentTags || commit.branchEndings || [];
                const messageLines = commit.message.split('\n');
                const firstLine = messageLines[0];
                const restLines = messageLines.slice(1).join('\n').trim();

                return (
                  <tr key={commit.hash}>
                    <GraphCell>
                      <GitGraphCanvas commit={commit} />
                    </GraphCell>
                    <MessageCell>
                      <MessageRow>
                        {expandable && (
                          <ExpandCaret onClick={(e) => toggleExpand(commit.hash, e)}>
                            <Icon
                              name={isExpanded ? 'fa-caret-down' : 'fa-caret-right'}
                              size="sm"
                            />
                          </ExpandCaret>
                        )}
                        <MessageContent>
                          <MessageFirstLine $expanded={isExpanded}>
                            {firstLine}
                          </MessageFirstLine>
                          {isExpanded && restLines && (
                            <MessageBody>{restLines}</MessageBody>
                          )}
                        </MessageContent>
                        {expandable && (
                          <TooltipTrigger
                            placement="top"
                            overlay={<Tooltip id={`tooltip-copy-message-${commit.hash}`}>Copy full message</Tooltip>}
                          >
                            <CopyMessageButton
                              onClick={(e) => copyMessage(commit.message, e)}
                            >
                              <Icon name="fa-copy" size="sm" />
                            </CopyMessageButton>
                          </TooltipTrigger>
                        )}
                      </MessageRow>
                      <CommitMeta>
                        <CommitHash>{commit.hash.substring(0, 7)}</CommitHash>
                        <span>{commit.authorName}</span>
                        <AgeInfo date={commit.authorDate} />
                      </CommitMeta>
                      {tags.length > 0 && (
                        <TagRow>
                          {tags.map((tag: string) => {
                            const tagType = getTagType(tag);
                            const icon = getTagIcon(tag);
                            return (
                              <TagBadge key={tag} $tagType={tagType}>
                                {icon && <Icon name={icon} size="sm" className="me-1" />}
                                {getTagLabel(tag)}
                              </TagBadge>
                            );
                          })}
                        </TagRow>
                      )}
                    </MessageCell>
                    <ActionsCell onClick={(e) => e.stopPropagation()}>
                      <Dropdown align="end">
                        <ActionsToggle variant="outline-secondary" size="sm" id={`commit-actions-${commit.hash}`}>
                          <Icon name="fa-ellipsis-vertical" size="sm" />
                        </ActionsToggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => handleClickCommit(commit.hash)}>
                            <Icon name="fa-eye" size="sm" className="me-2" />
                            View Diff
                          </Dropdown.Item>
                          <Dropdown.Divider />
                          <Dropdown.Item onClick={() => handleCherryPick(commit)}>
                            <Icon name="fa-code-branch" size="sm" className="me-2" />
                            Cherry Pick
                          </Dropdown.Item>
                          <Dropdown.Item onClick={() => handleCheckoutCommit(commit.hash)}>
                            <Icon name="fa-shopping-cart" size="sm" className="me-2" />
                            Checkout
                          </Dropdown.Item>
                          <Dropdown.Item onClick={() => handleRevertCommit(commit)}>
                            <Icon name="fa-undo" size="sm" className="me-2" />
                            Revert Commit
                          </Dropdown.Item>
                          <Dropdown.Item onClick={() => handleCreateBranchFromCommit(commit)}>
                            <Icon name="fa-code-branch" size="sm" className="me-2" />
                            Create Branch from Here
                          </Dropdown.Item>
                          <Dropdown.Divider />
                          <Dropdown.Item onClick={() => handleCopyHash(commit.hash)}>
                            <Icon name="fa-copy" size="sm" className="me-2" />
                            Copy Hash
                          </Dropdown.Item>
                          <Dropdown.Divider />
                          <Dropdown.Header>Reset to this commit</Dropdown.Header>
                          <Dropdown.Item onClick={() => handleResetToCommit(commit, 'soft')}>
                            <Icon name="fa-arrow-left" size="sm" className="me-2" />
                            Soft Reset
                          </Dropdown.Item>
                          <Dropdown.Item onClick={() => handleResetToCommit(commit, 'mixed')}>
                            <Icon name="fa-arrow-left" size="sm" className="me-2" />
                            Mixed Reset
                          </Dropdown.Item>
                          <Dropdown.Item className="text-danger" onClick={() => handleResetToCommit(commit, 'hard')}>
                            <Icon name="fa-exclamation-triangle" size="sm" className="me-2" />
                            Hard Reset
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </ActionsCell>
                  </tr>
                );
              })}
            </tbody>
          </CommitTable>
          {filteredCommits.length === 0 && (
            <div className="text-muted text-center py-3">
              {searchFilter ? 'No matching commits' : 'No commits found'}
            </div>
          )}
        </CommitListContainer>
      ) : (
        <div style={{ flex: 1 }}>
          {diffHeaders.length > 0 ? (
            <DiffViewer
              diffHeaders={diffHeaders}
              commitInfo={commitInfo}
              ignoreWhitespace={ignoreWhitespace}
              hasMore={hasMoreDiffs}
              isLoadingMore={isLoadingMoreDiffs}
              onIgnoreWhitespaceClick={() => handleIgnoreWhitespaceChange(!ignoreWhitespace)}
              onExitCommitView={onExitDiffView || (() => onToggleView(false))}
              onNavigateToHash={handleClickCommit}
              onHunkChange={handleHunkChange}
              onHunkChangeError={handleHunkChangeError}
            />
          ) : (
            <div className="text-muted text-center p-3">
              Select a commit or file to view its diff
            </div>
          )}
        </div>
      )}
    </LayoutCard>
  );
});

CommitHistoryCard.displayName = 'CommitHistoryCard';

export default CommitHistoryCard;
