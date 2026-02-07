import React, { useState, useCallback } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useUiStore } from '../../../stores';
import { invokeSync, useBackendAsync, SYNC_CHANNELS, ASYNC_CHANNELS } from '../../../ipc';

interface BranchModel {
  name: string;
  isRemote?: boolean;
}

interface AddWorktreeDialogProps {
  branches: BranchModel[];
  existingWorktrees: { path: string; name: string }[];
  repoPath: string;
  onSuccess: () => void;
}

export const AddWorktreeDialog: React.FC<AddWorktreeDialogProps> = ({
  branches,
  existingWorktrees,
  repoPath,
  onSuccess,
}) => {
  const isVisible = useUiStore((state) => state.modals['addWorktree'] || false);
  const hideModal = useUiStore((state) => state.hideModal);

  const [selectedBranch, setSelectedBranch] = useState('');
  const [worktreePath, setWorktreePath] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [createNewBranch, setCreateNewBranch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { refetch: startAddWorktree } = useBackendAsync({
    channel: ASYNC_CHANNELS.AddWorktree,
    skip: true,
    onComplete: useCallback(() => {
      setIsSubmitting(false);
      handleCloseAndReset();
      onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onSuccess]),
  });

  const handleCloseAndReset = useCallback(() => {
    hideModal('addWorktree');
    setSelectedBranch('');
    setWorktreePath('');
    setNewBranchName('');
    setCreateNewBranch(false);
  }, [hideModal]);

  const handleBrowse = useCallback(async () => {
    try {
      const result = await invokeSync(SYNC_CHANNELS.OpenFileDialog, {
        options: { properties: ['openDirectory'] },
      });
      if (result?.[0]) {
        setWorktreePath(result[0]);
      }
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!worktreePath) return;

    setIsSubmitting(true);
    try {
      await startAddWorktree({
        repoPath,
        worktreePath,
        branch: createNewBranch ? newBranchName : selectedBranch,
        createNewBranch,
      });
    } catch (error) {
      console.error('Failed to add worktree:', error);
      setIsSubmitting(false);
    }
  }, [
    repoPath,
    worktreePath,
    selectedBranch,
    newBranchName,
    createNewBranch,
    startAddWorktree,
  ]);

  const isValid =
    worktreePath && (createNewBranch ? newBranchName : selectedBranch);

  return (
    <Modal show={isVisible} onHide={handleCloseAndReset} centered>
      <Modal.Header closeButton>
        <Modal.Title>Add Worktree</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Worktree Location</Form.Label>
          <div className="d-flex gap-2">
            <Form.Control
              type="text"
              value={worktreePath}
              onChange={(e) => setWorktreePath(e.target.value)}
              placeholder="/path/to/worktree"
            />
            <Button variant="secondary" onClick={handleBrowse}>
              Browse
            </Button>
          </div>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Check
            type="checkbox"
            label="Create new branch"
            checked={createNewBranch}
            onChange={(e) => setCreateNewBranch(e.target.checked)}
          />
        </Form.Group>

        {createNewBranch ? (
          <Form.Group className="mb-3">
            <Form.Label>New Branch Name</Form.Label>
            <Form.Control
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="feature/my-feature"
            />
          </Form.Group>
        ) : (
          <Form.Group className="mb-3">
            <Form.Label>Branch</Form.Label>
            <Form.Select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="">Select a branch...</option>
              {branches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleCloseAndReset}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? 'Adding...' : 'Add Worktree'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AddWorktreeDialog;
