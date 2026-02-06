import React, { useState, useMemo, useCallback } from 'react';
import { Button, ButtonGroup, Dropdown, Form, Table, DropdownButton } from 'react-bootstrap';
import styled, { useTheme } from 'styled-components';
import { LayoutCard } from '../../LayoutCard/LayoutCard';
import { AgeInfo, Icon, GitGraphCanvas } from '../../../common/components';
import { CardHeaderContent } from '../RepoView.styles';
import { DiffViewer } from '../../DiffViewer/DiffViewer';

const CommitListContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
`;

const ROW_HEIGHT = 44;

const CommitTable = styled(Table)`
  margin-bottom: 0;
  border-collapse: separate;
  border-spacing: 0;
  
  tbody tr {
    cursor: pointer;
    height: ${ROW_HEIGHT}px;
    
    &:hover {
      background-color: ${({ theme }) => theme.colors.light};
    }
  }
  
  td {
    vertical-align: middle;
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
`;

const MessageCell = styled.td`
  max-width: 300px;
`;

const CommitMessage = styled.div<{ $expanded?: boolean }>`
  font-weight: 500;
  ${({ $expanded }) =>
    !$expanded &&
    `
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `}
`;

const CommitMeta = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.secondary};
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const CommitHash = styled.span`
  font-family: ${({ theme }) => theme.fonts.monospace};
`;

const BranchBadge = styled.span`
  background-color: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.7rem;
  margin-right: 0.25rem;
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

  const toggleExpand = useCallback((hash: string) => {
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
                const hasMultipleLines = commit.message.includes('\n');
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
                      <CommitMessage $expanded={isExpanded}>
                        {commit.branchEndings?.map((branch) => (
                          <BranchBadge key={branch}>{branch}</BranchBadge>
                        ))}
                        {isExpanded ? commit.message : commit.message.split('\n')[0]}
                      </CommitMessage>
                      <CommitMeta>
                        <CommitHash>{commit.hash.substring(0, 7)}</CommitHash>
                        <span>{commit.author}</span>
                        <AgeInfo date={commit.date} />
                        {hasMultipleLines && (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(commit.hash);
                            }}
                          >
                            <Icon
                              name={isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}
                              size="sm"
                            />
                          </Button>
                        )}
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
        <div style={{ flex: 1, overflow: 'auto' }}>
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
