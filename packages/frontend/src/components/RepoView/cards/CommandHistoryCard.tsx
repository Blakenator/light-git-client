import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { LayoutCard } from '../../LayoutCard/LayoutCard';
import { AgeInfo, Icon } from '@light-git/core';
import { CardHeaderContent, CardFilterInput } from '../RepoView.styles';

const CommandListContainer = styled.div`
  max-height: 300px;
  overflow-y: auto;
`;

const CommandItem = styled.div<{ $success: boolean; $expanded?: boolean }>`
  padding: 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-family: ${({ theme }) => theme.fonts.monospace};
  font-size: 0.8rem;
  cursor: ${({ $expanded }) => ($expanded ? 'auto' : 'pointer')};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: ${({ theme }) => theme.colors.light};
  }
`;

const CommandText = styled.div`
  color: ${({ theme }) => theme.colors.text};
  word-break: break-all;
`;

const CommandOutput = styled.pre`
  background-color: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 0.5rem;
  margin: 0.5rem 0 0 0;
  max-height: 200px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 0.75rem;
`;

const CommandMeta = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.secondary};
  margin-top: 0.25rem;
`;

const StatusBadge = styled.span<{ $success: boolean }>`
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.7rem;
  background-color: ${({ $success, theme }) => ($success ? theme.colors.alertSuccessBg : theme.colors.alertDangerBg)};
  color: ${({ $success, theme }) => ($success ? theme.colors.alertSuccessText : theme.colors.alertDangerText)};
`;

const LoadMoreButton = styled.button`
  width: 100%;
  padding: 0.5rem;
  border: none;
  background-color: ${({ theme }) => theme.colors.light};
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.colors.border};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const LoadingIndicator = styled.div`
  text-align: center;
  padding: 0.5rem;
  color: ${({ theme }) => theme.colors.secondary};
`;

interface CommandHistoryModel {
  command: string;
  output?: string;
  success: boolean;
  timestamp: Date | string | number;
  duration?: number;
}

interface CommandHistoryCardProps {
  commandHistory: CommandHistoryModel[];
  maxVisible?: number;
  pageSize?: number;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export const CommandHistoryCard: React.FC<CommandHistoryCardProps> = React.memo(({
  commandHistory,
  maxVisible = 50,
  pageSize = 20,
  isLoading = false,
  hasMore = false,
  onLoadMore,
}) => {
  const [filter, setFilter] = useState('');
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredHistory = useMemo(() => {
    let items = commandHistory;
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      items = items.filter(
        (c) =>
          c.command.toLowerCase().includes(lowerFilter) ||
          (c.output && c.output.toLowerCase().includes(lowerFilter))
      );
    }
    return items.slice(0, Math.min(visibleCount, maxVisible));
  }, [commandHistory, filter, visibleCount, maxVisible]);

  const canLoadMore = visibleCount < commandHistory.length || hasMore;

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const bottom =
        target.scrollHeight - target.scrollTop <= target.clientHeight + 50;

      if (bottom && !isLoading && canLoadMore) {
        if (visibleCount < commandHistory.length) {
          // Load more from local data
          setVisibleCount((prev) => Math.min(prev + pageSize, maxVisible));
        } else if (onLoadMore) {
          // Request more data from backend
          onLoadMore();
        }
      }
    },
    [isLoading, canLoadMore, visibleCount, commandHistory.length, pageSize, maxVisible, onLoadMore]
  );

  const toggleExpand = useCallback((index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleLoadMoreClick = useCallback(() => {
    if (visibleCount < commandHistory.length) {
      setVisibleCount((prev) => Math.min(prev + pageSize, maxVisible));
    } else if (onLoadMore) {
      onLoadMore();
    }
  }, [visibleCount, commandHistory.length, pageSize, maxVisible, onLoadMore]);

  const headerContent = (
    <CardHeaderContent>
      <CardFilterInput
        placeholder="Filter..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        onClick={(e) => e.stopPropagation()}
      />
    </CardHeaderContent>
  );

  return (
    <LayoutCard
      title="Command History"
      iconClass="fa fa-history"
      expandKey="command-history"
      headerContent={headerContent}
    >
      <CommandListContainer ref={containerRef} onScroll={handleScroll}>
        {filteredHistory.map((cmd, index) => {
          const isExpanded = expandedItems.has(index);
          return (
            <CommandItem
              key={`${cmd.timestamp}-${index}`}
              $success={cmd.success}
              $expanded={isExpanded}
              onClick={() => cmd.output && toggleExpand(index)}
            >
              <CommandText>
                {cmd.output && (
                  <Icon
                    name={isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'}
                    size="sm"
                    className="me-1"
                  />
                )}
                $ {cmd.command}
              </CommandText>
              {isExpanded && cmd.output && (
                <CommandOutput>{cmd.output}</CommandOutput>
              )}
              <CommandMeta>
                <AgeInfo date={cmd.timestamp} />
                <div>
                  <StatusBadge $success={cmd.success}>
                    {cmd.success ? 'OK' : 'FAILED'}
                  </StatusBadge>
                  {cmd.duration !== undefined && (
                    <span className="ms-2">{cmd.duration}ms</span>
                  )}
                </div>
              </CommandMeta>
            </CommandItem>
          );
        })}

        {isLoading && (
          <LoadingIndicator>
            <Icon name="fa-spinner" className="fa-spin me-1" />
            Loading more...
          </LoadingIndicator>
        )}

        {!isLoading && canLoadMore && filteredHistory.length > 0 && (
          <LoadMoreButton onClick={handleLoadMoreClick}>
            Load More ({commandHistory.length - visibleCount} remaining)
          </LoadMoreButton>
        )}

        {filteredHistory.length === 0 && (
          <div className="text-muted text-center py-3">
            {filter ? 'No matching commands' : 'No commands in history'}
          </div>
        )}
      </CommandListContainer>
    </LayoutCard>
  );
});

CommandHistoryCard.displayName = 'CommandHistoryCard';

export default CommandHistoryCard;
