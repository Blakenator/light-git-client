import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Modal, Button, Form, ButtonGroup, ListGroup, Badge } from 'react-bootstrap';
import styled from 'styled-components';
import { useUiStore } from '../../../stores';
import { Icon, AgeInfo } from '@light-git/core';

const DialogContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  min-height: 400px;
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ColumnTitle = styled.h5`
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const BranchList = styled(ListGroup)`
  max-height: 300px;
  overflow-y: auto;
`;

const BranchItem = styled(ListGroup.Item)`
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
`;

const BranchName = styled.span`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AgeDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-right: 0.5rem;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.secondary};
`;

interface BranchModel {
  name: string;
  trackingPath?: string;
  isTrackingPathGone?: boolean;
  isCurrentBranch?: boolean;
  lastCommitDate?: Date | string;
}

interface PruneBranchDialogProps {
  localBranches: BranchModel[];
  onConfirm: (branches: BranchModel[]) => void;
}

export const PruneBranchDialog: React.FC<PruneBranchDialogProps> = ({
  localBranches,
  onConfirm,
}) => {
  const isVisible = useUiStore((state) => state.modals['pruneBranch'] || false);
  const hideModal = useUiStore((state) => state.hideModal);

  const [byAge, setByAge] = useState(false);
  const [age, setAge] = useState(30);
  const [ageUnit, setAgeUnit] = useState(1000 * 60 * 60 * 24); // days in ms
  const [searchText, setSearchText] = useState('');
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set());

  // Reset state when modal opens
  useEffect(() => {
    if (isVisible) {
      setSelectedBranches(new Set());
      setSearchText('');
    }
  }, [isVisible]);

  // Filter branches by merge status (no tracking or gone)
  const branchesByMerge = useMemo(() => {
    return localBranches
      .filter(
        (branch) =>
          (!branch.trackingPath || branch.isTrackingPathGone) &&
          !branch.isCurrentBranch &&
          branch.name !== 'master' &&
          branch.name !== 'main' &&
          (!searchText || branch.name.toLowerCase().includes(searchText.toLowerCase()))
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [localBranches, searchText]);

  // Filter branches by age
  const branchesByAge = useMemo(() => {
    const cutoffTime = Date.now() - age * ageUnit;
    return localBranches
      .filter(
        (branch) =>
          branch.lastCommitDate &&
          new Date(branch.lastCommitDate).getTime() < cutoffTime &&
          branch.name !== 'master' &&
          branch.name !== 'main' &&
          !branch.isCurrentBranch &&
          (!searchText || branch.name.toLowerCase().includes(searchText.toLowerCase()))
      )
      .sort(
        (a, b) =>
          new Date(b.lastCommitDate!).getTime() - new Date(a.lastCommitDate!).getTime()
      );
  }, [localBranches, age, ageUnit, searchText]);

  const activeBranchList = byAge ? branchesByAge : branchesByMerge;

  const toggleBranch = useCallback((branchName: string) => {
    setSelectedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(branchName)) {
        next.delete(branchName);
      } else {
        next.add(branchName);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedBranches(new Set(activeBranchList.map((b) => b.name)));
  }, [activeBranchList]);

  const handleClose = useCallback(() => {
    hideModal('pruneBranch');
  }, [hideModal]);

  const handleConfirm = useCallback(() => {
    const branchesToPrune = localBranches.filter((b) => selectedBranches.has(b.name));
    onConfirm(branchesToPrune);
    hideModal('pruneBranch');
  }, [localBranches, selectedBranches, onConfirm, hideModal]);

  const selectedBranchObjects = localBranches.filter((b) => selectedBranches.has(b.name));

  return (
    <Modal show={isVisible} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Prune Local Branches</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <DialogContent>
          <Column>
            <ColumnTitle>
              Available Branches
              <ButtonGroup size="sm">
                <Button
                  variant={!byAge ? 'primary' : 'secondary'}
                  onClick={() => setByAge(false)}
                >
                  Merged
                </Button>
                <Button
                  variant={byAge ? 'primary' : 'secondary'}
                  onClick={() => setByAge(true)}
                >
                  By Age
                </Button>
              </ButtonGroup>
            </ColumnTitle>

            {byAge && (
              <div className="d-flex gap-2">
                <Form.Control
                  type="number"
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                  placeholder="Age"
                  style={{ flex: 1 }}
                />
                <Form.Select
                  value={ageUnit}
                  onChange={(e) => setAgeUnit(parseInt(e.target.value))}
                  style={{ flex: 1 }}
                >
                  <option value={1000 * 60 * 60 * 24}>Days</option>
                  <option value={1000 * 60 * 60}>Hours</option>
                  <option value={1000 * 60}>Minutes</option>
                </Form.Select>
              </div>
            )}

            <div className="d-flex gap-2">
              <Form.Control
                placeholder="Search..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <Button variant="primary" onClick={selectAll} disabled={activeBranchList.length === 0}>
                Select All
              </Button>
            </div>

            {activeBranchList.length > 0 ? (
              <BranchList>
                {activeBranchList.map((branch) => (
                  <BranchItem key={branch.name}>
                    <BranchName>
                      {branch.name}
                      {branch.isTrackingPathGone && (
                        <span title="Remote branch no longer exists">
                          <Icon name="fa-unlink" className="text-warning" />
                        </span>
                      )}
                    </BranchName>
                    {branch.lastCommitDate && (
                      <AgeDisplay>
                        <AgeInfo date={branch.lastCommitDate} />
                        <Icon name="fa-stopwatch" size="sm" />
                      </AgeDisplay>
                    )}
                    <Button
                      variant={selectedBranches.has(branch.name) ? 'danger' : 'outline-danger'}
                      size="sm"
                      onClick={() => toggleBranch(branch.name)}
                    >
                      {selectedBranches.has(branch.name) ? (
                        <>Deleting <Icon name="fa-check" /></>
                      ) : (
                        'Select'
                      )}
                    </Button>
                  </BranchItem>
                ))}
              </BranchList>
            ) : (
              <div className="text-muted">No branches to prune...</div>
            )}
          </Column>

          <Column>
            <ColumnTitle>Branches to Delete</ColumnTitle>
            <div className="text-muted">The following branches will be deleted:</div>
            
            {selectedBranchObjects.length > 0 ? (
              <BranchList>
                {selectedBranchObjects.map((branch) => (
                  <BranchItem key={branch.name}>
                    <BranchName>{branch.name}</BranchName>
                    {branch.lastCommitDate && (
                      <AgeDisplay>
                        <AgeInfo date={branch.lastCommitDate} />
                        <Icon name="fa-stopwatch" size="sm" />
                      </AgeDisplay>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => toggleBranch(branch.name)}
                    >
                      Deleting <Icon name="fa-check" />
                    </Button>
                  </BranchItem>
                ))}
              </BranchList>
            ) : (
              <div className="text-muted">No branches selected</div>
            )}
            
            <div className="mt-auto">
              <strong>This cannot be undone</strong>
            </div>
          </Column>
        </DialogContent>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleConfirm}
          disabled={selectedBranches.size === 0}
        >
          Delete {selectedBranches.size} Branch{selectedBranches.size !== 1 ? 'es' : ''}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PruneBranchDialog;
