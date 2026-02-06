import React, { useEffect, useCallback } from 'react';
import { Modal as BsModal, Button } from 'react-bootstrap';
import { useUiStore } from '../../../stores';

interface ModalProps {
  modalId: string;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'lg' | 'xl';
  showFooter?: boolean;
  okText?: string;
  cancelText?: string;
  okVariant?: 'primary' | 'success' | 'danger' | 'warning';
  onOk?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  disableOk?: boolean;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  modalId,
  title,
  children,
  size,
  showFooter = true,
  okText = 'OK',
  cancelText = 'Cancel',
  okVariant = 'primary',
  onOk,
  onCancel,
  onClose,
  disableOk = false,
  className,
}) => {
  const isVisible = useUiStore((state) => state.modals[modalId] || false);
  const hideModal = useUiStore((state) => state.hideModal);

  const handleClose = useCallback(() => {
    hideModal(modalId);
    onClose?.();
  }, [modalId, hideModal, onClose]);

  const handleCancel = useCallback(() => {
    hideModal(modalId);
    onCancel?.();
  }, [modalId, hideModal, onCancel]);

  const handleOk = useCallback(() => {
    onOk?.();
    hideModal(modalId);
  }, [modalId, hideModal, onOk]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible, handleClose]);

  return (
    <BsModal
      show={isVisible}
      onHide={handleClose}
      size={size}
      centered
      className={className}
    >
      <BsModal.Header closeButton>
        <BsModal.Title>{title}</BsModal.Title>
      </BsModal.Header>
      <BsModal.Body>{children}</BsModal.Body>
      {showFooter && (
        <BsModal.Footer>
          <Button variant="secondary" onClick={handleCancel}>
            {cancelText}
          </Button>
          <Button variant={okVariant} onClick={handleOk} disabled={disableOk}>
            {okText}
          </Button>
        </BsModal.Footer>
      )}
    </BsModal>
  );
};

export default Modal;
