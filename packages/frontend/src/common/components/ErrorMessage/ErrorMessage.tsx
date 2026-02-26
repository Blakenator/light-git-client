import React, { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Modal, Button, ButtonGroup } from 'react-bootstrap';
import { useUiStore } from '../../../stores';
import { Icon } from '../Icon/Icon';

const ErrorContainer = styled.div`
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9998;
  max-width: 600px;
  width: 90%;
`;

const ErrorBadge = styled.div`
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: ${({ theme }) => theme.colors.alertDangerBg};
  color: ${({ theme }) => theme.colors.alertDangerText};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadows.materialDialog};
  cursor: pointer;
  animation: slideUp 0.3s ease-out;

  &:hover {
    background-color: ${({ theme }) => theme.colors.danger}80;
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const ErrorIcon = styled.span`
  margin-right: 0.75rem;
  font-size: 1.25rem;
  color: ${({ theme }) => theme.colors.danger};
`;

const ErrorBadgeContent = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ErrorCount = styled.span`
  background-color: ${({ theme }) => theme.colors.danger};
  color: ${({ theme }) => theme.colors.white};
  padding: 0.125rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.8rem;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-left: 0.5rem;
  color: ${({ theme }) => theme.colors.alertDangerText};
  opacity: 0.7;

  &:hover {
    opacity: 1;
  }
`;

const ErrorModalContent = styled.div`
  display: flex;
  flex-direction: column;
`;

const ErrorText = styled.div`
  font-weight: 500;
  margin-bottom: 0.5rem;
`;

const ErrorStack = styled.pre`
  font-size: 0.75rem;
  background-color: ${({ theme }) => theme.colors.light};
  padding: 0.75rem;
  border-radius: ${({ theme }) => theme.borderRadius};
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  margin-bottom: 0;
`;

const ErrorNavigation = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const ErrorIndex = styled.span`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.secondary};
`;

export const ErrorMessages: React.FC = () => {
  const errors = useUiStore((state) => state.errors);
  const dismissError = useUiStore((state) => state.dismissError);
  const dismissAllErrors = useUiStore((state) => state.dismissAllErrors);

  const [showModal, setShowModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentError = useMemo(() => {
    if (errors.length === 0) return null;
    return errors[Math.min(currentIndex, errors.length - 1)];
  }, [errors, currentIndex]);

  const handleOpenModal = useCallback(() => {
    setShowModal(true);
    setCurrentIndex(0);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setCurrentIndex(0);
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(errors.length - 1, prev + 1));
  }, [errors.length]);

  const handleDismissCurrent = useCallback(() => {
    if (currentError) {
      dismissError(currentError.id);
      if (errors.length <= 1) {
        handleCloseModal();
      } else if (currentIndex >= errors.length - 1) {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      }
    }
  }, [currentError, dismissError, errors.length, currentIndex, handleCloseModal]);

  const handleDismissAll = useCallback(() => {
    dismissAllErrors();
    handleCloseModal();
  }, [dismissAllErrors, handleCloseModal]);

  const handleCopyError = useCallback(() => {
    if (currentError) {
      const text = `${currentError.message}\n\n${currentError.stack || ''}`;
      navigator.clipboard.writeText(text).catch(console.error);
    }
  }, [currentError]);

  if (errors.length === 0) return null;

  return (
    <>
      <ErrorContainer>
        <ErrorBadge onClick={handleOpenModal}>
          <ErrorIcon>
            <Icon name="error" />
          </ErrorIcon>
          <ErrorBadgeContent>
            <span>
              {errors.length === 1
                ? errors[0].message
                : `${errors.length} errors occurred`}
            </span>
            {errors.length > 1 && <ErrorCount>{errors.length}</ErrorCount>}
          </ErrorBadgeContent>
          <CloseButton
            onClick={(e) => {
              e.stopPropagation();
              handleDismissAll();
            }}
          >
            <Icon name="fa-times" />
          </CloseButton>
        </ErrorBadge>
      </ErrorContainer>

      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title>
            <Icon name="error" className="me-2" />
            Error Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentError && (
            <ErrorModalContent>
              {errors.length > 1 && (
                <ErrorNavigation>
                  <ButtonGroup size="sm">
                    <Button
                      variant="outline-secondary"
                      onClick={handlePrev}
                      disabled={currentIndex === 0}
                    >
                      <Icon name="fa-chevron-left" />
                    </Button>
                    <Button
                      variant="outline-secondary"
                      onClick={handleNext}
                      disabled={currentIndex === errors.length - 1}
                    >
                      <Icon name="fa-chevron-right" />
                    </Button>
                  </ButtonGroup>
                  <ErrorIndex>
                    Error {currentIndex + 1} of {errors.length}
                  </ErrorIndex>
                </ErrorNavigation>
              )}
              <ErrorText>{currentError.message}</ErrorText>
              {currentError.stack && <ErrorStack>{currentError.stack}</ErrorStack>}
            </ErrorModalContent>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={handleCopyError}>
            <Icon name="fa-copy" className="me-1" />
            Copy
          </Button>
          <Button variant="danger" onClick={handleDismissCurrent}>
            Dismiss
          </Button>
          {errors.length > 1 && (
            <Button variant="danger" onClick={handleDismissAll}>
              Dismiss All
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ErrorMessages;
