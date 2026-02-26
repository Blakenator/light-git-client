import React from 'react';
import { Modal } from '../Modal/Modal';

interface ConfirmModalProps {
  show: boolean;
  onHide: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'success' | 'danger' | 'warning';
  onConfirm: () => void;
  onCancel?: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  show,
  onHide,
  title,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      show={show}
      onHide={onHide}
      title={title}
      okText={confirmText}
      cancelText={cancelText}
      okVariant={confirmVariant}
      onOk={onConfirm}
      onCancel={onCancel}
    >
      {children}
    </Modal>
  );
};

export default ConfirmModal;
