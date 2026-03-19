import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Modal, Button, Form, InputGroup, Alert, Badge, Accordion } from 'react-bootstrap';
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

interface CreateBranchDialogProps {
  localBranches: BranchModel[];
  branchNamePrefix?: string;
  onSubmit: (branchName: string, sourceBranch: string) => void;
}

export const CreateBranchDialog: React.FC<CreateBranchDialogProps> = ({
  localBranches,
  branchNamePrefix = '',
  onSubmit,
}) => {
  const isVisible = useUiStore((state) => state.modals['createBranch'] || false);
  const hideModal = useUiStore((state) => state.hideModal);

  const [branchName, setBranchName] = useState('');
  const [sourceBranch, setSourceBranch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [touched, setTouched] = useState(false);
  const [prependCleared, setPrependCleared] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);

  const validPattern = /^[a-zA-Z0-9/._-]*[a-zA-Z0-9._-]$/;

  const currentBranch = useMemo(
    () => localBranches.find((b) => b.isCurrentBranch),
    [localBranches],
  );

  useEffect(() => {
    if (isVisible) {
      setBranchName('');
      setSourceBranch(currentBranch?.name || '');
      setSourceFilter('');
      setIsValid(true);
      setTouched(false);
      setPrependCleared(false);
      setSourceOpen(false);
    }
  }, [isVisible, currentBranch]);

  const filteredBranches = useMemo(() => {
    if (!sourceFilter) return localBranches;
    const lower = sourceFilter.toLowerCase();
    return localBranches.filter((b) => b.name.toLowerCase().includes(lower));
  }, [localBranches, sourceFilter]);

  const isNonCurrentSource = useMemo(
    () => sourceBranch && currentBranch && sourceBranch !== currentBranch.name,
    [sourceBranch, currentBranch],
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\s/g, '-');
    setBranchName(value);
    setTouched(true);
    setIsValid(validPattern.test(value));
  }, []);

  const handleClose = useCallback(() => {
    hideModal('createBranch');
  }, [hideModal]);

  const activePrepend = prependCleared ? '' : branchNamePrefix;
  const fullBranchName = activePrepend ? activePrepend + branchName : branchName;

  const handleSubmit = useCallback(() => {
    if (isValid && branchName.trim() && sourceBranch) {
      onSubmit(fullBranchName, sourceBranch);
      hideModal('createBranch');
    }
  }, [isValid, branchName, sourceBranch, fullBranchName, onSubmit, hideModal]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid && branchName.trim() && sourceBranch) {
      handleSubmit();
    }
  }, [isValid, branchName, sourceBranch, handleSubmit]);

  return (
    <Modal show={isVisible} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <Icon name="fa-code-branch" className="me-2" />
          Create Branch
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Branch Name</Form.Label>
          <InputGroup>
            {branchNamePrefix && !prependCleared && (
              <InputGroup.Text>
                {branchNamePrefix}
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 ms-1"
                  onClick={() => setPrependCleared(true)}
                >
                  &times;
                </Button>
              </InputGroup.Text>
            )}
            <Form.Control
              type="text"
              value={branchName}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Branch name..."
              isInvalid={touched && !isValid}
              autoFocus
            />
            <Form.Control.Feedback type="invalid">
              Please enter a valid branch name
            </Form.Control.Feedback>
          </InputGroup>
        </Form.Group>

        <Accordion activeKey={sourceOpen ? '0' : undefined} className="mb-3">
          <Accordion.Item eventKey="0">
            <Accordion.Header onClick={() => setSourceOpen((v) => !v)}>
              Source Branch{sourceBranch ? `: ${sourceBranch}` : ''}
            </Accordion.Header>
            <Accordion.Body>
              <BranchFilter
                size="sm"
                placeholder="Filter branches..."
                value={sourceFilter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSourceFilter(e.target.value)
                }
              />
              <BranchList>
                {filteredBranches.length > 0 && (
                  <BranchSection>
                    <SectionHeader>Local Branches</SectionHeader>
                    {filteredBranches.map((b) => (
                      <BranchOption
                        key={b.name}
                        $selected={sourceBranch === b.name}
                        $current={b.isCurrentBranch}
                        onClick={() => setSourceBranch(b.name)}
                      >
                        {sourceBranch === b.name && <Icon name="fa-check" size="sm" />}
                        <BranchName title={b.name}>{b.name}</BranchName>
                        {b.isCurrentBranch && (
                          <Badge bg="success" className="ms-auto" style={{ flexShrink: 0 }}>
                            current
                          </Badge>
                        )}
                      </BranchOption>
                    ))}
                  </BranchSection>
                )}
                {filteredBranches.length === 0 && (
                  <div className="text-muted text-center py-3">No branches found</div>
                )}
              </BranchList>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>

        {isNonCurrentSource && (
          <Alert variant="warning" className="mb-0">
            <Icon name="fa-exclamation-triangle" className="me-2" />
            Branch <strong>{sourceBranch}</strong> will be checked out before creating the new branch.
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!isValid || !branchName.trim() || !sourceBranch}
        >
          <Icon name="fa-code-branch" className="me-1" />
          Create Branch
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CreateBranchDialog;
