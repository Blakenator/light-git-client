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
  overflow: hidden;
`;

export const RepoTitle = styled.h1`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  margin: 0;
  padding: 0.5rem 0;
  flex: 0 0 auto;
`;

export const TitleButtonGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
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
export const OperationBanner = styled.div<{
  variant: 'warning' | 'info' | 'danger';
}>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.borderRadius};
  background-color: ${({ variant, theme }) => {
    switch (variant) {
      case 'warning':
        return theme.colors.alertWarningBg;
      case 'info':
        return theme.colors.alertInfoBg;
      case 'danger':
        return theme.colors.alertDangerBg;
      default:
        return theme.colors.alertDefaultBg;
    }
  }};
  color: ${({ variant, theme }) => {
    switch (variant) {
      case 'warning':
        return theme.colors.alertWarningText;
      case 'info':
        return theme.colors.alertInfoText;
      case 'danger':
        return theme.colors.alertDangerText;
      default:
        return theme.colors.alertDefaultText;
    }
  }};
`;

export const DroppableColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  min-height: 0;
`;

// Edit Sections mode styles

export const EditCardContainer = styled.div<{ $isHidden?: boolean }>`
  position: relative;
  ${({ $isHidden }) => $isHidden && `opacity: 0.5;`}
`;

export const EditOverlay = styled.div`
  position: absolute;
  inset: 0;
  background-color: rgba(128, 128, 128, 0.5);
  border: 2px solid #888;
  border-radius: 4px;
  z-index: 5;
  pointer-events: none;
`;

export const EditOverlayButtons = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 4px;
  z-index: 6;
  pointer-events: auto;
`;

export const EditButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.9);
  color: #333;
  cursor: pointer;
  padding: 0;
  font-size: 14px;

  &:hover {
    background-color: #fff;
  }
`;

export const DragHandle = styled(EditButton)`
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
`;

export const HiddenCardPlaceholder = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background-color: ${({ theme }) => theme.colors.light};
  border: 2px dashed #aaa;
  border-radius: 4px;
  opacity: 0.6;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;

export const EllipsisDropdownWrapper = styled.div`
  margin-left: 0.25rem;

  .dropdown-toggle {
    background: none !important;
    border: none !important;
    color: inherit !important;
    padding: 0.25rem 0.5rem;
    font-size: 1.1rem;
    line-height: 1;
    box-shadow: none !important;

    &::after {
      display: none;
    }

    &:hover {
      opacity: 0.7;
    }
  }
`;
