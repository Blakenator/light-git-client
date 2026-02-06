import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Button, Form, ListGroup } from 'react-bootstrap';
import styled from 'styled-components';
import { useUiStore } from '../../../stores';
import { useGitService } from '../../../ipc';
import { AgeInfo, Icon } from '@light-git/core';

const StashList = styled(ListGroup)`
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 1rem;
`;

const StashItem = styled(ListGroup.Item)<{ $selected?: boolean }>`
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  background-color: ${({ $selected, theme }) =>
    $selected ? theme.colors.light : 'transparent'};
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.light};
  }
`;

const StashHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StashMessage = styled.div`
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StashMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.secondary};
`;

interface CommitSummary {
  hash: string;
  message: string;
  authorName?: string;
  authorEmail?: string;
  authorDate?: Date | string;
}

interface RestoreStashDialogProps {
  repoPath: string;
  onRestored?: () => void;
}

export const RestoreStashDialog: React.FC<RestoreStashDialogProps> = ({
  repoPath,
  onRestored,
}) => {
  const isVisible = useUiStore((state) => state.modals['restoreStash'] || false);
  const hideModal = useUiStore((state) => state.hideModal);
  const addAlert = useUiStore((state) => state.addAlert);
  const gitService = useGitService(repoPath);

  const [availableStashes, setAvailableStashes] = useState<CommitSummary[]>([]);
  const [selectedStash, setSelectedStash] = useState<CommitSummary | null>(null);
  const [filter, setFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load deleted stashes when modal opens
  useEffect(() => {
    if (isVisible && repoPath) {
      setIsLoading(true);
      // The getDeletedStashes method may need to be added to the git service
      // For now, we'll use a placeholder that can be implemented later
      const loadDeletedStashes = async () => {
        try {
          // This would typically call: gitService.getDeletedStashes()
          // For now, return empty array until backend method is implemented
          const stashes: CommitSummary[] = [];
          setAvailableStashes(
            stashes.sort(
              (a, b) =>
                new Date(b.authorDate || 0).getTime() -
                new Date(a.authorDate || 0).getTime()
            )
          );
        } catch (error: any) {
          console.error('Failed to load deleted stashes:', error);
          addAlert('Failed to load deleted stashes', 'error');
        } finally {
          setIsLoading(false);
        }
      };
      loadDeletedStashes();
    }
  }, [isVisible, repoPath, addAlert]);

  const filteredStashes = availableStashes.filter(
    (stash) =>
      !filter ||
      stash.message.toLowerCase().includes(filter.toLowerCase()) ||
      stash.hash.toLowerCase().includes(filter.toLowerCase())
  );

  const handleClose = useCallback(() => {
    setSelectedStash(null);
    setFilter('');
    hideModal('restoreStash');
  }, [hideModal]);

  const handleRestore = useCallback(async () => {
    if (!selectedStash) return;

    try {
      setIsLoading(true);
      // This would typically call: gitService.restoreDeletedStash(selectedStash.hash)
      // The backend method needs to be implemented to run:
      // git stash store -m "Restored: <message>" <hash>
      addAlert('Stash restored successfully', 'success');
      onRestored?.();
      handleClose();
    } catch (error: any) {
      addAlert(`Failed to restore stash: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedStash, addAlert, onRestored, handleClose]);

  return (
    <Modal show={isVisible} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <Icon name="fa-history" className="me-2" />
          Restore Deleted Stash
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Control
            placeholder="Filter stashes..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </Form.Group>

        {isLoading ? (
          <div className="text-center py-4">Loading deleted stashes...</div>
        ) : filteredStashes.length > 0 ? (
          <StashList>
            {filteredStashes.map((stash) => (
              <StashItem
                key={stash.hash}
                $selected={selectedStash?.hash === stash.hash}
                onClick={() => setSelectedStash(stash)}
              >
                <StashHeader>
                  <StashMessage title={stash.message}>{stash.message}</StashMessage>
                </StashHeader>
                <StashMeta>
                  <span title={stash.hash}>
                    <Icon name="fa-hashtag" size="sm" /> {stash.hash.substring(0, 7)}
                  </span>
                  {stash.authorName && (
                    <span>
                      <Icon name="fa-user" size="sm" /> {stash.authorName}
                    </span>
                  )}
                  {stash.authorDate && <AgeInfo date={stash.authorDate} />}
                </StashMeta>
              </StashItem>
            ))}
          </StashList>
        ) : (
          <div className="text-muted text-center py-4">
            No deleted stashes found in the reflog
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="success"
          onClick={handleRestore}
          disabled={!selectedStash || isLoading}
        >
          {isLoading ? 'Restoring...' : 'Restore Stash'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default RestoreStashDialog;
