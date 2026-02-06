import React from 'react';
import styled from 'styled-components';
import { Icon } from '../Icon/Icon';

export interface AlertItem {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

const AlertContainer = styled.div`
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 400px;
`;

const AlertItemStyled = styled.div<{ $variant: AlertItem['type'] }>`
  display: flex;
  align-items: flex-start;
  padding: 0.75rem 1rem;
  border-radius: 0.4em;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease-out;
  
  background-color: ${({ $variant, theme }) => {
    switch ($variant) {
      case 'success': return theme.colors.alertSuccessBg;
      case 'warning': return theme.colors.alertWarningBg;
      case 'error': return theme.colors.alertDangerBg;
      case 'info': return theme.colors.alertInfoBg;
      default: return theme.colors.alertDefaultBg;
    }
  }};
  
  color: ${({ $variant, theme }) => {
    switch ($variant) {
      case 'success': return theme.colors.alertSuccessText;
      case 'warning': return theme.colors.alertWarningText;
      case 'error': return theme.colors.alertDangerText;
      case 'info': return theme.colors.alertInfoText;
      default: return theme.colors.alertDefaultText;
    }
  }};

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

const AlertIcon = styled.span`
  margin-right: 0.5rem;
  font-size: 1rem;
`;

const AlertMessage = styled.span`
  flex: 1;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-left: 0.5rem;
  opacity: 0.7;
  
  &:hover {
    opacity: 1;
  }
`;

const getAlertIcon = (type: AlertItem['type']): string => {
  switch (type) {
    case 'success': return 'fa-check-circle';
    case 'warning': return 'fa-exclamation-triangle';
    case 'error': return 'fa-times-circle';
    case 'info': return 'fa-info-circle';
    default: return 'fa-bell';
  }
};

interface AlertToastsProps {
  alerts: AlertItem[];
  onDismiss: (id: string) => void;
}

export const AlertToasts: React.FC<AlertToastsProps> = ({ alerts, onDismiss }) => {
  if (alerts.length === 0) return null;

  return (
    <AlertContainer>
      {alerts.map((alert) => (
        <AlertItemStyled key={alert.id} $variant={alert.type}>
          <AlertIcon>
            <Icon name={getAlertIcon(alert.type)} />
          </AlertIcon>
          <AlertMessage>{alert.message}</AlertMessage>
          <CloseButton onClick={() => onDismiss(alert.id)}>
            <Icon name="fa-times" />
          </CloseButton>
        </AlertItemStyled>
      ))}
    </AlertContainer>
  );
};

export default AlertToasts;
