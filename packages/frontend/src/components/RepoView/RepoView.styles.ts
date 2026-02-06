import styled from 'styled-components';

export const RepoViewContainer = styled.div`
  display: grid;
  grid-template-columns: 3fr 4fr 5fr;
  gap: 0.5rem;
  width: 100%;
  height: calc(100vh - 60px);
  padding: 0.5rem;
  background-color: ${({ theme }) => theme.colors.background};

  @media (max-width: 1200px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

export const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.colors.secondary};
    border-radius: 3px;
  }
`;

export const RepoTitle = styled.h1`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  margin: 0;
  padding: 0.5rem 0;
`;

export const TitleButtonGroup = styled.div`
  display: inline-flex;
  gap: 0.25rem;
  margin-left: 0.5rem;
`;

export const CardWrapper = styled.div`
  flex-shrink: 0;
`;

export const FlexGrowCard = styled.div`
  flex: 1;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

// Card header components
export const CardHeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  flex-wrap: wrap;
  min-width: 0;
`;

export const CardFilterInput = styled.input`
  flex: 1;
  min-width: 80px;
  padding: 0.25rem 0.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

export const CardHeaderButtons = styled.div`
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
  flex-wrap: wrap;
`;

// Branch/file list item
export const ListItemRow = styled.div<{ selected?: boolean }>`
  display: flex;
  align-items: center;
  padding: 0.375rem 0.5rem;
  cursor: pointer;
  background-color: ${({ selected, theme }) =>
    selected ? theme.colors.light : 'transparent'};
  border-radius: ${({ theme }) => theme.borderRadius};

  &:hover {
    background-color: ${({ theme }) => theme.colors.light};
  }
`;

export const ListItemName = styled.span<{ bold?: boolean }>`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: ${({ bold }) => (bold ? 'bold' : 'normal')};
`;

export const ListItemActions = styled.div`
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
  margin-left: 0.5rem;
`;

// Commit form
export const CommitFormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
`;

export const CommitFormRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const CommitMessageInput = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 0.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-family: ${({ theme }) => theme.fonts.primary};
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

// Alert/banner for active operations
export const OperationBanner = styled.div<{ variant: 'warning' | 'info' | 'danger' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.borderRadius};
  background-color: ${({ variant, theme }) => {
    switch (variant) {
      case 'warning': return theme.colors.alertWarningBg;
      case 'info': return theme.colors.alertInfoBg;
      case 'danger': return theme.colors.alertDangerBg;
      default: return theme.colors.alertDefaultBg;
    }
  }};
  color: ${({ variant, theme }) => {
    switch (variant) {
      case 'warning': return theme.colors.alertWarningText;
      case 'info': return theme.colors.alertInfoText;
      case 'danger': return theme.colors.alertDangerText;
      default: return theme.colors.alertDefaultText;
    }
  }};
`;
