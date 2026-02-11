import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

const TooltipContainer = styled.div`
  position: relative;
  display: inline-flex;
`;

const TooltipContent = styled.div<{ $visible: boolean; $position: 'top' | 'bottom' | 'left' | 'right' }>`
  position: absolute;
  z-index: 1070;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.white};
  background-color: ${({ theme }) => theme.colors.black}d9;
  border-radius: 0.25rem;
  white-space: nowrap;
  pointer-events: none;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity 0.15s ease-in-out;
  
  ${({ $position }) => {
    switch ($position) {
      case 'top':
        return `
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 0.25rem;
        `;
      case 'bottom':
        return `
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 0.25rem;
        `;
      case 'left':
        return `
          right: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-right: 0.25rem;
        `;
      case 'right':
        return `
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-left: 0.25rem;
        `;
      default:
        return '';
    }
  }}
  
  &::after {
    content: '';
    position: absolute;
    border: 5px solid transparent;
    
    ${({ $position }) => {
      switch ($position) {
        case 'top':
          return `
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border-top-color: ${({ theme }) => theme.colors.black}d9;
          `;
        case 'bottom':
          return `
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            border-bottom-color: ${({ theme }) => theme.colors.black}d9;
          `;
        case 'left':
          return `
            left: 100%;
            top: 50%;
            transform: translateY(-50%);
            border-left-color: ${({ theme }) => theme.colors.black}d9;
          `;
        case 'right':
          return `
            right: 100%;
            top: 50%;
            transform: translateY(-50%);
            border-right-color: ${({ theme }) => theme.colors.black}d9;
          `;
        default:
          return '';
      }
    }}
  }
`;

interface TooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  delay = 200,
  children,
}) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!content) {
    return <>{children}</>;
  }

  return (
    <TooltipContainer
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      <TooltipContent $visible={visible} $position={position}>
        {content}
      </TooltipContent>
    </TooltipContainer>
  );
};

export default Tooltip;
