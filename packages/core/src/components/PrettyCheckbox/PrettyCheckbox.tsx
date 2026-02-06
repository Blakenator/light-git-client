import React from 'react';
import styled from 'styled-components';

const CheckboxWrapper = styled.label`
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
`;

const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
`;

const StyledCheckbox = styled.span<{ checked: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  background-color: ${({ checked, theme }) =>
    checked ? theme.colors.primary : theme.colors.background};
  border: 2px solid ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.borderRadius};
  transition: all 0.2s ease;
  margin-right: 0.5rem;

  &:hover {
    border-color: ${({ theme }) => theme.colors.info};
  }

  &::after {
    content: '';
    display: ${({ checked }) => (checked ? 'block' : 'none')};
    width: 0.35rem;
    height: 0.6rem;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
    margin-bottom: 2px;
  }
`;

const LabelText = styled.span`
  font-size: 0.875rem;
`;

interface PrettyCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const PrettyCheckbox: React.FC<PrettyCheckboxProps> = ({
  checked,
  onChange,
  children,
  disabled = false,
  className,
}) => {
  return (
    <CheckboxWrapper className={className}>
      <HiddenCheckbox
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <StyledCheckbox checked={checked} />
      {children && <LabelText>{children}</LabelText>}
    </CheckboxWrapper>
  );
};

export default PrettyCheckbox;
