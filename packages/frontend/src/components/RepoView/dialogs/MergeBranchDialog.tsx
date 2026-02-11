import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Modal, Button, Form, ButtonGroup, Alert, Badge } from 'react-bootstrap';
import styled from 'styled-components';
import { useUiStore } from '../../../stores';
import { Icon } from '@light-git/core';

const BranchSelectGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SwapButtonWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 1.75rem;
`;

const SwapButton = styled(Button)`
  border-radius: 50%;
  width: 38px;
  height: 38px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const BranchFilter = styled(Form.Control)`
  margin-bottom: 0.5rem;
`;

const BranchList = styled.div`
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius};
`;

const BranchOption = styled.div<{ $selected?: boolean; $current?: boolean }>`
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: ${({ $selected, theme }) =>
    $selected ? theme.colors.primary : 'transparent'};
  color: ${({ $selected }) => ($selected ? 'white' : 'inherit')};

  &:hover {
    background-color: ${({ $selected, theme }) =>
      $selected ? theme.colors.primary : theme.colors.light};
  }

  ${({ $current }) =>
    $current &&
    `
    font-weight: 600;
  `}
`;

const BranchSection = styled.div`
  margin-bottom: 0.25rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionHeader = styled.div`
  padding: 0.375rem 0.75rem;
  background-color: ${({ theme }) => theme.colors.light};
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.secondary};
`;

interface BranchModel {
  name: string;
  isRemote?: boolean;
  isCurrentBranch?: boolean;
  trackingPath?: string;
}

interface MergeInfo {
  sourceBranch?: BranchModel;
  targetBranch?: BranchModel;
  isRebase?: boolean;
  isInteractive?: boolean;
}

interface MergeBranchDialogProps {
  localBranches: BranchModel[];
  remoteBranches: BranchModel[];
  activeMergeInfo?: MergeInfo | null;
  hasUncommittedChanges?: boolean;
  onMerge: (
    source: string,
    target: string,
    options: { rebase: boolean; interactive: boolean }
  ) => void;
  onCancel: () => void;
}

export const MergeBranchDialog: React.FC<MergeBranchDialogProps> = ({
  localBranches,
  remoteBranches,
  activeMergeInfo,
  hasUncommittedChanges = false,
  onMerge,
  onCancel,
}) => {
  const isVisible = useUiStore((state) => state.modals['mergeBranch'] || false);
  const hideModal = useUiStore((state) => state.hideModal);

  const [sourceBranch, setSourceBranch] = useState(
    activeMergeInfo?.sourceBranch?.name || ''
  );
  const [targetBranch, setTargetBranch] = useState(
    activeMergeInfo?.targetBranch?.name || ''
  );
  const [isRebase, setIsRebase] = useState(activeMergeInfo?.isRebase || false);
  const [isInteractive, setIsInteractive] = useState(
    activeMergeInfo?.isInteractive || false
  );
  const [sourceFilter, setSourceFilter] = useState('');
  const [targetFilter, setTargetFilter] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isVisible) {
      setSourceBranch(activeMergeInfo?.sourceBranch?.name || '');
      setTargetBranch(activeMergeInfo?.targetBranch?.name || localBranches.find(b => b.isCurrentBranch)?.name || '');
      setIsRebase(activeMergeInfo?.isRebase || false);
      setIsInteractive(activeMergeInfo?.isInteractive || false);
      setSourceFilter('');
      setTargetFilter('');
    }
  }, [isVisible, activeMergeInfo, localBranches]);

  const currentBranch = useMemo(
    () => localBranches.find((b) => b.isCurrentBranch),
    [localBranches]
  );

  const filterBranches = useCallback(
    (branches: BranchModel[], filter: string) => {
      if (!filter) return branches;
      const lowerFilter = filter.toLowerCase();
      return branches.filter((b) => b.name.toLowerCase().includes(lowerFilter));
    },
    []
  );

  const filteredSourceBranches = useMemo(
    () => ({
      local: filterBranches(localBranches, sourceFilter),
      remote: filterBranches(remoteBranches, sourceFilter),
    }),
    [localBranches, remoteBranches, sourceFilter, filterBranches]
  );

  const filteredTargetBranches = useMemo(
    () => ({
      local: filterBranches(localBranches, targetFilter),
      remote: filterBranches(remoteBranches, targetFilter),
    }),
    [localBranches, remoteBranches, targetFilter, filterBranches]
  );

  const handleClose = useCallback(() => {
    hideModal('mergeBranch');
    onCancel();
  }, [hideModal, onCancel]);

  const handleSwapDirection = useCallback(() => {
    const prevSource = sourceBranch;
    const prevTarget = targetBranch;
    setSourceBranch(prevTarget);
    setTargetBranch(prevSource);
    const prevSourceFilter = sourceFilter;
    const prevTargetFilter = targetFilter;
    setSourceFilter(prevTargetFilter);
    setTargetFilter(prevSourceFilter);
  }, [sourceBranch, targetBranch, sourceFilter, targetFilter]);

  const handleSubmit = useCallback(() => {
    if (sourceBranch && targetBranch) {
      onMerge(sourceBranch, targetBranch, {
        rebase: isRebase,
        interactive: isInteractive,
      });
      hideModal('mergeBranch');
    }
  }, [sourceBranch, targetBranch, isRebase, isInteractive, onMerge, hideModal]);

  const renderBranchList = (
    branches: { local: BranchModel[]; remote: BranchModel[] },
    selectedBranch: string,
    onSelect: (name: string) => void
  ) => (
    <BranchList>
      {branches.local.length > 0 && (
        <BranchSection>
          <SectionHeader>Local Branches</SectionHeader>
          {branches.local.map((b) => (
            <BranchOption
              key={b.name}
              $selected={selectedBranch === b.name}
              $current={b.isCurrentBranch}
              onClick={() => onSelect(b.name)}
            >
              {selectedBranch === b.name && <Icon name="fa-check" size="sm" />}
              {b.name}
              {b.isCurrentBranch && (
                <Badge bg="success" className="ms-auto">
                  current
                </Badge>
              )}
            </BranchOption>
          ))}
        </BranchSection>
      )}
      {branches.remote.length > 0 && (
        <BranchSection>
          <SectionHeader>Remote Branches</SectionHeader>
          {branches.remote.map((b) => (
            <BranchOption
              key={b.name}
              $selected={selectedBranch === b.name}
              onClick={() => onSelect(b.name)}
            >
              {selectedBranch === b.name ? <Icon name="fa-check" size="sm" /> : <Icon name="fa-cloud" size="sm" />}
              {b.name}
            </BranchOption>
          ))}
        </BranchSection>
      )}
      {branches.local.length === 0 && branches.remote.length === 0 && (
        <div className="text-muted text-center py-3">No branches found</div>
      )}
    </BranchList>
  );

  return (
    <Modal show={isVisible} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <Icon name={isRebase ? 'fa-code-branch' : 'merge_type'} className="me-2" />
          {isRebase ? 'Rebase' : 'Merge'} Branches
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {hasUncommittedChanges && (
          <Alert variant="warning" className="mb-3">
            <Icon name="fa-exclamation-triangle" className="me-2" />
            You have uncommitted changes. Please commit or stash them before{' '}
            {isRebase ? 'rebasing' : 'merging'}.
          </Alert>
        )}

        <Form.Group className="mb-3">
          <Form.Label>Operation Type</Form.Label>
          <ButtonGroup className="w-100">
            <Button
              variant={!isRebase ? 'primary' : 'outline-primary'}
              onClick={() => {
                setIsRebase(false);
                setIsInteractive(false);
              }}
            >
              <Icon name="merge_type" className="me-1" />
              Merge
            </Button>
            <Button
              variant={isRebase && !isInteractive ? 'primary' : 'outline-primary'}
              onClick={() => {
                setIsRebase(true);
                setIsInteractive(false);
              }}
            >
              <Icon name="fa-code-branch" className="me-1" />
              Rebase
            </Button>
            <Button
              variant={isRebase && isInteractive ? 'primary' : 'outline-primary'}
              onClick={() => {
                setIsRebase(true);
                setIsInteractive(true);
              }}
            >
              <Icon name="fa-list" className="me-1" />
              Interactive Rebase
            </Button>
          </ButtonGroup>
        </Form.Group>

        <div className="d-flex align-items-start gap-2">
          <div className="flex-fill">
            <Form.Group className="mb-3">
              <Form.Label>
                {isRebase ? 'Branch to rebase' : 'Branch to merge from'}
              </Form.Label>
              <BranchFilter
                size="sm"
                placeholder="Filter branches..."
                value={sourceFilter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSourceFilter(e.target.value)
                }
              />
              {renderBranchList(filteredSourceBranches, sourceBranch, setSourceBranch)}
              {sourceBranch && (
                <Form.Text className="text-muted">
                  Selected: <strong>{sourceBranch}</strong>
                </Form.Text>
              )}
            </Form.Group>
          </div>

          <SwapButtonWrapper>
            <SwapButton
              variant="outline-secondary"
              onClick={handleSwapDirection}
              title="Swap source and target branches"
            >
              <Icon name="fa-exchange-alt" />
            </SwapButton>
          </SwapButtonWrapper>

          <div className="flex-fill">
            <Form.Group className="mb-3">
              <Form.Label>{isRebase ? 'Rebase onto' : 'Merge into'}</Form.Label>
              <BranchFilter
                size="sm"
                placeholder="Filter branches..."
                value={targetFilter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTargetFilter(e.target.value)
                }
              />
              {renderBranchList(filteredTargetBranches, targetBranch, setTargetBranch)}
              {targetBranch && (
                <Form.Text className="text-muted">
                  Selected: <strong>{targetBranch}</strong>
                </Form.Text>
              )}
            </Form.Group>
          </div>
        </div>

        {sourceBranch && targetBranch && (
          <Alert variant="info" className="mb-0 d-flex align-items-center gap-2 flex-wrap">
            <span>{isRebase ? 'Rebase' : 'Merge'}</span>
            <Badge bg="primary">{sourceBranch}</Badge>
            <Icon name="fa-arrow-right" size="sm" />
            <Badge bg="primary">{targetBranch}</Badge>
            {isInteractive && <Badge bg="warning" text="dark">interactive</Badge>}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="success"
          onClick={handleSubmit}
          disabled={!sourceBranch || !targetBranch || hasUncommittedChanges}
        >
          <Icon name={isRebase ? 'fa-code-branch' : 'merge_type'} className="me-1" />
          {isRebase ? 'Rebase' : 'Merge'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MergeBranchDialog;
