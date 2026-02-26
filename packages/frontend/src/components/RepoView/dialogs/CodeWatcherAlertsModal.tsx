import React, { useState, useMemo, useCallback } from 'react';
import { Modal, Button, Form, Badge, Accordion, Card } from 'react-bootstrap';
import styled from 'styled-components';
import { useUiStore } from '../../../stores';
import { Icon } from '@light-git/core';
import { ReadOnlyHunkView } from '../../DiffViewer/ReadOnlyHunkView';
import type { WatcherAlert } from '@light-git/shared';

const AlertContainer = styled.div`
  max-height: 500px;
  overflow-y: auto;
`;

const FileSection = styled(Card)`
  margin-bottom: 0.5rem;
  
  .card-header {
    padding: 0.5rem 1rem;
    cursor: pointer;
    
    &:hover {
      background-color: ${({ theme }) => theme.colors.light};
    }
  }
`;

const HunkViewWrapper = styled.div`
  font-family: ${({ theme }) => theme.fonts.monospace};
  font-size: 0.75rem;
  border-radius: 4px;
  margin: 0.5rem 0;
  overflow-x: auto;
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const WatcherBadge = styled(Badge)`
  margin-right: 0.25rem;
  margin-bottom: 0.25rem;
`;

const LineNumbers = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.secondary};
  margin-left: 0.5rem;
`;

interface CodeWatcherAlertsModalProps {
  alerts: WatcherAlert[];
  isCommit?: boolean;
  onCommit?: () => void;
  onCancel?: () => void;
}

export const CodeWatcherAlertsModal: React.FC<CodeWatcherAlertsModalProps> = ({
  alerts,
  isCommit = false,
  onCommit,
  onCancel,
}) => {
  const isVisible = useUiStore((state) => state.modals['codeWatcher'] || false);
  const hideModal = useUiStore((state) => state.hideModal);
  const [filter, setFilter] = useState('');

  const handleClose = useCallback(() => {
    hideModal('codeWatcher');
    onCancel?.();
  }, [hideModal, onCancel]);

  const handleCommitAnyway = useCallback(() => {
    onCommit?.();
    hideModal('codeWatcher');
  }, [onCommit, hideModal]);

  const filteredAlerts = useMemo(() =>
    alerts.filter(
      (alert) =>
        !filter ||
        alert.file.toLowerCase().includes(filter.toLowerCase()) ||
        alert.hunks.some((h) =>
          h.watchers.some((w) => w.name.toLowerCase().includes(filter.toLowerCase()))
        )
    ),
    [alerts, filter],
  );

  const totalWatchers = useMemo(() =>
    alerts.reduce(
      (sum, alert) =>
        sum + alert.hunks.reduce((hSum, h) => hSum + h.watchers.length, 0),
      0
    ),
    [alerts],
  );

  return (
    <Modal show={isVisible} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <Icon name="fa-glasses" className="me-2" />
          Code Watcher Alerts
          <Badge bg="warning" className="ms-2">{totalWatchers}</Badge>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Control
            placeholder="Filter by file or watcher name..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </Form.Group>

        <AlertContainer>
          {filteredAlerts.length > 0 ? (
            <Accordion>
              {filteredAlerts.map((alert, fileIndex) => (
                <FileSection key={alert.file}>
                  <Accordion.Item eventKey={String(fileIndex)}>
                    <Accordion.Header>
                      <span className="flex-grow-1">{alert.file}</span>
                      <Badge bg="secondary" className="me-2">
                        {alert.hunks.reduce((sum, h) => sum + h.watchers.length, 0)} alerts
                      </Badge>
                    </Accordion.Header>
                    <Accordion.Body>
                      {alert.hunks.map((hunkData, hunkIndex) => (
                        <div key={hunkIndex} className="mb-3">
                          <div className="mb-2">
                            {hunkData.watchers.map((watcher, wIndex) => (
                              <WatcherBadge
                                key={wIndex}
                                bg={
                                  watcher.severity === 'error'
                                    ? 'danger'
                                    : watcher.severity === 'warning'
                                    ? 'warning'
                                    : 'info'
                                }
                              >
                                {watcher.name}
                              </WatcherBadge>
                            ))}
                            {hunkData.matchingLines && hunkData.matchingLines.length > 0 && (
                              <LineNumbers>
                                Lines: {hunkData.matchingLines.join(', ')}
                              </LineNumbers>
                            )}
                          </div>
                          {hunkData.watchers[0]?.message && (
                            <div className="text-muted small mb-2">
                              {hunkData.watchers[0].message}
                            </div>
                          )}
                          <HunkViewWrapper>
                            <ReadOnlyHunkView
                              hunk={hunkData.hunk}
                              filename={alert.file}
                              highlightedLineNumbers={
                                hunkData.matchingLines && hunkData.matchingLines.length > 0
                                  ? new Set(hunkData.matchingLines)
                                  : undefined
                              }
                            />
                          </HunkViewWrapper>
                        </div>
                      ))}
                    </Accordion.Body>
                  </Accordion.Item>
                </FileSection>
              ))}
            </Accordion>
          ) : (
            <div className="text-muted text-center py-4">
              No code watcher alerts
            </div>
          )}
        </AlertContainer>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        {isCommit && (
          <Button variant="warning" onClick={handleCommitAnyway}>
            <Icon name="fa-exclamation-triangle" className="me-1" />
            Commit Anyway
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default CodeWatcherAlertsModal;
