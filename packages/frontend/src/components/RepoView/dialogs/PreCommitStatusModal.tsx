import React, { useCallback } from 'react';
import { Modal, Button, ListGroup, Badge } from 'react-bootstrap';
import styled from 'styled-components';
import { useUiStore } from '../../../stores';
import { Icon } from '@light-git/core';

const RulesList = styled(ListGroup)`
  max-height: 400px;
  overflow-y: auto;
`;

const RuleItem = styled(ListGroup.Item)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const RuleName = styled.span`
  flex: 1;
  font-weight: 500;
`;

const StatusIcon = styled.span<{ $status: 'passed' | 'failed' | 'skipped' }>`
  color: ${({ $status, theme }) => {
    switch ($status) {
      case 'passed':
        return theme.colors.success;
      case 'failed':
        return theme.colors.danger;
      case 'skipped':
        return theme.colors.secondary;
    }
  }};
`;

const NoteSection = styled.div`
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: ${({ theme }) => theme.colors.light};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: 0.875rem;
`;

enum PreCommitStatus {
  Passed = 'passed',
  Failed = 'failed',
  Skipped = 'skipped',
}

interface PreCommitStatusRule {
  name: string;
  status: PreCommitStatus;
  output?: string;
}

interface PreCommitStatusModalProps {
  rules: PreCommitStatusRule[];
  note?: string;
  onClose?: () => void;
}

export const PreCommitStatusModal: React.FC<PreCommitStatusModalProps> = ({
  rules,
  note,
  onClose,
}) => {
  const isVisible = useUiStore((state) => state.modals['preCommit'] || false);
  const hideModal = useUiStore((state) => state.hideModal);

  const handleClose = useCallback(() => {
    hideModal('preCommit');
    onClose?.();
  }, [hideModal, onClose]);

  const getStatusIcon = (status: PreCommitStatus): string => {
    switch (status) {
      case PreCommitStatus.Passed:
        return 'fa-check';
      case PreCommitStatus.Failed:
        return 'fa-times-circle';
      case PreCommitStatus.Skipped:
        return 'fa-forward';
    }
  };

  const passedCount = rules.filter((r) => r.status === PreCommitStatus.Passed).length;
  const failedCount = rules.filter((r) => r.status === PreCommitStatus.Failed).length;
  const skippedCount = rules.filter((r) => r.status === PreCommitStatus.Skipped).length;

  // Sort rules: failed first, then passed, then skipped
  const sortedRules = [...rules].sort((a, b) => {
    const order = { failed: 0, passed: 1, skipped: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <Modal show={isVisible} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <Icon name="fa-clipboard-check" className="me-2" />
          Pre-commit Hook Results
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex gap-2 mb-3">
          {failedCount > 0 && (
            <Badge bg="danger">
              <Icon name="fa-times-circle" /> {failedCount} Failed
            </Badge>
          )}
          {passedCount > 0 && (
            <Badge bg="success">
              <Icon name="fa-check" /> {passedCount} Passed
            </Badge>
          )}
          {skippedCount > 0 && (
            <Badge bg="secondary">
              <Icon name="fa-forward" /> {skippedCount} Skipped
            </Badge>
          )}
        </div>

        <RulesList>
          {sortedRules.map((rule, index) => (
            <RuleItem key={index}>
              <StatusIcon $status={rule.status}>
                <Icon name={getStatusIcon(rule.status)} />
              </StatusIcon>
              <RuleName>{rule.name}</RuleName>
              <Badge
                bg={
                  rule.status === PreCommitStatus.Passed
                    ? 'success'
                    : rule.status === PreCommitStatus.Failed
                    ? 'danger'
                    : 'secondary'
                }
              >
                {rule.status}
              </Badge>
            </RuleItem>
          ))}
        </RulesList>

        {note && (
          <NoteSection>
            <strong>Note:</strong> {note}
          </NoteSection>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={handleClose}>
          OK
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PreCommitStatusModal;
