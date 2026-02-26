import React, { useCallback, ReactNode } from 'react';
import styled from 'styled-components';
import { useSettingsStore } from '../../stores';
import { Icon } from '@light-git/core';

const CardContainer = styled.div<{ $isExpanded?: boolean; $shrinkWrap?: boolean }>`
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadows.material};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  ${({ $isExpanded, $shrinkWrap }) =>
    $isExpanded && !$shrinkWrap
      ? `flex: 1 1 0;`
      : `flex: 0 0 auto;`
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background-color: ${({ theme }) => theme.colors.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  cursor: pointer;
  user-select: none;

  &:hover {
    background-color: ${({ theme }) => theme.colors.border};
  }
`;

const ExpandIcon = styled.span<{ expanded: boolean }>`
  margin-right: 0.5rem;
  transition: transform 0.2s;
  transform: rotate(${({ expanded }) => (expanded ? '90deg' : '0deg')});
`;

const CardIcon = styled.span`
  margin-right: 0.5rem;
`;

const CardTitle = styled.span`
  font-weight: 500;
  flex-shrink: 0;
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  margin-left: 0.5rem;
  gap: 0.5rem;
`;

const CardBody = styled.div<{ expanded: boolean }>`
  display: ${({ expanded }) => (expanded ? 'block' : 'none')};
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background-color: ${({ theme }) => theme.colors.cardBodyBg};
`;

interface LayoutCardProps {
  title: string;
  iconClass?: string;
  expandKey: string;
  children: ReactNode;
  headerContent?: ReactNode;
  customBodyClass?: string;
  defaultExpanded?: boolean;
  fillHeight?: boolean; // kept for API compat, no longer used
  /** When true, the card stays content-sized instead of growing to fill available space */
  shrinkWrap?: boolean;
  onScroll?: () => void;
  onScrollUp?: () => void;
}

export const LayoutCard: React.FC<LayoutCardProps> = ({
  title,
  iconClass,
  expandKey,
  children,
  headerContent,
  customBodyClass,
  defaultExpanded = true,
  shrinkWrap = false,
  onScroll,
  onScrollUp,
}) => {
  // Subscribe to the specific expand state value so we re-render when it changes
  const isExpanded = useSettingsStore(
    (state) => state.settings.expandStates[expandKey] ?? defaultExpanded
  );
  const setExpandState = useSettingsStore((state) => state.setExpandState);

  const toggleExpand = useCallback((e: React.MouseEvent) => {
    // Don't toggle the card when clicking on buttons, dropdowns, or inputs
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, label, .dropdown-menu, .dropdown-item, .dropdown-toggle, .btn, .form-check, .form-switch')) {
      return;
    }
    setExpandState(expandKey, !isExpanded);
  }, [expandKey, isExpanded, setExpandState]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      const isAtBottom =
        target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
      const isAtTop = target.scrollTop < 50;

      if (isAtBottom && onScroll) {
        onScroll();
      }
      if (isAtTop && onScrollUp) {
        onScrollUp();
      }
    },
    [onScroll, onScrollUp]
  );

  return (
    <CardContainer $isExpanded={isExpanded} $shrinkWrap={shrinkWrap}>
      <CardHeader onClick={toggleExpand}>
        <ExpandIcon expanded={isExpanded}>
          <Icon name="fa-chevron-right" size="sm" />
        </ExpandIcon>
        {iconClass && (
          <CardIcon>
            <i className={iconClass} />
          </CardIcon>
        )}
        <CardTitle>{title}</CardTitle>
        {headerContent && <HeaderContent>{headerContent}</HeaderContent>}
      </CardHeader>
      <CardBody
        expanded={isExpanded}
        onScroll={handleScroll}
      >
        {children}
      </CardBody>
    </CardContainer>
  );
};

export default LayoutCard;
