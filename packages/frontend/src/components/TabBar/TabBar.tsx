import React, { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Button, Form, InputGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useRepositoryStore, ITabInfo } from '../../stores';
import { Icon } from '@light-git/core';

const TabContainer = styled.div`
  display: flex;
  flex-grow: 1;
  gap: 0.25rem;
  overflow-x: auto;
  padding: 0 0.5rem;

  &::-webkit-scrollbar {
    height: 4px;
  }
`;

const DroppableContainer = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const TabButton = styled.div<{ $active: boolean; $isDragging?: boolean }>`
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius};
  background-color: ${({ $active, $isDragging, theme }) =>
    $isDragging
      ? theme.colors.info
      : $active
      ? theme.colors.primary
      : theme.colors.light};
  color: ${({ $active, $isDragging, theme }) => ($active || $isDragging ? theme.colors.white : 'inherit')};
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
  box-shadow: ${({ $isDragging }) =>
    $isDragging ? '0 4px 8px rgba(0, 0, 0, 0.2)' : 'none'};

  &:hover {
    background-color: ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border};
  }
`;

const TabName = styled.span`
  margin-right: 0.5rem;
`;

const CloseTabButton = styled.span`
  margin-left: 0.25rem;
  padding: 0.125rem;
  opacity: 0.7;
  cursor: pointer;

  &:hover {
    opacity: 1;
  }
`;

const DragHandle = styled.span`
  margin-right: 0.25rem;
  opacity: 0.5;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
`;

const AddTabButton = styled(Button)`
  flex-shrink: 0;
`;

const EditInput = styled(Form.Control)`
  min-width: 100px;
  max-width: 200px;
`;

interface TabBarProps {
  onLoadRepo: (path: string) => void;
}

// Generate unique ID for a tab
const generateTabId = (tab: ITabInfo, index: number): string => {
  // Use path if available, otherwise use a combination of name and index
  return tab.path || `tab-${tab.name || 'new'}-${index}`;
};

export const TabBar: React.FC<TabBarProps> = ({ onLoadRepo }) => {
  const tabs = useRepositoryStore((state) => state.tabs);
  const activeTabIndex = useRepositoryStore((state) => state.activeTabIndex);
  const setActiveTabIndex = useRepositoryStore((state) => state.setActiveTabIndex);
  const addTab = useRepositoryStore((state) => state.addTab);
  const removeTab = useRepositoryStore((state) => state.removeTab);
  const updateTabName = useRepositoryStore((state) => state.updateTabName);
  const moveTab = useRepositoryStore((state) => state.moveTab);

  const [editingTab, setEditingTab] = useState(-1);
  const [editedName, setEditedName] = useState('');

  // Generate stable IDs for tabs
  const tabIds = useMemo(() => {
    const ids: string[] = [];
    const usedIds = new Set<string>();
    
    tabs.forEach((tab, index) => {
      let id = tab.path || `tab-${index}`;
      // Ensure uniqueness
      let counter = 0;
      let uniqueId = id;
      while (usedIds.has(uniqueId)) {
        counter++;
        uniqueId = `${id}-${counter}`;
      }
      usedIds.add(uniqueId);
      ids.push(uniqueId);
    });
    
    return ids;
  }, [tabs]);

  const handleTabClick = useCallback(
    (index: number) => {
      setActiveTabIndex(index);
      // If the tab has a repo path, make sure the git client is loaded
      const tab = tabs[index];
      if (tab?.path) {
        onLoadRepo(tab.path);
      }
    },
    [setActiveTabIndex, tabs, onLoadRepo]
  );

  const handleAddTab = useCallback(() => {
    addTab({ name: '', path: '' });
  }, [addTab]);

  const handleCloseTab = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      removeTab(index);
    },
    [removeTab]
  );

  const handleEditClick = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      setEditingTab(index);
      setEditedName(tabs[index]?.name || '');
    },
    [tabs]
  );

  const handleSaveEdit = useCallback(
    (index: number) => {
      updateTabName(index, editedName);
      setEditingTab(-1);
      setEditedName('');
    },
    [editedName, updateTabName]
  );

  const handleCancelEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTab(-1);
    setEditedName('');
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === 'Enter') {
        handleSaveEdit(index);
      } else if (e.key === 'Escape') {
        setEditingTab(-1);
      }
    },
    [handleSaveEdit]
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;

      const sourceIndex = result.source.index;
      const destinationIndex = result.destination.index;

      if (sourceIndex === destinationIndex) return;

      moveTab(sourceIndex, destinationIndex);
    },
    [moveTab]
  );

  return (
    <TabContainer>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="tabs" direction="horizontal">
          {(droppableProvided, droppableSnapshot) => (
            <DroppableContainer
              ref={droppableProvided.innerRef}
              {...droppableProvided.droppableProps}
            >
              {tabs.map((tab, index) => {
                const tabId = tabIds[index];
                return (
                  <Draggable
                    key={tabId}
                    draggableId={tabId}
                    index={index}
                    isDragDisabled={editingTab === index}
                  >
                    {(draggableProvided, draggableSnapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                      >
                        <OverlayTrigger
                          placement="bottom"
                          overlay={<Tooltip id={`tooltip-${tabId}`}>{tab.path || 'No repo loaded'}</Tooltip>}
                        >
                          <TabButton
                            $active={index === activeTabIndex}
                            $isDragging={draggableSnapshot.isDragging}
                            onClick={() => handleTabClick(index)}
                          >
                            {editingTab === index ? (
                              <InputGroup size="sm">
                                <EditInput
                                  value={editedName}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setEditedName(e.target.value)
                                  }
                                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                                    handleKeyDown(e, index)
                                  }
                                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                  autoFocus
                                />
                                <Button variant="light" size="sm" onClick={handleCancelEdit}>
                                  <Icon name="fa-times-circle" />
                                </Button>
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => handleSaveEdit(index)}
                                >
                                  <Icon name="fa-check" />
                                </Button>
                              </InputGroup>
                            ) : (
                              <>
                                <DragHandle {...draggableProvided.dragHandleProps}>
                                  <Icon name="fa-grip-vertical" size="sm" />
                                </DragHandle>
                                <TabName>{tab.name || 'New Tab'}</TabName>
                                <CloseTabButton onClick={(e) => handleEditClick(e, index)}>
                                  <Icon name="edit" size="sm" />
                                </CloseTabButton>
                                <CloseTabButton onClick={(e) => handleCloseTab(e, index)}>
                                  <Icon name="close" size="sm" />
                                </CloseTabButton>
                              </>
                            )}
                          </TabButton>
                        </OverlayTrigger>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {droppableProvided.placeholder}
            </DroppableContainer>
          )}
        </Droppable>
      </DragDropContext>
      <AddTabButton variant="secondary" onClick={handleAddTab}>
        <Icon name="add" />
      </AddTabButton>
    </TabContainer>
  );
};

export default TabBar;
