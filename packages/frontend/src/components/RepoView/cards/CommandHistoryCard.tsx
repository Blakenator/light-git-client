import React, { useState, useMemo, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { Modal as BsModal, Card as BsCard, Button } from 'react-bootstrap';
import { LayoutCard } from '../../LayoutCard/LayoutCard';
import { Icon } from '@light-git/core';
import { CardHeaderContent, CardFilterInput } from '../RepoView.styles';
import { useUiStore } from '../../../stores';

// ==================== Styled Components ====================

const CommandListContainer = styled.div``;

const CommandItem = styled.div<{ $success: boolean }>`
  padding: 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-family: ${({ theme }) => theme.fonts.monospace};
  font-size: 0.8rem;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: ${({ theme }) => theme.colors.light};
  }
`;

const CommandHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatusIcon = styled.span<{ $success: boolean }>`
  color: ${({ $success }) =>
    $success ? 'rgba(128, 225, 128, 0.7)' : 'rgba(225, 128, 128, 0.7)'};
`;

const CommandNameInfo = styled.span`
  flex: 1;
  min-width: 0;
`;

const ViewButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.125rem 0.375rem;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  background: transparent;
  color: ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.borderRadius};
  cursor: pointer;
  font-size: 0.75rem;
  flex-shrink: 0;

  &:hover {
    background-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.white};
  }
`;

const CommandText = styled.pre`
  background-color: rgba(128, 128, 128, 0.2);
  border-radius: 0.5em;
  padding: 0.5em;
  margin: 0.25rem 0 0 0;
  word-break: break-all;
  white-space: pre-wrap;
`;

const InlineOutputLabel = styled.div`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.secondary};
  margin-top: 0.25rem;
`;

const InlineOutput = styled.pre`
  background-color: rgba(128, 128, 128, 0.2);
  border-radius: 0.5em;
  padding: 0.5em;
  margin: 0 0 0 0;
  max-height: 6em;
  overflow-y: hidden;
  transition: max-height 0.5s;
  word-break: break-all;
  white-space: pre-wrap;
  font-size: 0.75rem;

  &:hover {
    max-height: 20em;
    overflow-y: auto;
  }
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

const Separator = styled.hr`
  margin: 0.5rem 0 0 0;
  border-color: ${({ theme }) => theme.colors.border};
`;

// Modal styled components
const ModalCardHeader = styled(BsCard.Header)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ModalPre = styled.pre`
  background-color: rgba(128, 128, 128, 0.2);
  border-radius: 0.5em;
  padding: 0.5em;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
`;

const CopyButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.125rem 0.375rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.light};
  border-radius: ${({ theme }) => theme.borderRadius};
  cursor: pointer;
  font-size: 0.75rem;

  &:hover {
    background-color: ${({ theme }) => theme.colors.border};
  }
`;

// ==================== Helpers ====================

function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text: string) {
  const textarea = document.createElement('textarea');
  textarea.style.position = 'fixed';
  textarea.style.left = '0';
  textarea.style.top = '0';
  textarea.style.opacity = '0';
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function fuzzyFilter(needle: string, haystack: string): boolean {
  let searchIndex = 0;
  for (let i = 0; i < haystack.length && searchIndex < needle.length; i++) {
    if (haystack[i] === needle[searchIndex]) {
      searchIndex++;
    }
  }
  return searchIndex === needle.length;
}

function formatMediumTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ==================== Types ====================

interface CommandHistoryModel {
  name?: string;
  command: string;
  output?: string;
  errorOutput?: string;
  executedAt?: Date | string | number;
  isError?: boolean;
  durationMs?: number;
  // Frontend field names (for compatibility)
  success?: boolean;
  timestamp?: Date | string | number;
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

// ==================== Modal Sub-component ====================

const COMMAND_VIEWER_MODAL_ID = 'commandViewerModal';

const CommandViewerModal: React.FC<{ command: CommandHistoryModel | null; onClose: () => void }> = ({
  command,
  onClose,
}) => {
  const isVisible = useUiStore((state) => state.modals[COMMAND_VIEWER_MODAL_ID] || false);
  const hideModal = useUiStore((state) => state.hideModal);

  const handleClose = useCallback(() => {
    hideModal(COMMAND_VIEWER_MODAL_ID);
    onClose();
  }, [hideModal, onClose]);

  if (!command) return null;

  const isSuccess = command.isError !== undefined ? !command.isError : !!command.success;

  return (
    <BsModal show={isVisible} onHide={handleClose} size="lg" centered className="command-viewer-modal">
      <BsModal.Header closeButton>
        <BsModal.Title>
          Command Output: {command.name || 'Command'}
        </BsModal.Title>
      </BsModal.Header>
      <BsModal.Body>
        {/* Command Card */}
        <BsCard className="mb-3">
          <ModalCardHeader>
            <span>Command</span>
            {isSuccess ? (
              <span className="badge bg-success d-inline-flex align-items-center gap-1 px-2">
                <Icon name="fa-check-circle" size="sm" />
                <span>Success</span>
              </span>
            ) : (
              <span className="badge bg-danger d-inline-flex align-items-center gap-1 px-2">
                <Icon name="fa-exclamation-triangle" size="sm" />
                <span>Error</span>
              </span>
            )}
            <span className="flex-grow-1" />
            <CopyButton onClick={() => copyToClipboard(command.command)} title="Copy command">
              <Icon name="fa-copy" size="sm" />
            </CopyButton>
          </ModalCardHeader>
          <BsCard.Body className="p-3">
            <ModalPre>$ {command.command}</ModalPre>
          </BsCard.Body>
        </BsCard>

        {/* Standard Output Card */}
        <BsCard className="mb-3">
          <ModalCardHeader>
            <Icon name="fa-check-circle" size="sm" />
            <span>Standard Output</span>
            <span className="flex-grow-1" />
            {command.output?.trim() && (
              <CopyButton onClick={() => copyToClipboard(command.output!)} title="Copy output">
                <Icon name="fa-copy" size="sm" />
              </CopyButton>
            )}
          </ModalCardHeader>
          <BsCard.Body className="p-3">
            {command.output?.trim() ? (
              <ModalPre>{command.output.trim()}</ModalPre>
            ) : (
              <i className="p-2">No standard output</i>
            )}
          </BsCard.Body>
        </BsCard>

        {/* Error Output Card */}
        <BsCard>
          <ModalCardHeader>
            <Icon name="fa-exclamation-triangle" size="sm" />
            <span>Error Output</span>
            <span className="flex-grow-1" />
            {command.errorOutput?.trim() && (
              <CopyButton onClick={() => copyToClipboard(command.errorOutput!)} title="Copy error output">
                <Icon name="fa-copy" size="sm" />
              </CopyButton>
            )}
          </ModalCardHeader>
          <BsCard.Body className="p-3">
            {command.errorOutput?.trim() ? (
              <ModalPre>{command.errorOutput.trim()}</ModalPre>
            ) : (
              <i className="p-2">No error output</i>
            )}
          </BsCard.Body>
        </BsCard>
      </BsModal.Body>
      <BsModal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </BsModal.Footer>
    </BsModal>
  );
};

// ==================== Main Component ====================

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
  const [activeCommand, setActiveCommand] = useState<CommandHistoryModel | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const showModal = useUiStore((state) => state.showModal);

  const filteredHistory = useMemo(() => {
    let items = commandHistory;
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      items = items.filter((c) => {
        const filterableText = ((c.name || '') + c.command).toLowerCase();
        return fuzzyFilter(lowerFilter, filterableText);
      });
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
          setVisibleCount((prev) => Math.min(prev + pageSize, maxVisible));
        } else if (onLoadMore) {
          onLoadMore();
        }
      }
    },
    [isLoading, canLoadMore, visibleCount, commandHistory.length, pageSize, maxVisible, onLoadMore]
  );

  const handleShowDetails = useCallback((cmd: CommandHistoryModel) => {
    setActiveCommand(cmd);
    showModal(COMMAND_VIEWER_MODAL_ID);
  }, [showModal]);

  const handleCloseModal = useCallback(() => {
    setActiveCommand(null);
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
          const date = cmd.executedAt ?? cmd.timestamp;
          const isSuccess = cmd.isError !== undefined ? !cmd.isError : !!cmd.success;
          const duration = cmd.durationMs ?? cmd.duration;
          const outputText = (cmd.errorOutput || cmd.output || '').trim();
          const dateObj = date ? new Date(date as string | number | Date) : null;

          return (
            <div key={`${date}-${index}`}>
              <CommandItem $success={isSuccess}>
                {/* Header row: icon, name/duration/time, view button */}
                <CommandHeader>
                  <StatusIcon $success={isSuccess}>
                    <Icon
                      name={isSuccess ? 'fa-check-circle' : 'fa-exclamation-triangle'}
                      size="sm"
                    />
                  </StatusIcon>
                  <CommandNameInfo>
                    <span>
                      <i>{cmd.name || 'Command'}</i>
                      {' '}({duration !== undefined ? `${duration} ms` : '?'}
                      {dateObj && !isNaN(dateObj.getTime()) && (
                        <> @ {formatMediumTime(dateObj)}</>
                      )}
                      )
                    </span>
                  </CommandNameInfo>
                  <ViewButton
                    onClick={() => handleShowDetails(cmd)}
                    title="View command in modal"
                  >
                    <Icon name="fa-eye" size="sm" />
                  </ViewButton>
                </CommandHeader>

                {/* Command text */}
                <CommandText>$ {cmd.command}</CommandText>

                {/* Inline output preview (first 1000 chars) */}
                {outputText && (
                  <>
                    <InlineOutputLabel>Output Characters 0-1000:</InlineOutputLabel>
                    <InlineOutput>{outputText.substring(0, 1000)}</InlineOutput>
                  </>
                )}

                <Separator />
              </CommandItem>
            </div>
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

      <CommandViewerModal command={activeCommand} onClose={handleCloseModal} />
    </LayoutCard>
  );
});

CommandHistoryCard.displayName = 'CommandHistoryCard';

export default CommandHistoryCard;
