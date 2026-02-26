import React, { useState, useCallback } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useUiStore } from '../../../stores';

interface AddSubmoduleDialogProps {
  onAdd: (url: string, path: string) => void;
}

export const AddSubmoduleDialog: React.FC<AddSubmoduleDialogProps> = ({ onAdd }) => {
  const isVisible = useUiStore((state) => state.modals['addSubmodule'] || false);
  const hideModal = useUiStore((state) => state.hideModal);

  const [url, setUrl] = useState('');
  const [path, setPath] = useState('');

  const handleClose = useCallback(() => {
    hideModal('addSubmodule');
    setUrl('');
    setPath('');
  }, [hideModal]);

  const handleSubmit = useCallback(() => {
    if (url && path) {
      onAdd(url, path);
      handleClose();
    }
  }, [url, path, onAdd, handleClose]);

  return (
    <Modal show={isVisible} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Add Submodule</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Repository URL</Form.Label>
          <Form.Control
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/user/repo.git"
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Path (relative to repo root)</Form.Label>
          <Form.Control
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="libs/my-submodule"
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!url || !path}>
          Add Submodule
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AddSubmoduleDialog;
