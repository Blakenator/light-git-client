import React from 'react';
import styled from 'styled-components';
import { Icon } from '../Icon/Icon';

export interface ErrorItem {
  id: string;
  message: string;
  stack?: string;
}

const ErrorContainer = styled.div`
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 600px;
  width: 90%;
`;

const ErrorItemStyled = styled.div`
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  background-color: ${({ theme }) => theme.colors.alertDangerBg};
  color: ${({ theme }) => theme.colors.alertDangerText};
  border-radius: 0.4em;
  box-shadow: ${({ theme }) => theme.shadows.materialDialog};
  animation: slideUp 0.3s ease-out;

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

const ErrorContent = styled.div`
  flex: 1;
`;

const ErrorText = styled.div`
  font-weight: 500;
`;

const ErrorStack = styled.pre`
  margin-top: 0.5rem;
  font-size: 0.75rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
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

interface ErrorMessagesProps {
  errors: ErrorItem[];
  onDismiss: (id: string) => void;
}

export const ErrorMessages: React.FC<ErrorMessagesProps> = ({ errors, onDismiss }) => {
  if (errors.length === 0) return null;

  return (
    <ErrorContainer>
      {errors.map((error) => (
        <ErrorItemStyled key={error.id}>
          <ErrorIcon>
            <Icon name="error" />
          </ErrorIcon>
          <ErrorContent>
            <ErrorText>{error.message}</ErrorText>
            {error.stack && <ErrorStack>{error.stack}</ErrorStack>}
          </ErrorContent>
          <CloseButton onClick={() => onDismiss(error.id)}>
            <Icon name="fa-times" />
          </CloseButton>
        </ErrorItemStyled>
      ))}
    </ErrorContainer>
  );
};

export default ErrorMessages;
