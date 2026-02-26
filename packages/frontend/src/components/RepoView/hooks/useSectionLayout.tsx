import React, { useCallback, useMemo, useState } from 'react';
import { Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useSettingsStore } from '../../../stores';
import type { RepoSectionLayout, SectionCardLayout } from '../../../stores/settingsStore';
import { CardId } from '@light-git/shared';
import { EditableCard } from '../EditableCard';
import { DroppableColumn } from '../RepoView.styles';

// Card configuration: defines the default column and order for each card section
export interface CardConfig {
  id: CardId;
  title: string;
  defaultColumn: number; // 0=left, 1=middle, 2=right
  defaultOrder: number;
}

export const CARD_CONFIGS: CardConfig[] = [
  { id: CardId.LocalBranches, title: 'Local Branches', defaultColumn: 0, defaultOrder: 0 },
  { id: CardId.RemoteBranches, title: 'Remote Branches', defaultColumn: 0, defaultOrder: 1 },
  { id: CardId.Worktrees, title: 'Worktrees', defaultColumn: 0, defaultOrder: 2 },
  { id: CardId.Submodules, title: 'Submodules', defaultColumn: 0, defaultOrder: 3 },
  { id: CardId.Stashes, title: 'Stashes', defaultColumn: 0, defaultOrder: 4 },
  { id: CardId.CommandHistory, title: 'Command History', defaultColumn: 0, defaultOrder: 5 },
  { id: CardId.StagedChanges, title: 'Staged Changes', defaultColumn: 1, defaultOrder: 0 },
  { id: CardId.UnstagedChanges, title: 'Unstaged Changes', defaultColumn: 1, defaultOrder: 1 },
  { id: CardId.CommitHistory, title: 'Commit History', defaultColumn: 2, defaultOrder: 0 },
];

function getDefaultLayout(): RepoSectionLayout {
  const layout: RepoSectionLayout = {};
  for (const config of CARD_CONFIGS) {
    layout[config.id] = {
      visible: true,
      order: config.defaultOrder,
      column: config.defaultColumn,
    };
  }
  return layout;
}

function getEffectiveLayout(persisted: RepoSectionLayout | undefined): RepoSectionLayout {
  const defaults = getDefaultLayout();
  if (!persisted) return defaults;
  const result: RepoSectionLayout = { ...defaults };
  for (const [id, val] of Object.entries(persisted)) {
    if (result[id]) {
      result[id] = val;
    }
  }
  return result;
}

function getColumnCards(layout: RepoSectionLayout, column: number): { id: string; config: SectionCardLayout }[] {
  return Object.entries(layout)
    .filter(([, cfg]) => cfg.column === column)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([id, config]) => ({ id, config }));
}

/**
 * Hook providing section layout management: edit mode, drag-and-drop, card visibility.
 */
export function useSectionLayout(repoPath: string) {
  const [isEditingSections, setIsEditingSections] = useState(false);
  const persistedLayout = useSettingsStore((state) => state.settings.sectionLayouts[repoPath]);
  const setSectionLayout = useSettingsStore((state) => state.setSectionLayout);

  const sectionLayout = useMemo(() => getEffectiveLayout(persistedLayout), [persistedLayout]);

  const leftCards = useMemo(() => getColumnCards(sectionLayout, 0), [sectionLayout]);
  const middleCards = useMemo(() => getColumnCards(sectionLayout, 1), [sectionLayout]);
  const rightCards = useMemo(() => getColumnCards(sectionLayout, 2), [sectionLayout]);

  const leftHasVisible = useMemo(() => leftCards.some((c) => c.config.visible), [leftCards]);
  const middleHasVisible = useMemo(() => middleCards.some((c) => c.config.visible), [middleCards]);
  const rightHasVisible = useMemo(() => rightCards.some((c) => c.config.visible), [rightCards]);

  const handleToggleCardVisibility = useCallback(
    (cardId: string) => {
      const current = sectionLayout[cardId];
      if (!current) return;
      const newLayout: RepoSectionLayout = {
        ...sectionLayout,
        [cardId]: { ...current, visible: !current.visible },
      };
      setSectionLayout(repoPath, newLayout);
    },
    [sectionLayout, setSectionLayout, repoPath],
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const sourceDroppableId = result.source.droppableId;
      const destDroppableId = result.destination.droppableId;
      if (sourceDroppableId !== destDroppableId) return;

      const columnIndex = parseInt(sourceDroppableId.replace('column-', ''), 10);
      const columnCards = getColumnCards(sectionLayout, columnIndex);
      const reordered = [...columnCards];
      const [moved] = reordered.splice(result.source.index, 1);
      reordered.splice(result.destination.index, 0, moved);

      const newLayout: RepoSectionLayout = { ...sectionLayout };
      reordered.forEach((card, idx) => {
        newLayout[card.id] = { ...newLayout[card.id], order: idx };
      });
      setSectionLayout(repoPath, newLayout);
    },
    [sectionLayout, setSectionLayout, repoPath],
  );

  const cardTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cfg of CARD_CONFIGS) {
      map[cfg.id] = cfg.title;
    }
    return map;
  }, []);

  // Render a column's cards, optionally wrapped with drag-and-drop
  const renderColumnCards = useCallback(
    (
      cards: { id: string; config: SectionCardLayout }[],
      columnIndex: number,
      cardComponents: Record<string, React.ReactNode>,
    ) => {
      if (isEditingSections) {
        return (
          <Droppable droppableId={`column-${columnIndex}`}>
            {(provided) => (
              <DroppableColumn ref={provided.innerRef} {...provided.droppableProps}>
                {cards.map((card, index) => (
                  <Draggable key={card.id} draggableId={card.id} index={index}>
                    {(dragProvided) => (
                      <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                        <EditableCard
                          cardId={card.id}
                          cardTitle={cardTitleMap[card.id] || card.id}
                          visible={card.config.visible}
                          onToggleVisibility={handleToggleCardVisibility}
                          dragHandleProps={dragProvided.dragHandleProps}
                        >
                          {cardComponents[card.id]}
                        </EditableCard>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </DroppableColumn>
            )}
          </Droppable>
        );
      }

      // Normal mode: render visible cards without DnD wrappers
      return cards
        .filter((card) => card.config.visible)
        .map((card) => (
          <React.Fragment key={card.id}>{cardComponents[card.id]}</React.Fragment>
        ));
    },
    [isEditingSections, cardTitleMap, handleToggleCardVisibility],
  );

  return {
    isEditingSections,
    setIsEditingSections,
    sectionLayout,
    leftCards,
    middleCards,
    rightCards,
    leftHasVisible,
    middleHasVisible,
    rightHasVisible,
    handleDragEnd,
    handleToggleCardVisibility,
    renderColumnCards,
    cardTitleMap,
  };
}
