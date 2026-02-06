import React, { useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { Button, ButtonGroup, Form } from 'react-bootstrap';
import { AgeInfo, Icon } from '@light-git/core';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  padding: 0.5rem;
  gap: 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const CommitList = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const CommitRow = styled.div`
  display: flex;
  padding: 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.colors.light};
  }
`;

const GraphColumn = styled.div`
  width: 40px;
  flex-shrink: 0;
  position: relative;
`;

const CommitDot = styled.div<{ color?: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${({ color, theme }) => color || theme.colors.primary};
  position: absolute;
  left: 50%;
  top: 8px;
  transform: translateX(-50%);
`;

const ContentColumn = styled.div`
  flex: 1;
  min-width: 0;
`;

const Message = styled.div`
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Meta = styled.div`
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.secondary};
`;

const Hash = styled.span`
  font-family: ${({ theme }) => theme.fonts.monospace};
`;

const BranchLabel = styled.span<{ variant: 'local' | 'remote' }>`
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.7rem;
  background-color: ${({ variant, theme }) =>
    variant === 'local' ? theme.colors.alertSuccessBg : theme.colors.alertInfoBg};
  color: ${({ variant, theme }) => (variant === 'local' ? theme.colors.alertSuccessText : theme.colors.alertInfoText)};
`;

export interface CommitSummaryModel {
  hash: string;
  message: string;
  author: string;
  date: Date | string | number;
  parents?: string[];
  branches?: { name: string; isRemote: boolean }[];
}

export interface BranchModel {
  name: string;
  isRemote?: boolean;
  isCurrentBranch?: boolean;
}

interface CommitHistoryProps {
  commits: CommitSummaryModel[];
  localBranches?: BranchModel[];
  remoteBranches?: BranchModel[];
  activeBranch?: BranchModel | null;
  filter?: string;
  onFilterChange?: (filter: string) => void;
  onCommitClick: (hash: string) => void;
  onCherryPick: (commit: CommitSummaryModel) => void;
  onCheckout: (hash: string) => void;
  onChooseBranch?: (branch: BranchModel) => void;
  onLoadMore: () => void;
}

export const CommitHistory: React.FC<CommitHistoryProps> = ({
  commits,
  localBranches = [],
  remoteBranches = [],
  activeBranch,
  filter = '',
  onFilterChange,
  onCommitClick,
  onCherryPick,
  onCheckout,
  onChooseBranch,
  onLoadMore,
}) => {
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      const isAtBottom =
        target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
      if (isAtBottom) {
        onLoadMore();
      }
    },
    [onLoadMore]
  );

  const filteredCommits = useMemo(() => {
    if (!filter) return commits;
    const lowerFilter = filter.toLowerCase();
    return commits.filter(
      (c) =>
        c.message.toLowerCase().includes(lowerFilter) ||
        c.hash.toLowerCase().includes(lowerFilter) ||
        c.author.toLowerCase().includes(lowerFilter)
    );
  }, [commits, filter]);

  return (
    <Container>
      <Header>
        {onFilterChange && (
          <Form.Control
            type="text"
            placeholder="Filter commits..."
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            size="sm"
            style={{ maxWidth: '200px' }}
          />
        )}
        {onChooseBranch && (
          <Form.Select
            size="sm"
            value={activeBranch?.name || ''}
            onChange={(e) => {
              const branch =
                localBranches.find((b) => b.name === e.target.value) ||
                remoteBranches.find((b) => b.name === e.target.value);
              if (branch) onChooseBranch(branch);
            }}
            style={{ maxWidth: '200px' }}
          >
            <option value="">All branches</option>
            <optgroup label="Local">
              {localBranches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Remote">
              {remoteBranches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </optgroup>
          </Form.Select>
        )}
      </Header>
      <CommitList onScroll={handleScroll}>
        {filteredCommits.map((commit) => (
          <CommitItem
            key={commit.hash}
            commit={commit}
            onClick={() => onCommitClick(commit.hash)}
            onCherryPick={() => onCherryPick(commit)}
            onCheckout={() => onCheckout(commit.hash)}
          />
        ))}
        {filteredCommits.length === 0 && (
          <div className="text-muted text-center py-4">No commits found</div>
        )}
      </CommitList>
    </Container>
  );
};

interface CommitItemProps {
  commit: CommitSummaryModel;
  onClick: () => void;
  onCherryPick: () => void;
  onCheckout: () => void;
}

const CommitItem: React.FC<CommitItemProps> = ({
  commit,
  onClick,
  onCherryPick,
  onCheckout,
}) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <CommitRow
      onClick={onClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <GraphColumn>
        <CommitDot />
      </GraphColumn>
      <ContentColumn>
        <Message title={commit.message}>{commit.message}</Message>
        <Meta>
          <Hash>{commit.hash.substring(0, 7)}</Hash>
          <span>{commit.author}</span>
          <AgeInfo date={commit.date} />
          {commit.branches?.map((branch) => (
            <BranchLabel
              key={branch.name}
              variant={branch.isRemote ? 'remote' : 'local'}
            >
              {branch.name}
            </BranchLabel>
          ))}
        </Meta>
      </ContentColumn>
      {showActions && (
        <ButtonGroup size="sm">
          <Button
            variant="outline-success"
            onClick={(e) => {
              e.stopPropagation();
              onCherryPick();
            }}
            title="Cherry pick"
          >
            <Icon name="fa-code-branch" size="sm" />
          </Button>
          <Button
            variant="outline-primary"
            onClick={(e) => {
              e.stopPropagation();
              onCheckout();
            }}
            title="Checkout"
          >
            <Icon name="fa-sign-in-alt" size="sm" />
          </Button>
        </ButtonGroup>
      )}
    </CommitRow>
  );
};

export default CommitHistory;
