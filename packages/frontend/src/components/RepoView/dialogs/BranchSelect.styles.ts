import styled from 'styled-components';
import { Form } from 'react-bootstrap';

export const BranchFilter = styled(Form.Control)`
  margin-bottom: 0.5rem;
`;

export const BranchList = styled.div`
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius};
`;

export const BranchOption = styled.div<{ $selected?: boolean; $current?: boolean }>`
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: ${({ $selected, theme }) =>
    $selected ? theme.colors.primary : 'transparent'};
  color: ${({ $selected }) => ($selected ? 'white' : 'inherit')};

  &:hover {
    background-color: ${({ $selected, theme }) =>
      $selected ? theme.colors.primary : theme.colors.light};
  }

  ${({ $current }) =>
    $current &&
    `
    font-weight: 600;
  `}
`;

export const BranchName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
`;

export const BranchSection = styled.div`
  margin-bottom: 0.25rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

export const SectionHeader = styled.div`
  padding: 0.375rem 0.75rem;
  background-color: ${({ theme }) => theme.colors.light};
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.secondary};
`;
