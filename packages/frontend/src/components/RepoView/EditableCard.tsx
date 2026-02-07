import React, { ReactNode } from 'react';
import { Icon } from '@light-git/core';
import { useEditSections } from './EditSectionsContext';
import {
  EditCardContainer,
  EditOverlay,
  EditOverlayButtons,
  EditButton,
  DragHandle,
  HiddenCardPlaceholder,
} from './RepoView.styles';

interface EditableCardProps {
  cardId: string;
  cardTitle: string;
  visible: boolean;
  onToggleVisibility: (cardId: string) => void;
  dragHandleProps?: any;
  children: ReactNode;
}

export const EditableCard: React.FC<EditableCardProps> = ({
  cardId,
  cardTitle,
  visible,
  onToggleVisibility,
  dragHandleProps,
  children,
}) => {
  const { isEditing } = useEditSections();

  if (!isEditing) {
    // Normal mode: render card directly, hide if not visible
    return visible ? <>{children}</> : null;
  }

  // Edit mode: hidden cards show a placeholder
  if (!visible) {
    return (
      <HiddenCardPlaceholder>
        <span>{cardTitle}</span>
        <EditButton
          onClick={() => onToggleVisibility(cardId)}
          title="Show section"
        >
          <Icon name="fa-eye-slash" />
        </EditButton>
      </HiddenCardPlaceholder>
    );
  }

  // Edit mode: visible cards show the overlay
  return (
    <EditCardContainer>
      {children}
      <EditOverlay />
      <EditOverlayButtons>
        <EditButton
          onClick={() => onToggleVisibility(cardId)}
          title="Hide section"
        >
          <Icon name="fa-eye" />
        </EditButton>
        <DragHandle {...dragHandleProps} title="Drag to reorder">
          <Icon name="fa-grip-vertical" />
        </DragHandle>
      </EditOverlayButtons>
    </EditCardContainer>
  );
};

export default EditableCard;
