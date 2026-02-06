import React, { useState, useMemo, useCallback } from 'react';
import { Button, ButtonGroup, Badge, Dropdown, Form, Table, DropdownButton } from 'react-bootstrap';
import styled, { useTheme } from 'styled-components';
import { LayoutCard } from '../../LayoutCard/LayoutCard';
import { AgeInfo, Icon, GitGraphCanvas } from '../../../common/components';
import { CardHeaderContent } from '../RepoView.styles';
import { DiffViewer } from '../../DiffViewer/DiffViewer';

const CommitListContainer = styled.div`
  overflow-x: hidden;
`;

const ROW_HEIGHT = 44;

const CommitTable = styled(Table)`
  margin-bottom: 0;
  border-collapse: separate;
  border-spacing: 0;
  
  tbody tr {
    cursor: pointer;
    
    &:hover {
      background-color: ${({ theme }) => theme.colors.light};
    }
  }
  
  td {
    vertical-align: top;
    padding: 0.375rem 0.5rem;
    border: none;
    position: relative;
  }
`;

const GraphCell = styled.td`
  width: 1%;
  white-space: nowrap;
  padding: 0 !important;
  overflow: visible;
  position: relative;
  vertical-align: middle !important;
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

const TagBadge = styled(Badge)<{ $tagType: 'local' | 'remote' | 'tag' | 'head' }>`
  font-size: 0.65rem;
  font-weight: 500;
  margin-right: 0.25rem;
  vertical-align: middle;
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
`;

const SearchInput = styled(Form.Control)`
  max-width: 150px;
`;

const ActionsCell = styled.td`
  width: 1%;
  white-space: nowrap;
  vertical-align: middle !important;
`;

interface BranchModel {
  name: string;
  isCurrentBranch?: boolean;
  trackingPath?: string;
}

interface GraphBlockTarget {
  source: number;
  target: number;
  isCommit: boolean;
  isMerge: boolean;
  branchIndex: number;
}

interface CommitSummary {
  hash: string;
  message: string;
  author: string;
  date: Date | string | number;
  parents?: string[];
  graphBlockTargets?: GraphBlockTarget[];
  branchEndings?: string[];
  currentTags?: string[];
}

interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
  parents?: string[];
}

interface DiffHunk {
  header: string;
  lines: any[];
  fromStartLine: number;
  toStartLine: number;
}

interface CommitHistoryCardProps {
  commits: CommitSummary[];
  showDiff: boolean;
  diffHeaders?: any[];
  commitInfo?: CommitInfo | null;
  localBranches?: BranchModel[];
  remoteBranches?: BranchModel[];
  activeBranch?: BranchModel | null;
  enableGraphView?: boolean;
  ignoreWhitespace?: boolean;
  onToggleView: (showDiff: boolean) => void;
  onClickCommit: (hash: string) => void;
  onCherryPick: (commit: CommitSummary) => void;
  onCheckout: (hash: string) => void;
  onLoadMore: () => void;
  onBranchChange?: (branch: BranchModel | null) => void;
  onIgnoreWhitespaceChange?: (value: boolean) => void;
  onRevert?: (commit: CommitSummary) => void;
  onCreateBranchFromCommit?: (commit: CommitSummary) => void;
  onCopyHash?: (hash: string) => void;
  onResetToCommit?: (commit: CommitSummary, mode: 'soft' | 'mixed' | 'hard') => void;
  onHunkChange?: (filename: string, hunk: DiffHunk, newContent: string) => Promise<void>;
  onHunkChangeError?: (error: Error) => void;
}

export const CommitHistoryCard: React.FC<CommitHistoryCardProps> = React.memo(({
  commits,
  showDiff,
  diffHeaders = [],
  commitInfo,
  localBranches = [],
  remoteBranches = [],
  activeBranch,
  enableGraphView = true,
  ignoreWhitespace = false,
  onToggleView,
  onClickCommit,
  onCherryPick,
  onCheckout,
  onLoadMore,
  onBranchChange,
  onIgnoreWhitespaceChange,
  onRevert,
  onCreateBranchFromCommit,
  onCopyHash,
  onResetToCommit,
  onHunkChange,
  onHunkChangeError,
}) => {
  const theme = useTheme();
  const [searchFilter, setSearchFilter] = useState('');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [branchFilter, setBranchFilter] = useState('');
  const [expandedCommits, setExpandedCommits] = useState<Set<string>>(new Set());

  // Filter branches for the dropdown
  const filteredBranches = useMemo(() => {
    const filter = branchFilter.toLowerCase();
    const allBranches = [...localBranches, ...remoteBranches];
    return filter
      ? allBranches.filter((b) => b.name.toLowerCase().includes(filter))
      : allBranches;
  }, [localBranches, remoteBranches, branchFilter]);

  // Filter commits by search
  const filteredCommits = useMemo(() => {
    if (!searchFilter) return commits;
    const filter = searchFilter.toLowerCase();
    return commits.filter(
      (c) =>
        c.message.toLowerCase().includes(filter) ||
        c.hash.toLowerCase().includes(filter) ||
        c.author.toLowerCase().includes(filter)
    );
  }, [commits, searchFilter]);

  const handleBranchSelect = useCallback(
    (branch: BranchModel | null) => {
      onBranchChange?.(branch);
      setShowBranchDropdown(false);
      setBranchFilter('');
    },
    [onBranchChange]
  );

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

  // Classify a tag for badge coloring (matches Angular version)
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

  // Determine if a commit message should be expandable
  const isExpandable = useCallback((commit: CommitSummary): boolean => {
    const tags = commit.currentTags || commit.branchEndings || [];
    const tagLen = tags.reduce((sum, t) => sum + t.length, 0) + tags.length * 3;
    const firstLine = commit.message.split('\n')[0];
    const hasMultipleLines = commit.message.includes('\n');
    return hasMultipleLines || (tagLen + firstLine.length > 65);
  }, []);

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

      <BranchSelector onClick={(e) => e.stopPropagation()}>
        <SearchInput
          size="sm"
          placeholder="Search commits..."
          value={searchFilter}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearchFilter(e.target.value)
          }
        />
        
        {onBranchChange && (
          <Dropdown
            show={showBranchDropdown}
            onToggle={(open) => setShowBranchDropdown(open)}
          >
            <Dropdown.Toggle variant="secondary" size="sm">
              <Icon name="fa-code-branch" className="me-1" />
              {activeBranch?.name || 'All branches'}
            </Dropdown.Toggle>
            <Dropdown.Menu style={{ maxHeight: '300px', overflowY: 'auto' }}>
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
              <Dropdown.Item onClick={() => handleBranchSelect(null)}>
                All branches
              </Dropdown.Item>
              <Dropdown.Divider />
              {localBranches.length > 0 && (
                <>
                  <Dropdown.Header>Local</Dropdown.Header>
                  {filteredBranches
                    .filter((b) => localBranches.includes(b))
                    .map((branch) => (
                      <Dropdown.Item
                        key={branch.name}
                        active={activeBranch?.name === branch.name}
                        onClick={() => handleBranchSelect(branch)}
                      >
                        {branch.isCurrentBranch && (
                          <Icon name="fa-check" className="me-1" />
                        )}
                        {branch.name}
                      </Dropdown.Item>
                    ))}
                </>
              )}
              {remoteBranches.length > 0 && (
                <>
                  <Dropdown.Header>Remote</Dropdown.Header>
                  {filteredBranches
                    .filter((b) => remoteBranches.includes(b))
                    .map((branch) => (
                      <Dropdown.Item
                        key={branch.name}
                        active={activeBranch?.name === branch.name}
                        onClick={() => handleBranchSelect(branch)}
                      >
                        {branch.name}
                      </Dropdown.Item>
                    ))}
                </>
              )}
            </Dropdown.Menu>
          </Dropdown>
        )}
      </BranchSelector>
    </CardHeaderContent>
  );

  return (
    <LayoutCard
      title=""
      expandKey="commit-history"
      headerContent={headerContent}
      fillHeight={true}
      onScroll={onLoadMore}
    >
      {!showDiff ? (
        <CommitListContainer>
          <CommitTable hover size="sm">
            <tbody>
              {filteredCommits.map((commit, index) => {
                const isExpanded = expandedCommits.has(commit.hash);
                const expandable = isExpandable(commit);
                const tags = commit.currentTags || commit.branchEndings || [];
                const messageLines = commit.message.split('\n');
                const firstLine = messageLines[0];
                const restLines = messageLines.slice(1).join('\n').trim();
                // prevCommit is newer (above in the list), nextCommit is older (below)
                const prevCommit = index > 0 ? filteredCommits[index - 1] : null;
                const nextCommit = index < filteredCommits.length - 1 ? filteredCommits[index + 1] : null;

                return (
                  <tr key={commit.hash} onClick={() => onClickCommit(commit.hash)}>
                    <GraphCell>
                      {enableGraphView ? (
                        <GitGraphCanvas 
                          commit={commit} 
                          prevCommit={prevCommit}
                          nextCommit={nextCommit}
                          rowHeight={ROW_HEIGHT} 
                        />
                      ) : (
                        <div
                          style={{
                            width: '20px',
                            display: 'flex',
                            justifyContent: 'center',
                          }}
                        >
                          <div
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: theme.colors.primary,
                            }}
                          />
                        </div>
                      )}
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
                            {tags.map((tag) => {
                              const tagType = getTagType(tag);
                              const icon = getTagIcon(tag);
                              return (
                                <TagBadge key={tag} $tagType={tagType}>
                                  {icon && <Icon name={icon} size="sm" className="me-1" />}
                                  {getTagLabel(tag)}
                                </TagBadge>
                              );
                            })}
                            {firstLine}
                          </MessageFirstLine>
                          {isExpanded && restLines && (
                            <MessageBody>{restLines}</MessageBody>
                          )}
                        </MessageContent>
                        {expandable && (
                          <CopyMessageButton
                            onClick={(e) => copyMessage(commit.message, e)}
                            title="Copy full message"
                          >
                            <Icon name="fa-copy" size="sm" />
                          </CopyMessageButton>
                        )}
                      </MessageRow>
                      <CommitMeta>
                        <CommitHash>{commit.hash.substring(0, 7)}</CommitHash>
                        <span>{commit.author}</span>
                        <AgeInfo date={commit.date} />
                      </CommitMeta>
                    </MessageCell>
                    <ActionsCell onClick={(e) => e.stopPropagation()}>
                      <Dropdown align="end">
                        <Dropdown.Toggle variant="outline-secondary" size="sm" id={`commit-actions-${commit.hash}`}>
                          <Icon name="fa-ellipsis-h" size="sm" />
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => onClickCommit(commit.hash)}>
                            <Icon name="fa-eye" size="sm" className="me-2" />
                            View Diff
                          </Dropdown.Item>
                          <Dropdown.Divider />
                          <Dropdown.Item onClick={() => onCherryPick(commit)}>
                            <Icon name="fa-code-branch" size="sm" className="me-2" />
                            Cherry Pick
                          </Dropdown.Item>
                          <Dropdown.Item onClick={() => onCheckout(commit.hash)}>
                            <Icon name="fa-sign-in-alt" size="sm" className="me-2" />
                            Checkout
                          </Dropdown.Item>
                          {onRevert && (
                            <Dropdown.Item onClick={() => onRevert(commit)}>
                              <Icon name="fa-undo" size="sm" className="me-2" />
                              Revert Commit
                            </Dropdown.Item>
                          )}
                          {onCreateBranchFromCommit && (
                            <Dropdown.Item onClick={() => onCreateBranchFromCommit(commit)}>
                              <Icon name="fa-plus" size="sm" className="me-2" />
                              Create Branch from Here
                            </Dropdown.Item>
                          )}
                          <Dropdown.Divider />
                          {onCopyHash && (
                            <Dropdown.Item onClick={() => onCopyHash(commit.hash)}>
                              <Icon name="fa-copy" size="sm" className="me-2" />
                              Copy Hash
                            </Dropdown.Item>
                          )}
                          {onResetToCommit && (
                            <>
                              <Dropdown.Divider />
                              <Dropdown.Header>Reset to this commit</Dropdown.Header>
                              <Dropdown.Item onClick={() => onResetToCommit(commit, 'soft')}>
                                <Icon name="fa-arrow-left" size="sm" className="me-2" />
                                Soft Reset
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => onResetToCommit(commit, 'mixed')}>
                                <Icon name="fa-arrow-left" size="sm" className="me-2" />
                                Mixed Reset
                              </Dropdown.Item>
                              <Dropdown.Item className="text-danger" onClick={() => onResetToCommit(commit, 'hard')}>
                                <Icon name="fa-exclamation-triangle" size="sm" className="me-2" />
                                Hard Reset
                              </Dropdown.Item>
                            </>
                          )}
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
              onIgnoreWhitespaceClick={onIgnoreWhitespaceChange ? () => onIgnoreWhitespaceChange(!ignoreWhitespace) : undefined}
              onExitCommitView={() => onToggleView(false)}
              onNavigateToHash={onClickCommit}
              onHunkChange={onHunkChange}
              onHunkChangeError={onHunkChangeError}
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
