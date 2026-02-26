import React from 'react';
import styled from 'styled-components';

const SwitchWrapper = styled.label<{ $disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  user-select: none;
  gap: 0.375rem;
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
`;

const HiddenInput = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

const SwitchTrack = styled.span<{ $checked: boolean }>`
  position: relative;
  width: 2rem;
  height: 1.125rem;
  border-radius: 999px;
  background-color: ${({ $checked, theme }) =>
    $checked ? theme.colors.primary : theme.colors.secondary + '60'};
  transition: background-color 0.2s ease;
  flex-shrink: 0;
`;

const SwitchThumb = styled.span<{ $checked: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ $checked }) => ($checked ? 'calc(100% - 2px - 0.875rem)' : '2px')};
  width: 0.875rem;
  height: 0.875rem;
  border-radius: 50%;
  background-color: white;
  transition: left 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
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
    <SwitchWrapper className={className} $disabled={disabled}>
      <HiddenInput
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <SwitchTrack $checked={checked}>
        <SwitchThumb $checked={checked} />
      </SwitchTrack>
      {children && <LabelText>{children}</LabelText>}
    </SwitchWrapper>
  );
};

export default PrettyCheckbox;
