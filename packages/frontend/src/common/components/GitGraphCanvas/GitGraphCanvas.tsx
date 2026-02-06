import React, { useMemo } from 'react';
import styled, { useTheme } from 'styled-components';

const SvgContainer = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  height: 100%;
  min-width: 20px;
`;

const StyledSvg = styled.svg`
  overflow: visible;
`;

interface GraphBlockTarget {
  source: number;
  target: number;
  isCommit: boolean;
  isMerge: boolean;
  branchIndex: number;
}

interface CommitWithGraph {
  hash: string;
  graphBlockTargets?: GraphBlockTarget[];
  parents?: string[];
}

interface GitGraphCanvasProps {
  commit: CommitWithGraph;
  prevCommit?: CommitWithGraph | null; // Newer commit (above in the list)
  nextCommit?: CommitWithGraph | null; // Older commit (below in the list)
  darkMode?: boolean;
  rowHeight?: number;
}

// Branch colors - cycling through a palette
const getBranchColors = (theme: any): string[] => [
  theme.colors.primary, // blue
  theme.colors.statusAdded, // green
  theme.colors.statusDeleted, // red
  theme.colors.statusChanged, // yellow
  theme.colors.statusMoved, // cyan
  theme.colors.statusRenamed, // purple
  theme.colors.warning, // orange
  theme.colors.info, // teal
  theme.colors.danger, // pink
  theme.colors.secondary, // gray
];

const getCommitBranchColor = (branchIndex: number, theme: any): string => {
  const colors = getBranchColors(theme);
  return colors[branchIndex % colors.length];
};

export const GitGraphCanvas: React.FC<GitGraphCanvasProps> = ({
  commit,
  prevCommit,
  nextCommit,
  darkMode = false,
  rowHeight = 40,
}) => {
  const theme = useTheme();
  const graphBlockTargets = commit.graphBlockTargets || [];
  const centerY = rowHeight / 2;
  const slotWidth = 14;
  const nodeRadius = 5;
  const leftPadding = 8;

  const getSafeHoriz = (slot: number): number => {
    return slot * slotWidth + leftPadding;
  };

  // Find commit block
  const commitBlock = useMemo(() => {
    return graphBlockTargets.find((x) => x.isCommit);
  }, [graphBlockTargets]);

  // Get slots that exist in adjacent commits for connecting lines
  const prevSlots = useMemo(() => {
    const slots = new Set<number>();
    prevCommit?.graphBlockTargets?.forEach((x) => {
      slots.add(x.source);
      if (x.source !== x.target) {
        slots.add(x.target);
      }
    });
    return slots;
  }, [prevCommit]);

  const nextSlots = useMemo(() => {
    const slots = new Set<number>();
    nextCommit?.graphBlockTargets?.forEach((x) => {
      slots.add(x.source);
      if (x.source !== x.target) {
        slots.add(x.target);
      }
    });
    return slots;
  }, [nextCommit]);

  // Calculate what to draw
  const { straightLines, commitLine, mergeLines } = useMemo(() => {
    const straight: Array<{ slot: number; branchIndex: number }> = [];
    const merges: GraphBlockTarget[] = [];
    
    graphBlockTargets.forEach((block) => {
      if (block.source === block.target) {
        if (!block.isCommit) {
          straight.push({ slot: block.source, branchIndex: block.branchIndex });
        }
      } else {
        merges.push(block);
      }
    });
    
    return {
      straightLines: straight,
      commitLine: commitBlock ? { slot: commitBlock.source, branchIndex: commitBlock.branchIndex } : null,
      mergeLines: merges,
    };
  }, [graphBlockTargets, commitBlock]);

  const svgWidth = useMemo(() => {
    if (graphBlockTargets.length === 0) return 30;
    const maxSlot = Math.max(
      ...graphBlockTargets.map((x) => Math.max(x.target, x.source))
    );
    return getSafeHoriz(maxSlot + 1) + 4;
  }, [graphBlockTargets]);

  // For commits without graph data, draw a simple line
  if (graphBlockTargets.length === 0) {
    const hasParent = commit.parents && commit.parents.length > 0;
    const hasChild = prevCommit !== null;
    
    return (
      <SvgContainer style={{ width: 30 }}>
        <StyledSvg width={30} height={rowHeight}>
          {/* Vertical line - only if there's a connection */}
          <line
            x1={leftPadding}
            y1={hasChild ? 0 : centerY}
            x2={leftPadding}
            y2={hasParent ? rowHeight : centerY}
            stroke={theme.colors.primary}
            strokeWidth={2}
          />
          {/* White background for commit dot */}
          <circle
            cx={leftPadding}
            cy={centerY}
            r={nodeRadius + 2}
            fill={theme.colors.background}
          />
          {/* Commit dot */}
          <circle
            cx={leftPadding}
            cy={centerY}
            r={nodeRadius}
            fill={theme.colors.primary}
          />
        </StyledSvg>
      </SvgContainer>
    );
  }

  return (
    <SvgContainer style={{ width: svgWidth }}>
      <StyledSvg width={svgWidth} height={rowHeight}>
        {/* Layer 1: Straight-through vertical lines (non-commit slots) */}
        {straightLines.map(({ slot, branchIndex }) => {
          // Check if this line connects to adjacent rows
          const connectsUp = prevSlots.has(slot);
          const connectsDown = nextSlots.has(slot);
          
          return (
            <line
              key={`straight-${slot}`}
              x1={getSafeHoriz(slot)}
              y1={connectsUp ? 0 : centerY}
              x2={getSafeHoriz(slot)}
              y2={connectsDown ? rowHeight : centerY}
              stroke={getCommitBranchColor(branchIndex, theme)}
              strokeWidth={2}
            />
          );
        })}

        {/* Layer 2: Commit slot vertical line */}
        {commitLine && (
          <line
            x1={getSafeHoriz(commitLine.slot)}
            y1={prevSlots.has(commitLine.slot) ? 0 : centerY}
            x2={getSafeHoriz(commitLine.slot)}
            y2={nextSlots.has(commitLine.slot) ? rowHeight : centerY}
            stroke={getCommitBranchColor(commitLine.branchIndex, theme)}
            strokeWidth={2}
          />
        )}

        {/* Layer 3: Merge/branch curves */}
        {mergeLines.map((block, i) => {
          const sourceX = getSafeHoriz(block.source);
          const targetX = getSafeHoriz(block.target);
          
          // Curve goes from source at centerY up to target at top of cell
          // Control points create a smooth S-curve
          const controlY1 = centerY - 15;
          const controlY2 = 5;
          const endY = prevSlots.has(block.target) ? 0 : centerY;
          
          const path = `M${sourceX} ${centerY} C ${sourceX} ${controlY1}, ${targetX} ${controlY2}, ${targetX} ${endY}`;
          
          return (
            <path
              key={`curve-${i}`}
              d={path}
              stroke={getCommitBranchColor(block.branchIndex, theme)}
              strokeWidth={2}
              fill="none"
            />
          );
        })}

        {/* Layer 4: Commit node (on top to cover lines) */}
        {commitBlock && (
          <g>
            {/* White background to cover the vertical line */}
            <circle
              cx={getSafeHoriz(commitBlock.source)}
              cy={centerY}
              r={nodeRadius + 2}
              fill={theme.colors.background}
            />
            {/* Outer ring for merges */}
            {commitBlock.isMerge && (
              <circle
                cx={getSafeHoriz(commitBlock.source)}
                cy={centerY}
                r={nodeRadius + 1}
                fill="none"
                stroke={getCommitBranchColor(commitBlock.branchIndex, theme)}
                strokeWidth={2}
              />
            )}
            {/* Main commit dot */}
            <circle
              cx={getSafeHoriz(commitBlock.source)}
              cy={centerY}
              r={commitBlock.isMerge ? nodeRadius - 1 : nodeRadius}
              fill={getCommitBranchColor(commitBlock.branchIndex, theme)}
            />
          </g>
        )}
      </StyledSvg>
    </SvgContainer>
  );
};

export default GitGraphCanvas;
