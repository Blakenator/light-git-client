import React, { useEffect, useCallback } from 'react';
import { Modal as BsModal, Button } from 'react-bootstrap';

interface ModalProps {
  show: boolean;
  onHide: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'lg' | 'xl';
  showFooter?: boolean;
  okText?: string;
  cancelText?: string;
  okVariant?: 'primary' | 'success' | 'danger' | 'warning';
  onOk?: () => void;
  onCancel?: () => void;
  disableOk?: boolean;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  show,
  onHide,
  title,
  children,
  size,
  showFooter = true,
  okText = 'OK',
  cancelText = 'Cancel',
  okVariant = 'primary',
  onOk,
  onCancel,
  disableOk = false,
  className,
}) => {
  const handleCancel = useCallback(() => {
    onHide();
    onCancel?.();
  }, [onHide, onCancel]);

  const handleOk = useCallback(() => {
    onOk?.();
    onHide();
  }, [onHide, onOk]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show) {
        onHide();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [show, onHide]);

  return (
    <BsModal
      show={show}
      onHide={onHide}
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
