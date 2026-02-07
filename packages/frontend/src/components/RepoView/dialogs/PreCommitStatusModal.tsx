import React, { useCallback, useMemo } from 'react';
import { Modal, Button, Accordion, Card } from 'react-bootstrap';
import styled from 'styled-components';
import { useUiStore } from '../../../stores';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  PreCommitStatus,
  PreCommitStatusRule,
} from '@light-git/shared';

const ErrorBlock = styled.pre`
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 0.4em;
  padding: 0.4em;
  margin: 0;
`;

const StatusAccordion = styled(Accordion)`
  .accordion-item {
    border: none;
    margin-bottom: 0.5rem;
    border-radius: 0.5rem !important;
    overflow: hidden;
  }
  .accordion-body {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const FailedItem = styled(Accordion.Item)`
  .accordion-button {
    background-color: rgba(220, 53, 69, 0.2);
    color: inherit;
    &:not(.collapsed) {
      background-color: rgba(220, 53, 69, 0.25);
      color: inherit;
      box-shadow: none;
    }
    &:focus { box-shadow: none; }
  }
  .accordion-body { background-color: rgba(220, 53, 69, 0.06); }
`;

const SkippedItem = styled(Accordion.Item)`
  .accordion-button {
    background-color: rgba(128, 128, 128, 0.2);
    color: inherit;
    &:not(.collapsed) {
      background-color: rgba(128, 128, 128, 0.25);
      color: inherit;
      box-shadow: none;
    }
    &:focus { box-shadow: none; }
  }
  .accordion-body { background-color: rgba(128, 128, 128, 0.06); }
`;

const PassedItem = styled(Accordion.Item)`
  .accordion-button {
    background-color: rgba(25, 135, 84, 0.2);
    color: inherit;
    &:not(.collapsed) {
      background-color: rgba(25, 135, 84, 0.25);
      color: inherit;
      box-shadow: none;
    }
    &:focus { box-shadow: none; }
  }
  .accordion-body { background-color: rgba(25, 135, 84, 0.06); }
`;

const RuleCard = styled(Card)`
  border: none;
  background-color: rgba(128, 128, 128, 0.1);
`;

export const PreCommitStatusModal: React.FC = () => {
  const status = useUiStore((state) => state.preCommitStatus);
  const hideModal = useUiStore((state) => state.hideModal);
  const setPreCommitStatus = useUiStore((state) => state.setPreCommitStatus);
  const isVisible = useUiStore((state) => state.modals['preCommit'] || false);

  const handleClose = useCallback(() => {
    hideModal('preCommit');
    setPreCommitStatus(null);
  }, [hideModal, setPreCommitStatus]);

  const groups = useMemo(() => {
    if (!status) return { failed: [], skipped: [], passed: [] };
    return {
      failed: status.rules.filter((r) => r.status === PreCommitStatus.Failed),
      skipped: status.rules.filter((r) => r.status === PreCommitStatus.Skipped),
      passed: status.rules.filter((r) => r.status === PreCommitStatus.Passed),
    };
  }, [status]);

  const defaultActiveKeys = useMemo(() => {
    const keys: string[] = [];
    if (groups.failed.length > 0) keys.push('failed');
    return keys;
  }, [groups]);

  const renderRuleCards = (rules: PreCommitStatusRule[]) =>
    rules.map((rule, i) => (
      <RuleCard key={i}>
        <Card.Body className="py-2 px-3">
          <div className="d-flex flex-row align-items-center">
            <div className="flex-grow-1 fw-medium">{rule.name}</div>
            {rule.status === PreCommitStatus.Skipped && rule.error && (
              <div className="text-muted small">{rule.error}</div>
            )}
          </div>
          {rule.error && rule.status === PreCommitStatus.Failed && (
            <ErrorBlock className="mt-2">{rule.error}</ErrorBlock>
          )}
        </Card.Body>
      </RuleCard>
    ));

  return (
    <Modal show={isVisible} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center">
          <FontAwesomeIcon icon="exclamation-triangle" className="text-danger me-2" />
          <span>A Pre-commit Error Occurred</span>
        </Modal.Title>
      </Modal.Header>
      {status && (
        <Modal.Body>
          {status.note && (
            <ErrorBlock className="mb-3">{status.note}</ErrorBlock>
          )}
          <StatusAccordion defaultActiveKey={defaultActiveKeys} alwaysOpen>
            {groups.failed.length > 0 && (
              <FailedItem eventKey="failed">
                <Accordion.Header>
                  <FontAwesomeIcon icon="exclamation-triangle" className="text-danger me-2" />
                  <span className="fw-semibold">
                    Failed ({groups.failed.length})
                  </span>
                </Accordion.Header>
                <Accordion.Body>{renderRuleCards(groups.failed)}</Accordion.Body>
              </FailedItem>
            )}
            {groups.skipped.length > 0 && (
              <SkippedItem eventKey="skipped">
                <Accordion.Header>
                  <FontAwesomeIcon icon="ban" className="text-secondary me-2" />
                  <span className="fw-semibold">
                    Skipped ({groups.skipped.length})
                  </span>
                </Accordion.Header>
                <Accordion.Body>{renderRuleCards(groups.skipped)}</Accordion.Body>
              </SkippedItem>
            )}
            {groups.passed.length > 0 && (
              <PassedItem eventKey="passed">
                <Accordion.Header>
                  <FontAwesomeIcon icon="check" className="text-success me-2" />
                  <span className="fw-semibold">
                    Passed ({groups.passed.length})
                  </span>
                </Accordion.Header>
                <Accordion.Body>{renderRuleCards(groups.passed)}</Accordion.Body>
              </PassedItem>
            )}
          </StatusAccordion>
        </Modal.Body>
      )}
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} autoFocus>
          Ok
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PreCommitStatusModal;
