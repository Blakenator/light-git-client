import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Button, ButtonGroup, Form, Badge, Alert } from 'react-bootstrap';
import { Icon } from '@light-git/core';
import hljs from 'highlight.js';

const DiffContainer = styled.div`
  font-family: ${({ theme }) => theme.fonts.monospace};
  font-size: 0.85rem;
`;

const DiffToolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background-color: ${({ theme }) => theme.colors.background};
`;

const FilterInput = styled(Form.Control)`
  max-width: 200px;
`;

const CommitInfoContainer = styled.div`
  position: relative;
  padding: 0.75rem;
  padding-right: 3rem;
  background-color: ${({ theme }) => theme.colors.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const CommitInfoHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const CloseButton = styled(Button)`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.25rem 0.5rem;
  line-height: 1;
  opacity: 0.7;

  &:hover {
    opacity: 1;
  }
`;

const CommitHash = styled.span`
  font-family: ${({ theme }) => theme.fonts.monospace};
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 500;
`;

const CommitMessage = styled.pre`
  font-family: ${({ theme }) => theme.fonts.monospace};
  font-size: 0.9rem;
  white-space: pre-wrap;
  margin: 0.5rem 0;
  padding: 0.5rem;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius};
`;

const CommitMeta = styled.div`
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.secondary};
  flex-wrap: wrap;
`;

const ParentButtons = styled.div`
  display: flex;
  gap: 0.25rem;
  margin-top: 0.5rem;
`;

const StagedSeparator = styled(Alert)`
  margin: 0.5rem;
  padding: 0.5rem 1rem;
`;

const DiffHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 0.5rem;
  background-color: ${({ theme }) => theme.colors.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  cursor: pointer;
  gap: 0.5rem;
  position: sticky;
  top: 0;
  z-index: 10;

  &:hover {
    background-color: ${({ theme }) => theme.colors.border};
  }
`;

const FileNameContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  overflow: hidden;
`;

const PathSegment = styled(Badge)`
  font-weight: normal;
  font-size: 0.75rem;
`;

const FileName = styled.span`
  font-weight: 500;
`;

const CopyButton = styled(Button)`
  opacity: 0;
  transition: opacity 0.2s;
  padding: 0.125rem 0.25rem;

  ${DiffHeader}:hover & {
    opacity: 1;
  }
`;

const DiffStats = styled.span`
  display: flex;
  gap: 0.25rem;
  margin-left: 0.5rem;
`;

const ActionBadge = styled(Badge)<{ $action?: string }>`
  background-color: ${({ $action, theme }) => {
    switch ($action) {
      case 'Added':
        return theme.colors.statusAdded;
      case 'Deleted':
        return theme.colors.statusDeleted;
      case 'Renamed':
      case 'Moved':
        return theme.colors.statusRenamed;
      default:
        return theme.colors.statusChanged;
    }
  }} !important;
`;

const Additions = styled.span`
  color: ${({ theme }) => theme.colors.diffAddText};
`;

const Deletions = styled.span`
  color: ${({ theme }) => theme.colors.diffDeleteText};
`;

const HunkContainer = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  position: relative;
  overflow-x: auto;
`;

const HunkHeader = styled.div`
  background-color: ${({ theme }) => theme.colors.diffHunkHeaderBg};
  color: ${({ theme }) => theme.colors.diffHunkHeaderText};
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const HunkHeaderText = styled.span`
  cursor: default;
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;

const HunkHeaderContext = styled.span`
  font-style: italic;
  opacity: 0.85;
`;

const HunkHeaderLines = styled.span`
  font-weight: 500;
`;

const HunkActions = styled.div`
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s;

  ${HunkContainer}:hover & {
    opacity: 1;
  }
`;

const DiffLine = styled.div<{ $type: 'add' | 'delete' | 'context' | 'header' }>`
  display: flex;
  white-space: pre;

  background-color: ${({ $type, theme }) => {
    switch ($type) {
      case 'add':
        return theme.colors.diffAddBg;
      case 'delete':
        return theme.colors.diffDeleteBg;
      case 'header':
        return theme.colors.diffHunkHeaderBg;
      default:
        return 'transparent';
    }
  }};
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

const LineContent = styled.span`
  flex: 1;
  padding: 0 0.5rem;
`;

const HunkEditorContainer = styled.div`
  position: relative;
  min-height: 200px;
  border: 2px solid ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.borderRadius};
  background-color: ${({ theme }) => theme.colors.background};

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.info};
    box-shadow: 0 0 0 0.2rem ${({ theme }) => theme.colors.primary}40;
  }
`;

const editorSharedStyles = `
  margin: 0;
  padding: 8px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  tab-size: 2;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
`;

const HunkEditorHighlight = styled.pre`
  ${editorSharedStyles}
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: auto;
  pointer-events: none;
  color: ${({ theme }) => theme.colors.text};

  code {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    background: none !important;
    padding: 0 !important;
    white-space: inherit;
    display: block;
  }
`;

const HunkEditorTextarea = styled.textarea`
  ${editorSharedStyles}
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  min-height: 200px;
  border: none;
  resize: none;
  background-color: transparent;
  color: transparent;
  caret-color: ${({ theme }) => theme.colors.text};
  z-index: 1;

  &:focus {
    outline: none;
  }

  &::selection {
    background-color: ${({ theme }) => theme.colors.primary}4d;
  }

  &::-webkit-scrollbar {
    display: none;
  }
`;

const HunkEditorActions = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: ${({ theme }) => theme.colors.light};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const TruncationWarning = styled.div`
  padding: 0.5rem 1rem;
  background-color: ${({ theme }) => theme.colors.light};
  color: ${({ theme }) => theme.colors.secondary};
  font-style: italic;
  text-align: center;
`;

export enum LineState {
  ADDED = 'added',
  REMOVED = 'removed',
  UNCHANGED = 'unchanged',
}

export interface DiffLineModel {
  text: string;
  state: LineState;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunk {
  header: string;
  lines: DiffLineModel[];
  fromStartLine: number;
  toStartLine: number;
}

export interface DiffHeaderModel {
  fromFilename: string;
  toFilename: string;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
  action?: 'Added' | 'Deleted' | 'Modified' | 'Renamed';
  stagedState?: 'staged' | 'unstaged';
}

interface DiffViewerProps {
  diffHeaders: DiffHeaderModel[];
  commitInfo?: {
    hash: string;
    message: string;
    author: string;
    date: string;
    parents?: string[];
    tags?: string[];
  } | null;
  ignoreWhitespace?: boolean;
  isReadOnly?: boolean;
  onIgnoreWhitespaceClick?: () => void;
  onExitCommitView?: () => void;
  onNavigateToHash?: (hash: string) => void;
  onHunkChange?: (
    filename: string,
    hunk: DiffHunk,
    newContent: string
  ) => Promise<void>;
  onHunkChangeError?: (error: Error) => void;
}

const MAX_LINES_PER_FILE = 500;

// Helper to detect programming language from filename for syntax highlighting
const getLanguageFromFilename = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const langMap: { [key: string]: string } = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rb: 'ruby',
    java: 'java',
    cs: 'csharp',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',
    go: 'go',
    rs: 'rust',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    md: 'markdown',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    dockerfile: 'dockerfile',
  };
  return langMap[ext] || 'plaintext';
};

// Parse raw @@ hunk header into a readable description
const parseHunkHeader = (header: string): { lineInfo: string; context: string; raw: string } => {
  const match = header.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)/);
  if (!match) return { lineInfo: header, context: '', raw: header };

  const oldStart = parseInt(match[1]);
  const oldCount = parseInt(match[2] ?? '1');
  const newStart = parseInt(match[3]);
  const newCount = parseInt(match[4] ?? '1');
  const context = match[5]?.trim() || '';

  let lineInfo: string;
  if (newCount === 0) {
    lineInfo = `−${oldCount} line${oldCount !== 1 ? 's' : ''} at ${oldStart}`;
  } else if (oldCount === 0) {
    lineInfo = `+${newCount} line${newCount !== 1 ? 's' : ''} at ${newStart}`;
  } else {
    const newEnd = newStart + newCount - 1;
    lineInfo = `Lines ${newStart}–${newEnd}`;
  }

  return { lineInfo, context, raw: header };
};

export const DiffViewer: React.FC<DiffViewerProps> = React.memo(({
  diffHeaders,
  commitInfo,
  ignoreWhitespace = false,
  isReadOnly = false,
  onIgnoreWhitespaceClick,
  onExitCommitView,
  onNavigateToHash,
  onHunkChange,
  onHunkChangeError,
}) => {
  const [expandedFiles, setExpandedFiles] = useState<{ [key: string]: boolean }>({});
  const [showAllHunks, setShowAllHunks] = useState<{ [key: string]: boolean }>({});
  const [filter, setFilter] = useState('');
  const [editingHunk, setEditingHunk] = useState<{
    filename: string;
    hunkIndex: number;
  } | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  // Sync scroll between textarea and highlight layer
  const handleEditorScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop;
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  }, []);

  // Focus editor when editing starts
  useEffect(() => {
    if (editingHunk && editorRef.current) {
      editorRef.current.focus();
    }
  }, [editingHunk]);

  // Filter diff headers
  const filteredHeaders = useMemo(() => {
    if (!filter) return diffHeaders;
    const lowerFilter = filter.toLowerCase();
    return diffHeaders.filter(
      (h) =>
        h.fromFilename.toLowerCase().includes(lowerFilter) ||
        h.toFilename.toLowerCase().includes(lowerFilter)
    );
  }, [diffHeaders, filter]);

  // Group by staged state
  const { stagedHeaders, unstagedHeaders } = useMemo(() => {
    const staged = filteredHeaders.filter((h) => h.stagedState === 'staged');
    const unstaged = filteredHeaders.filter((h) => h.stagedState !== 'staged');
    return { stagedHeaders: staged, unstagedHeaders: unstaged };
  }, [filteredHeaders]);

  const toggleFile = useCallback((fileName: string) => {
    setExpandedFiles((prev) => ({
      ...prev,
      [fileName]: !prev[fileName],
    }));
  }, []);

  const isExpanded = useCallback(
    (fileName: string, header: DiffHeaderModel) => {
      if (expandedFiles[fileName] !== undefined) {
        return expandedFiles[fileName];
      }
      const totalLines = header.hunks.reduce((sum, h) => sum + h.lines.length, 0);
      return totalLines < MAX_LINES_PER_FILE && header.action !== 'Deleted';
    },
    [expandedFiles]
  );

  const getEditableCode = useCallback((hunk: DiffHunk): string => {
    return hunk.lines
      .filter((line) => line.state !== LineState.REMOVED)
      .map((line) => line.text)
      .join('\n');
  }, []);

  const getOriginalCode = useCallback((hunk: DiffHunk): string => {
    return hunk.lines
      .filter((line) => line.state !== LineState.ADDED)
      .map((line) => line.text)
      .join('\n');
  }, []);

  const startEdit = useCallback(
    (filename: string, hunkIndex: number, hunk: DiffHunk) => {
      setEditingHunk({ filename, hunkIndex });
      setEditedContent(getEditableCode(hunk));
    },
    [getEditableCode]
  );

  const cancelEdit = useCallback(() => {
    setEditingHunk(null);
    setEditedContent('');
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingHunk || !onHunkChange) return;

    const header = diffHeaders.find((h) => h.toFilename === editingHunk.filename);
    if (!header) return;

    const hunk = header.hunks[editingHunk.hunkIndex];
    if (!hunk) return;

    if (editedContent === getEditableCode(hunk)) {
      cancelEdit();
      return;
    }

    setIsSaving(true);
    try {
      await onHunkChange(editingHunk.filename, hunk, editedContent);
      cancelEdit();
    } catch (error) {
      onHunkChangeError?.(error as Error);
    } finally {
      setIsSaving(false);
    }
  }, [editingHunk, editedContent, diffHeaders, getEditableCode, onHunkChange, onHunkChangeError, cancelEdit]);

  const undoHunk = useCallback(
    async (filename: string, hunkIndex: number, hunk: DiffHunk) => {
      if (!onHunkChange) return;

      const originalCode = getOriginalCode(hunk);
      setIsSaving(true);
      try {
        await onHunkChange(filename, hunk, originalCode);
      } catch (error) {
        onHunkChangeError?.(error as Error);
      } finally {
        setIsSaving(false);
      }
    },
    [getOriginalCode, onHunkChange, onHunkChangeError]
  );

  const handleEditorKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelEdit();
      }
    },
    [cancelEdit]
  );

  const copyFilename = useCallback((filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(filename);
  }, []);

  const getLineType = (state: LineState): 'add' | 'delete' | 'context' | 'header' => {
    switch (state) {
      case LineState.ADDED:
        return 'add';
      case LineState.REMOVED:
        return 'delete';
      default:
        return 'context';
    }
  };

  const renderFileNameSplit = (filename: string) => {
    const parts = filename.split('/');
    const file = parts.pop() || '';
    return (
      <>
        {parts.map((part, i) => (
          <PathSegment key={i} bg="secondary" className="me-1">
            {part}
          </PathSegment>
        ))}
        <FileName>{file}</FileName>
      </>
    );
  };

  const renderFileHeader = (header: DiffHeaderModel) => {
    const displayName = header.fromFilename !== header.toFilename
      ? `${header.fromFilename} → ${header.toFilename}`
      : header.toFilename;

    return (
      <DiffHeader onClick={() => toggleFile(header.toFilename)}>
        <Icon
          name={isExpanded(header.toFilename, header) ? 'fa-chevron-down' : 'fa-chevron-right'}
          size="sm"
        />
        <FileNameContainer>
          {renderFileNameSplit(header.toFilename)}
        </FileNameContainer>
        <CopyButton
          variant="link"
          size="sm"
          onClick={(e) => copyFilename(header.toFilename, e)}
          title="Copy filename"
        >
          <Icon name="fa-copy" size="sm" />
        </CopyButton>
        {header.action && (
          <ActionBadge $action={header.action}>{header.action}</ActionBadge>
        )}
        <DiffStats>
          <Additions>+{header.additions}</Additions>
          <Deletions>-{header.deletions}</Deletions>
        </DiffStats>
      </DiffHeader>
    );
  };

  const renderHunks = (header: DiffHeaderModel) => {
    const showAll = showAllHunks[header.toFilename];
    let totalLines = 0;
    let truncatedHunks = header.hunks;
    let isTruncated = false;

    if (!showAll) {
      truncatedHunks = [];
      for (const hunk of header.hunks) {
        if (totalLines + hunk.lines.length > MAX_LINES_PER_FILE) {
          isTruncated = true;
          break;
        }
        truncatedHunks.push(hunk);
        totalLines += hunk.lines.length;
      }
    }

    return (
      <>
        {truncatedHunks.map((hunk, hunkIndex) => {
          const isEditing =
            editingHunk?.filename === header.toFilename &&
            editingHunk?.hunkIndex === hunkIndex;

          return (
            <HunkContainer key={hunkIndex}>
              <HunkHeader>
                {(() => {
                  const parsed = parseHunkHeader(hunk.header);
                  return (
                    <HunkHeaderText title={parsed.raw}>
                      <HunkHeaderLines>{parsed.lineInfo}</HunkHeaderLines>
                      {parsed.context && <HunkHeaderContext>{parsed.context}</HunkHeaderContext>}
                    </HunkHeaderText>
                  );
                })()}
                {!isReadOnly && !commitInfo && onHunkChange && !isEditing && (
                  <HunkActions>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(header.toFilename, hunkIndex, hunk);
                      }}
                      disabled={isSaving}
                      title="Edit this hunk"
                    >
                      <Icon name="edit" size="sm" />
                    </Button>
                    <Button
                      variant="outline-warning"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        undoHunk(header.toFilename, hunkIndex, hunk);
                      }}
                      disabled={isSaving}
                      title="Undo this hunk"
                    >
                      <Icon name="fa-undo" size="sm" />
                    </Button>
                  </HunkActions>
                )}
              </HunkHeader>

              {isEditing ? (
                <>
                  <HunkEditorContainer>
                    <HunkEditorHighlight ref={highlightRef}>
                      <code
                        dangerouslySetInnerHTML={{
                          __html: hljs.highlight(editedContent || ' ', {
                            language: getLanguageFromFilename(header.toFilename),
                            ignoreIllegals: true,
                          }).value,
                        }}
                      />
                    </HunkEditorHighlight>
                    <HunkEditorTextarea
                      ref={editorRef}
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      onKeyDown={handleEditorKeyDown}
                      onScroll={handleEditorScroll}
                      disabled={isSaving}
                      spellCheck={false}
                    />
                  </HunkEditorContainer>
                  <HunkEditorActions>
                    <Button variant="secondary" size="sm" onClick={cancelEdit} disabled={isSaving}>
                      Cancel (Esc)
                    </Button>
                    <Button variant="primary" size="sm" onClick={saveEdit} disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </HunkEditorActions>
                </>
              ) : (
                hunk.lines.map((line, lineIndex) => (
                  <DiffLine key={lineIndex} $type={getLineType(line.state)}>
                    <LineNumber>
                      {line.state !== LineState.ADDED ? line.oldLineNumber : ''}
                    </LineNumber>
                    <LineNumber>
                      {line.state !== LineState.REMOVED ? line.newLineNumber : ''}
                    </LineNumber>
                    <LineContent>
                      {line.state === LineState.ADDED && '+'}
                      {line.state === LineState.REMOVED && '-'}
                      {line.state === LineState.UNCHANGED && ' '}
                      {line.text}
                    </LineContent>
                  </DiffLine>
                ))
              )}
            </HunkContainer>
          );
        })}
        {isTruncated && (
          <TruncationWarning>
            Too many changed lines, remaining hunks hidden...{' '}
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowAllHunks((prev) => ({ ...prev, [header.toFilename]: true }))}
            >
              Show All
            </Button>
          </TruncationWarning>
        )}
      </>
    );
  };

  const renderFile = (header: DiffHeaderModel) => (
    <div key={header.toFilename}>
      {renderFileHeader(header)}
      {isExpanded(header.toFilename, header) && (
        <div>
          {header.hunks.length > 0 ? (
            renderHunks(header)
          ) : (
            <div className="text-muted text-center py-2">No differences detected</div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <DiffContainer>
      {commitInfo && (
        <CommitInfoContainer>
          <CloseButton variant="outline-secondary" size="sm" onClick={onExitCommitView} title="Close diff view">
            <Icon name="fa-times" />
          </CloseButton>
          <CommitInfoHeader>
            <CommitHash>{commitInfo.hash.substring(0, 8)}</CommitHash>
            {commitInfo.tags?.map((tag) => (
              <Badge key={tag} bg="info" className="me-1">
                {tag}
              </Badge>
            ))}
          </CommitInfoHeader>
          <CommitMessage>{commitInfo.message}</CommitMessage>
          <CommitMeta>
            <span>
              <Icon name="fa-user" size="sm" className="me-1" />
              {commitInfo.author}
            </span>
            <span>
              <Icon name="fa-clock" size="sm" className="me-1" />
              {commitInfo.date?new Date(commitInfo.date).toLocaleString():'Missing Date'
                }
            </span>
          </CommitMeta>
          {commitInfo.parents && commitInfo.parents.length > 0 && (
            <ParentButtons>
              <span className="text-muted me-2">Parents:</span>
              {commitInfo.parents.map((parent, i) => (
                <Button
                  key={parent}
                  variant="outline-primary"
                  size="sm"
                  onClick={() => onNavigateToHash?.(parent)}
                >
                  {parent.substring(0, 8)}
                </Button>
              ))}
            </ParentButtons>
          )}
        </CommitInfoContainer>
      )}

      <DiffToolbar>
        <FilterInput
          size="sm"
          placeholder="Filter files..."
          value={filter}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilter(e.target.value)}
        />
        {filter && (
          <Badge bg="secondary" className="me-2">
            {filteredHeaders.length} of {diffHeaders.length}
          </Badge>
        )}
        <Form.Check
          type="switch"
          id="ignore-whitespace"
          label="Ignore Whitespace"
          checked={ignoreWhitespace}
          onChange={onIgnoreWhitespaceClick}
        />
      </DiffToolbar>

      {stagedHeaders.length > 0 && (
        <>
          <StagedSeparator variant="info">
            <Icon name="fa-check-circle" className="me-2" />
            Staged Changes ({stagedHeaders.length} files)
          </StagedSeparator>
          {stagedHeaders.map(renderFile)}
        </>
      )}

      {unstagedHeaders.length > 0 && (
        <>
          {stagedHeaders.length > 0 && (
            <StagedSeparator variant="primary">
              <Icon name="fa-edit" className="me-2" />
              Unstaged Changes ({unstagedHeaders.length} files)
            </StagedSeparator>
          )}
          {unstagedHeaders.map(renderFile)}
        </>
      )}

      {filteredHeaders.length === 0 && (
        <div className="text-muted text-center py-4">No changes to display</div>
      )}
    </DiffContainer>
  );
});

DiffViewer.displayName = 'DiffViewer';

export default DiffViewer;
