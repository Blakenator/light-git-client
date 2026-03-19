import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Modal, Button, ButtonGroup, Form, Alert, Badge } from 'react-bootstrap';
import { useUiStore } from '../../../stores';
import { Icon } from '@light-git/core';
import {
  BranchFilter,
  BranchList,
  BranchOption,
  BranchName,
  BranchSection,
  SectionHeader,
} from './BranchSelect.styles';

interface BranchModel {
  name: string;
  isRemote?: boolean;
  isCurrentBranch?: boolean;
  trackingPath?: string;
}

type UpstreamMode = 'select' | 'unset' | 'matchName';

interface ChangeRemoteDialogProps {
  remoteBranches: BranchModel[];
  targetBranch?: BranchModel | null;
  onSubmit: (remoteBranch: string) => void;
  onUnset: () => void;
  onMatchName: () => void;
}

export const ChangeRemoteDialog: React.FC<ChangeRemoteDialogProps> = ({
  remoteBranches,
  targetBranch,
  onSubmit,
  onUnset,
  onMatchName,
}) => {
  const isVisible = useUiStore((state) => state.modals['changeRemote'] || false);
  const hideModal = useUiStore((state) => state.hideModal);

  const [mode, setMode] = useState<UpstreamMode>('select');
  const [selectedRemote, setSelectedRemote] = useState('');
  const [filter, setFilter] = useState('');

  const matchNameTarget = useMemo(
    () => (targetBranch ? `origin/${targetBranch.name}` : ''),
    [targetBranch],
  );

  useEffect(() => {
    if (isVisible) {
      setMode('select');
      setSelectedRemote(targetBranch?.trackingPath || '');
      setFilter('');
    }
  }, [isVisible, targetBranch]);

  const filteredBranches = useMemo(() => {
    if (!filter) return remoteBranches;
    const lower = filter.toLowerCase();
    return remoteBranches.filter((b) => b.name.toLowerCase().includes(lower));
  }, [remoteBranches, filter]);

  const handleClose = useCallback(() => {
    hideModal('changeRemote');
  }, [hideModal]);

  const isSubmitDisabled = useMemo(() => {
    if (mode === 'select') {
      return !selectedRemote || selectedRemote === targetBranch?.trackingPath;
    }
    if (mode === 'unset') {
      return !targetBranch?.trackingPath;
    }
    // matchName
    return matchNameTarget === targetBranch?.trackingPath;
  }, [mode, selectedRemote, targetBranch, matchNameTarget]);

  const handleSubmit = useCallback(() => {
    if (mode === 'unset') {
      onUnset();
    } else if (mode === 'matchName') {
      onMatchName();
    } else {
      if (selectedRemote) {
        onSubmit(selectedRemote);
      }
    }
    hideModal('changeRemote');
  }, [mode, selectedRemote, onSubmit, onUnset, onMatchName, hideModal]);

  return (
    <Modal show={isVisible} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <Icon name="fa-exchange-alt" className="me-2" />
          Change Remote Branch
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {targetBranch && (
          <Alert variant="info" className="mb-3 d-flex align-items-center gap-2">
            <span>Changing upstream for</span>
            <Badge bg="primary">{targetBranch.name}</Badge>
            {targetBranch.trackingPath && (
              <>
                <span>currently tracking</span>
                <Badge bg="secondary">{targetBranch.trackingPath}</Badge>
              </>
            )}
          </Alert>
        )}

        <Form.Group className="mb-3">
          <Form.Label>Mode</Form.Label>
          <ButtonGroup className="w-100">
            <Button
              variant={mode === 'select' ? 'primary' : 'outline-primary'}
              onClick={() => setMode('select')}
            >
              <Icon name="fa-list" className="me-1" />
              Select Remote
            </Button>
            <Button
              variant={mode === 'matchName' ? 'primary' : 'outline-primary'}
              onClick={() => setMode('matchName')}
            >
              <Icon name="fa-code-branch" className="me-1" />
              Match Branch Name
            </Button>
            <Button
              variant={mode === 'unset' ? 'primary' : 'outline-primary'}
              onClick={() => setMode('unset')}
            >
              <Icon name="fa-unlink" className="me-1" />
              No Upstream
            </Button>
          </ButtonGroup>
        </Form.Group>

        {mode === 'select' && (
          <Form.Group className="mb-3">
            <Form.Label>Select Remote Branch</Form.Label>
            <BranchFilter
              size="sm"
              placeholder="Filter remote branches..."
              value={filter}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFilter(e.target.value)
              }
            />
            <BranchList>
              {filteredBranches.length > 0 ? (
                <BranchSection>
                  <SectionHeader>Remote Branches</SectionHeader>
                  {filteredBranches.map((b) => (
                    <BranchOption
                      key={b.name}
                      $selected={selectedRemote === b.name}
                      onClick={() => setSelectedRemote(b.name)}
                    >
                      {selectedRemote === b.name ? (
                        <Icon name="fa-check" size="sm" />
                      ) : (
                        <Icon name="fa-cloud" size="sm" />
                      )}
                      <BranchName title={b.name}>{b.name}</BranchName>
                      {targetBranch?.trackingPath === b.name && (
                        <Badge bg="success" className="ms-auto" style={{ flexShrink: 0 }}>
                          current
                        </Badge>
                      )}
                    </BranchOption>
                  ))}
                </BranchSection>
              ) : (
                <div className="text-muted text-center py-3">No remote branches found</div>
              )}
            </BranchList>
          </Form.Group>
        )}

        {mode === 'matchName' && targetBranch && (
          <Alert variant="info" className="mb-3 d-flex align-items-center gap-2 flex-wrap">
            <Icon name="fa-code-branch" size="sm" />
            <span>Upstream will be set to</span>
            <Badge bg="primary">{matchNameTarget}</Badge>
          </Alert>
        )}

        {mode === 'unset' && (
          <Alert variant="warning" className="mb-3 d-flex align-items-center gap-2">
            <Icon name="fa-unlink" size="sm" />
            <span>
              {targetBranch?.trackingPath
                ? <>This will stop tracking <Badge bg="secondary">{targetBranch.trackingPath}</Badge> and remove the upstream reference.</>
                : 'This branch is not currently tracking a remote branch.'}
            </span>
          </Alert>
        )}

        {mode === 'select' && selectedRemote && selectedRemote !== targetBranch?.trackingPath && (
          <Alert variant="warning" className="mb-0 d-flex align-items-center gap-2 flex-wrap">
            <Icon name="fa-exchange-alt" size="sm" />
            <span>Upstream will change to</span>
            <Badge bg="primary">{selectedRemote}</Badge>
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant={mode === 'unset' ? 'danger' : 'primary'}
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
        >
          {mode === 'unset' ? (
            <><Icon name="fa-unlink" className="me-1" /> Remove Upstream</>
          ) : (
            <><Icon name="fa-exchange-alt" className="me-1" /> Change Remote</>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ChangeRemoteDialog;
