import styled from 'styled-components';

// ==================== Layout Components ====================

export const FlexRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const FlexColumn = styled.div`
  display: flex;
  flex-direction: column;
`;

export const FlexGrow = styled.div`
  flex-grow: 1;
`;

export const FlexShrink = styled.div`
  flex-shrink: 0;
`;

export const FullWidth = styled.div`
  width: 100%;
`;

// ==================== Card Components ====================

export const Card = styled.div`
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadows.material};
  margin-bottom: 0.5rem;
  overflow: hidden;
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: ${({ theme }) => theme.colors.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  gap: 0.5rem;
`;

export const CardBody = styled.div`
  padding: 0.75rem;
`;

export const CardTitle = styled.h5`
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
`;

// ==================== Button Components ====================

export const ButtonGroup = styled.div`
  display: flex;
  gap: 0.25rem;

  & > button {
    border-radius: 0;
  }

  & > button:first-child {
    border-top-left-radius: ${({ theme }) => theme.borderRadius};
    border-bottom-left-radius: ${({ theme }) => theme.borderRadius};
  }

  & > button:last-child {
    border-top-right-radius: ${({ theme }) => theme.borderRadius};
    border-bottom-right-radius: ${({ theme }) => theme.borderRadius};
  }
`;

export const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.borderRadius};
  transition: background-color 0.2s;

  &:hover {
    background-color: ${({ theme }) => theme.colors.light};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// ==================== Form Components ====================

export const FilterInput = styled.input`
  flex: 1;
  min-width: 100px;
  padding: 0.25rem 0.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

export const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

export const Label = styled.label`
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
`;

// ==================== Badge Components ====================

export const Badge = styled.span<{ variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 10rem;
  background-color: ${({ theme, variant = 'secondary' }) => theme.colors[variant]};
  color: ${({ variant = 'secondary', theme }) =>
    variant === 'light' || variant === 'warning' ? theme.colors.text : theme.colors.white};
`;

// ==================== Status Indicators ====================

export const StatusDot = styled.span<{ status: 'changed' | 'moved' | 'renamed' | 'added' | 'deleted' }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 0.5rem;
  background-color: ${({ theme, status }) => {
    switch (status) {
      case 'changed': return theme.colors.statusChanged;
      case 'moved': return theme.colors.statusMoved;
      case 'renamed': return theme.colors.statusRenamed;
      case 'added': return theme.colors.statusAdded;
      case 'deleted': return theme.colors.statusDeleted;
      default: return theme.colors.secondary;
    }
  }};
`;

// ==================== List Components ====================

export const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

export const ListItem = styled.li<{ selected?: boolean }>`
  display: flex;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  cursor: pointer;
  background-color: ${({ theme, selected }) =>
    selected ? theme.colors.light : 'transparent'};

  &:hover {
    background-color: ${({ theme }) => theme.colors.light};
  }

  &:last-child {
    border-bottom: none;
  }
`;

// ==================== Scrollable Container ====================

export const ScrollableContainer = styled.div`
  overflow-y: auto;
  max-height: 100%;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.colors.secondary};
    border-radius: 3px;
  }
`;

// ==================== Column Layout ====================

export const RepoColumn = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 0.25rem;
  gap: 0.5rem;
`;

export const ThreeColumnLayout = styled.div`
  display: grid;
  grid-template-columns: 3fr 4fr 5fr;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem;

  @media (max-width: 992px) {
    grid-template-columns: 1fr;
  }
`;

// ==================== Alert Components ====================

export const AlertContainer = styled.div<{ variant: 'success' | 'warning' | 'danger' | 'info' }>`
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: ${({ theme }) => theme.borderRadius};
  gap: 0.5rem;
  background-color: ${({ variant, theme }) => {
    switch (variant) {
      case 'success': return theme.colors.alertSuccessBg;
      case 'warning': return theme.colors.alertWarningBg;
      case 'danger': return theme.colors.alertDangerBg;
      case 'info': return theme.colors.alertInfoBg;
      default: return theme.colors.alertDefaultBg;
    }
  }};
  color: ${({ variant, theme }) => {
    switch (variant) {
      case 'success': return theme.colors.alertSuccessText;
      case 'warning': return theme.colors.alertWarningText;
      case 'danger': return theme.colors.alertDangerText;
      case 'info': return theme.colors.alertInfoText;
      default: return theme.colors.alertDefaultText;
    }
  }};
`;

// ==================== Tooltip Wrapper ====================

export const TooltipWrapper = styled.span`
  position: relative;
  display: inline-flex;
`;
