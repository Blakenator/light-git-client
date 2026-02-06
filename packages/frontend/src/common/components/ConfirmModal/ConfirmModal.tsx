import React from 'react';
import { Modal } from '../Modal/Modal';

interface ConfirmModalProps {
  modalId: string;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'success' | 'danger' | 'warning';
  onConfirm: () => void;
  onCancel?: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  modalId,
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
      modalId={modalId}
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
