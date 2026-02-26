import React from 'react';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const SpinnerWrapper = styled.div<{ size?: string; center?: boolean }>`
  display: ${({ center }) => (center ? 'flex' : 'inline-flex')};
  align-items: center;
  justify-content: center;
  ${({ center }) => center && 'width: 100%; height: 100%;'}
`;

const Spinner = styled.div<{ size?: string }>`
  width: ${({ size }) => size || '2rem'};
  height: ${({ size }) => size || '2rem'};
  border: 3px solid ${({ theme }) => theme.colors.light};
  border-top-color: ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const SpinnerLabel = styled.span`
  margin-left: 0.5rem;
`;

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  center?: boolean;
  label?: string;
}

const sizeMap = {
  sm: '1rem',
  md: '2rem',
  lg: '3rem',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  center = false,
  label,
}) => {
  return (
    <SpinnerWrapper center={center}>
      <Spinner size={sizeMap[size]} />
      {label && <SpinnerLabel>{label}</SpinnerLabel>}
    </SpinnerWrapper>
  );
};

export default LoadingSpinner;
