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
 * Rendering strategy:
 *   1. Define SVG masks that cut out circles where commit dots live
 *   2. Draw curves + spacer lines inside a masked group (lines become
 *      transparent around commit dots, letting the td background show through)
 *   3. Draw commit dots on top, with merge chevrons carved out via masks
 *
 * This approach is background-color-agnostic: hover highlights and
 * tiger-striping show through the masked areas automatically.
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

  const commitNodes = useMemo(
    () => spacerList.filter((s) => s.isCommit),
    [spacerList],
  );

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

  const lineMaskId = `lm-${commit.hash}`;

  // Fallback: no graph data — simple dot with vertical line
  if (blocks.length === 0) {
    return (
      <>
        <GraphSvg width={30} height="100%">
          <defs>
            <mask id={lineMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width="9999" height="9999">
              <rect x="0" y="0" width="9999" height="9999" fill="white" />
              <circle cx={LEFT_PADDING} cy={CENTER_Y} r={NODE_RADIUS + 2} fill="black" />
            </mask>
          </defs>
          <g mask={`url(#${lineMaskId})`}>
            <line
              x1={LEFT_PADDING}
              y1={0}
              x2={LEFT_PADDING}
              y2={SPACER_Y}
              stroke={theme.colors.primary}
              strokeWidth={2}
            />
          </g>
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
        <defs>
          {/* Mask that hides lines behind commit dots */}
          <mask id={lineMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width="9999" height="9999">
            <rect x="0" y="0" width="9999" height="9999" fill="white" />
            {commitNodes.map((s) => (
              <circle
                key={`mh-${s.source}`}
                cx={getSafeHoriz(s.source)}
                cy={CENTER_Y}
                r={NODE_RADIUS + 2}
                fill="black"
              />
            ))}
          </mask>
          {/* Per-merge masks that carve the chevron out of the commit dot */}
          {commitNodes
            .filter((s) => s.isMerge)
            .map((s) => {
              const cx = getSafeHoriz(s.source);
              return (
                <mask id={`cm-${commit.hash}-${s.source}`} key={`cm-${s.source}`} maskUnits="userSpaceOnUse" x="0" y="0" width="9999" height="9999">
                  <rect x="0" y="0" width="9999" height="9999" fill="white" />
                  <path
                    d={`M${cx - 3} ${CENTER_Y + 1.5} L${cx} ${CENTER_Y - 2.5} L${cx + 3} ${CENTER_Y + 1.5}`}
                    stroke="black"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </mask>
              );
            })}
        </defs>

        {/* Lines group — masked so commit dot areas are transparent */}
        <g mask={`url(#${lineMaskId})`}>
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
        </g>

        {/* Layer 3: Commit dots — drawn on top, merge dots have chevron carved out */}
        {commitNodes.map((s) => {
          const cx = getSafeHoriz(s.source);
          const color = getCommitBranchColor(s.branchIndex, theme);
          return (
            <circle
              key={`n-${s.source}`}
              cx={cx}
              cy={CENTER_Y}
              r={NODE_RADIUS}
              fill={color}
              mask={s.isMerge ? `url(#cm-${commit.hash}-${s.source})` : undefined}
            />
          );
        })}
      </GraphSvg>
      {/* Invisible spacer that gives the table cell its width */}
      <div style={{ width: svgWidth }} />
    </>
  );
};

export default GitGraphCanvas;
