import React, { useMemo } from 'react';
import styled, { useTheme } from 'styled-components';

/**
 * Absolutely-positioned SVG that fills the table cell.
 * overflow:hidden clips spacer lines at the cell boundary so they
 * aren't painted behind adjacent rows' td backgrounds.
 * Each row's curves (top half) and spacers (bottom half) meet
 * seamlessly at the cell boundary thanks to border-spacing: 0.
 */
const GraphSvg = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  pointer-events: none;
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
}

// Layout constants
const SLOT_WIDTH = 14;
const LEFT_PADDING = 8;
const NODE_RADIUS = 5;
const CENTER_Y = 22; // Vertical position of commit node within each row
const SPACER_Y = 2000; // Spacer lines extend far below to cover any row height

const getSafeHoriz = (slot: number): number => slot * SLOT_WIDTH + LEFT_PADDING;

// Branch color palette
const getBranchColors = (theme: any): string[] => [
  theme.colors.primary,
  theme.colors.statusAdded,
  theme.colors.statusDeleted,
  theme.colors.statusChanged,
  theme.colors.statusMoved,
  theme.colors.statusRenamed,
  theme.colors.warning,
  theme.colors.info,
  theme.colors.danger,
  theme.colors.secondary,
];

const getCommitBranchColor = (branchIndex: number, theme: any): string => {
  const colors = getBranchColors(theme);
  return colors[branchIndex % colors.length];
};

/**
 * Deduplicated spacer entry — one per active source slot.
 * Merges isCommit/isMerge flags when multiple blocks share a slot.
 */
interface SpacerEntry {
  source: number;
  isCommit: boolean;
  isMerge: boolean;
  branchIndex: number;
}

/**
 * Git graph visualization for a single commit row.
 *
 * Rendering strategy (matching the proven Angular approach):
 *   1. Curves UP   — from (source, CENTER_Y) to (target, 0) — connect to the row above
 *   2. Spacers DOWN — from (source, CENTER_Y) to (source, SPACER_Y) — extend into the row below
 *   3. Commit nodes — drawn last on top of all lines
 *
 * Each row is fully self-contained: no neighbor commit data needed.
 * The spacer overflow from row N visually connects to the curves in row N+1.
 */
export const GitGraphCanvas: React.FC<GitGraphCanvasProps> = ({ commit }) => {
  const theme = useTheme();
  const blocks = commit.graphBlockTargets || [];

  // Build spacer list: one entry per unique source slot, merging flags
  const spacerList = useMemo((): SpacerEntry[] => {
    const bySlot: (SpacerEntry | undefined)[] = [];
    blocks.forEach((x) => {
      const existing = bySlot[x.source];
      bySlot[x.source] = {
        source: x.source,
        isCommit: x.isCommit || (existing?.isCommit ?? false),
        isMerge: x.isMerge || (existing?.isMerge ?? false),
        branchIndex: existing?.branchIndex ?? x.branchIndex,
      };
    });
    return bySlot.filter((x): x is SpacerEntry => x !== undefined);
  }, [blocks]);

  // Blocks with target >= 0 draw curves connecting to the row above
  const curveBlocks = useMemo(
    () => blocks.filter((x) => x.target >= 0),
    [blocks],
  );

  // Calculate required width from the widest slot
  const svgWidth = useMemo(() => {
    if (blocks.length === 0) return 30;
    const maxSlot = Math.max(
      ...blocks.map((x) => Math.max(x.target >= 0 ? x.target : 0, x.source)),
    );
    return getSafeHoriz(maxSlot + 1) + 4;
  }, [blocks]);

  // Fallback: no graph data — simple dot with vertical line
  if (blocks.length === 0) {
    return (
      <>
        <GraphSvg width={30} height="100%">
          <line
            x1={LEFT_PADDING}
            y1={0}
            x2={LEFT_PADDING}
            y2={SPACER_Y}
            stroke={theme.colors.primary}
            strokeWidth={2}
          />
          <circle
            cx={LEFT_PADDING}
            cy={CENTER_Y}
            r={NODE_RADIUS + 2}
            fill={theme.colors.background}
          />
          <circle
            cx={LEFT_PADDING}
            cy={CENTER_Y}
            r={NODE_RADIUS}
            fill={theme.colors.primary}
          />
        </GraphSvg>
        <div style={{ width: 30 }} />
      </>
    );
  }

  return (
    <>
      <GraphSvg width={svgWidth} height="100%">
        {/* Layer 1: Curves connecting this row up to the previous row */}
        {curveBlocks.map((block, i) => {
          const sx = getSafeHoriz(block.source);
          const tx = getSafeHoriz(block.target);
          return (
            <path
              key={`c-${i}`}
              d={`M${sx} ${CENTER_Y} C ${sx} ${CENTER_Y * 0.5}, ${tx} ${CENTER_Y * 0.36}, ${tx} 0`}
              stroke={getCommitBranchColor(block.branchIndex, theme)}
              strokeWidth={2}
              fill="none"
            />
          );
        })}

        {/* Layer 2: Spacer lines extending downward from each active slot */}
        {spacerList.map((s) => (
          <line
            key={`s-${s.source}`}
            x1={getSafeHoriz(s.source)}
            y1={CENTER_Y}
            x2={getSafeHoriz(s.source)}
            y2={SPACER_Y}
            stroke={getCommitBranchColor(s.branchIndex, theme)}
            strokeWidth={2}
          />
        ))}

        {/* Layer 3: Commit nodes — drawn last so they sit on top */}
        {spacerList
          .filter((s) => s.isCommit)
          .map((s) => {
            const cx = getSafeHoriz(s.source);
            const color = getCommitBranchColor(s.branchIndex, theme);
            return (
              <g key={`n-${s.source}`}>
                {/* Background circle to mask lines underneath */}
                <circle
                  cx={cx}
                  cy={CENTER_Y}
                  r={NODE_RADIUS + 2}
                  fill={theme.colors.background}
                />
                {/* Outer ring for merge commits */}
                {s.isMerge && (
                  <circle
                    cx={cx}
                    cy={CENTER_Y}
                    r={NODE_RADIUS + 1}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                  />
                )}
                {/* Filled commit dot */}
                <circle
                  cx={cx}
                  cy={CENTER_Y}
                  r={s.isMerge ? NODE_RADIUS - 1 : NODE_RADIUS}
                  fill={color}
                />
              </g>
            );
          })}
      </GraphSvg>
      {/* Invisible spacer that gives the table cell its width */}
      <div style={{ width: svgWidth }} />
    </>
  );
};

export default GitGraphCanvas;
