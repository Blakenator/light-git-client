import React from 'react';
import styled from 'styled-components';
import { highlightLines, getLanguageFromFilename } from './highlightUtils';
import { LineState } from '@light-git/shared';
import type { DiffHunkModel } from '@light-git/shared';

const HunkLines = styled.div`
  min-width: 100%;
  width: fit-content;
`;

const DiffLine = styled.div<{ $type: 'add' | 'delete' | 'context'; $highlighted?: boolean }>`
  display: flex;
  white-space: pre;

  background-color: ${({ $type, $highlighted, theme }) => {
    if ($highlighted) return theme.colors.alertWarningBg || 'rgba(255, 193, 7, 0.15)';
    switch ($type) {
      case 'add':
        return theme.colors.diffAddBg;
      case 'delete':
        return theme.colors.diffDeleteBg;
      default:
        return 'transparent';
    }
  }};

  ${({ $highlighted, theme }) =>
    $highlighted
      ? `border-left: 3px solid ${theme.colors.warning || '#ffc107'};`
      : ''}
`;

const LineNumber = styled.span`
  width: 50px;
  padding: 0 0.5rem;
  text-align: right;
  color: ${({ theme }) => theme.colors.secondary};
  user-select: none;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  flex-shrink: 0;
`;

const LinePrefix = styled.span`
  user-select: none;
  flex-shrink: 0;
`;

const LineContent = styled.span`
  flex: 1;
  padding: 0 0.5rem;

  .hljs {
    background: none !important;
    padding: 0 !important;
  }
`;

const getLineType = (state: LineState): 'add' | 'delete' | 'context' => {
  if (state === LineState.ADDED) return 'add';
  if (state === LineState.REMOVED) return 'delete';
  return 'context';
};

export interface ReadOnlyHunkViewProps {
  hunk: DiffHunkModel;
  filename: string;
  highlightedLineNumbers?: Set<number>;
}

export const ReadOnlyHunkView: React.FC<ReadOnlyHunkViewProps> = React.memo(({
  hunk,
  filename,
  highlightedLineNumbers,
}) => {
  const lang = getLanguageFromFilename(filename);
  const highlightedHtml = highlightLines(
    hunk.lines.map((l) => l.text),
    lang,
  );

  return (
    <HunkLines>
      {hunk.lines.map((line, lineIndex) => {
        const lineType = getLineType(line.state);
        const prefix =
          lineType === 'add' ? '+' : lineType === 'delete' ? '-' : ' ';

        const isHighlighted =
          lineType !== 'delete' &&
          highlightedLineNumbers !== undefined &&
          highlightedLineNumbers.has(line.toLineNumber);

        return (
          <DiffLine key={lineIndex} $type={lineType} $highlighted={isHighlighted}>
            <LineNumber>
              {lineType !== 'add' ? line.fromLineNumber : ''}
            </LineNumber>
            <LineNumber>
              {lineType !== 'delete' ? line.toLineNumber : ''}
            </LineNumber>
            <LineContent>
              <LinePrefix>{prefix}</LinePrefix>
              <span
                dangerouslySetInnerHTML={{
                  __html: highlightedHtml[lineIndex] || '',
                }}
              />
            </LineContent>
          </DiffLine>
        );
      })}
    </HunkLines>
  );
});

ReadOnlyHunkView.displayName = 'ReadOnlyHunkView';
