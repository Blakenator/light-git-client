import React, { useMemo, useCallback, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, ButtonGroup, Table, Tooltip } from 'react-bootstrap';
import { TooltipTrigger } from '@light-git/core';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnDef,
  ColumnResizeMode,
} from '@tanstack/react-table';
import { Icon } from '@light-git/core';

const ChangeListContainer = styled.div``;

const StyledTable = styled(Table)`
  margin-bottom: 0;
  background-color: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  table-layout: fixed;
  width: 100%;

  th {
    user-select: none;
    white-space: nowrap;
    background-color: ${({ theme }) => theme.colors.light};
    color: ${({ theme }) => theme.colors.text};
    border-color: ${({ theme }) => theme.colors.border};
    position: sticky;
    top: 0;
    z-index: 1;

    &:hover {
      background-color: ${({ theme }) => theme.colors.border};
    }
  }

  td {
    vertical-align: middle;
    border-color: ${({ theme }) => theme.colors.border};
    background-color: transparent;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const ResizeHandle = styled.div<{ $isResizing: boolean }>`
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 5px;
  background: ${({ $isResizing, theme }) =>
    $isResizing ? theme.colors.primary : 'transparent'};
  cursor: col-resize;
  user-select: none;
  touch-action: none;

  &:hover {
    background: ${({ theme }) => theme.colors.primary};
    opacity: 0.5;
  }
`;

const TableRow = styled.tr<{ $selected?: boolean }>`
  cursor: pointer;
  background-color: ${({ $selected, theme }) =>
    $selected ? `${theme.colors.primary}33` : 'transparent'};
  color: ${({ theme }) => theme.colors.text};

  &:hover {
    background-color: ${({ $selected, theme }) =>
      $selected ? `${theme.colors.primary}40` : theme.colors.light};
  }

  td {
    background-color: inherit;
    color: inherit;
  }
`;

const SortIcon = styled.span`
  margin-left: 0.25rem;
  opacity: 0.7;
`;

const StatusBadge = styled.span<{ $status: string }>`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.white};
  font-size: 0.7rem;
  flex-shrink: 0;
  background-color: ${({ $status, theme }) => {
    const firstChar = $status?.[0]?.toUpperCase();
    switch (firstChar) {
      case 'M':
        return theme.colors.statusChanged;
      case 'A':
        return theme.colors.statusAdded;
      case 'D':
        return theme.colors.statusDeleted;
      case 'R':
        return theme.colors.statusRenamed;
      case 'C':
        return theme.colors.statusMoved;
      case 'U':
        return theme.colors.warning;
      case '?':
        return theme.colors.secondary;
      default:
        return theme.colors.secondary;
    }
  }};
`;

const FileNameCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow: hidden;
`;

const DirPath = styled.span`
  color: ${({ theme }) => theme.colors.secondary};
`;

const FileBaseName = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;

const StatCell = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-family: ${({ theme }) => theme.fonts.monospace};
  font-size: 0.75rem;
  white-space: nowrap;
`;

const StatAdditions = styled.span`
  color: ${({ theme }) => theme.colors.diffAddText || theme.colors.success};
`;

const StatDeletions = styled.span`
  color: ${({ theme }) => theme.colors.diffDeleteText || theme.colors.danger};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s;

  ${TableRow}:hover & {
    opacity: 1;
  }
`;

/** Per-file diff stat for display in the change list */
export interface FileStatInfo {
  additions: number;
  deletions: number;
  isBinary: boolean;
}

export interface FileChange {
  path: string;
  file?: string;
  status: string;
  change?: string;
  oldPath?: string;
  isConflicted?: boolean;
  isSubmodule?: boolean;
}

interface SubmoduleModel {
  path: string;
}

interface ChangeListProps {
  changes: FileChange[];
  selectedChanges: { [key: string]: boolean };
  splitFilenameDisplay?: boolean;
  filter?: string;
  submodules?: SubmoduleModel[];
  /** Per-file diff stats keyed by file path */
  diffStats?: Map<string, FileStatInfo>;
  onSelectChange: (path: string, selected: boolean) => void;
  onBatchSelectChange?: (changes: Record<string, boolean>) => void;
  onUndoFile?: (path: string, changeType: string) => void;
  onUndoSubmodule?: (submodule: SubmoduleModel) => void;
  onMergeFile?: (path: string) => void;
  onResolveConflict?: (path: string, useTheirs: boolean) => void;
  onDeleteFile?: (path: string) => void;
  onCopyPath?: (path: string) => void;
}

interface NormalizedChange extends FileChange {
  path: string;
  status: string;
  dirPath: string;
  fileName: string;
}

const getStatusDescription = (status: string): string => {
  const firstChar = status?.[0]?.toUpperCase();
  switch (firstChar) {
    case 'M':
      return 'Modified';
    case 'A':
      return 'Added';
    case 'D':
      return 'Deleted';
    case 'R':
      return 'Renamed';
    case 'C':
      return 'Copied';
    case 'U':
      return 'Conflict';
    case '?':
      return 'Untracked';
    default:
      return 'Changed';
  }
};

// Separate checkbox component to prevent re-renders of entire table
const RowCheckbox: React.FC<{
  path: string;
  checked: boolean;
  onChange: (path: string, checked: boolean) => void;
}> = React.memo(({ path, checked, onChange }) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      onChange(path, e.target.checked);
    },
    [path, onChange],
  );

  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={handleChange}
      onClick={(e) => e.stopPropagation()}
    />
  );
});

RowCheckbox.displayName = 'RowCheckbox';

export const ChangeList: React.FC<ChangeListProps> = React.memo(
  ({
    changes,
    selectedChanges,
    splitFilenameDisplay = false,
    filter = '',
    submodules = [],
    diffStats,
    onSelectChange,
    onBatchSelectChange,
    onUndoFile,
    onUndoSubmodule,
    onMergeFile,
    onResolveConflict,
    onDeleteFile,
    onCopyPath,
  }) => {
    const [sorting, setSorting] = useState<SortingState>([]);
    const lastClickedRef = useRef<string | null>(null);

    const submoduleSet = useMemo(
      () => new Set(submodules.map((s) => s.path)),
      [submodules],
    );

    const data = useMemo<NormalizedChange[]>(() => {
      let normalized = changes.map((c) => {
        const path = c.path || c.file || '';
        const lastSlash = path.lastIndexOf('/');
        return {
          ...c,
          path,
          status: c.status || c.change || '?',
          dirPath: lastSlash > -1 ? path.substring(0, lastSlash + 1) : '',
          fileName: lastSlash > -1 ? path.substring(lastSlash + 1) : path,
        };
      });

      if (filter) {
        const lowerFilter = filter.toLowerCase();
        normalized = normalized.filter((c) =>
          c.path.toLowerCase().includes(lowerFilter),
        );
      }

      // Sort by file path ascending by default
      normalized.sort((a, b) => a.path.localeCompare(b.path));

      return normalized;
    }, [changes, filter]);

    const allSelected = useMemo(() => {
      return data.length > 0 && data.every((c) => selectedChanges[c.path]);
    }, [data, selectedChanges]);

    const someSelected = useMemo(() => {
      return data.some((c) => selectedChanges[c.path]) && !allSelected;
    }, [data, selectedChanges, allSelected]);

    const handleSelectAll = useCallback(() => {
      const newSelected = !allSelected;
      if (onBatchSelectChange) {
        const batch: Record<string, boolean> = {};
        data.forEach((c) => {
          batch[c.path] = newSelected;
        });
        onBatchSelectChange(batch);
      } else {
        data.forEach((c) => onSelectChange(c.path, newSelected));
      }
    }, [data, allSelected, onSelectChange, onBatchSelectChange]);

    const isConflicted = useCallback((change: NormalizedChange): boolean => {
      return change.isConflicted || change.status?.[0]?.toUpperCase() === 'U';
    }, []);

    const isNewFile = useCallback((status: string): boolean => {
      const firstChar = status?.[0]?.toUpperCase();
      return firstChar === 'A' || firstChar === '?';
    }, []);

    const handleRowClick = useCallback(
      (e: React.MouseEvent, path: string) => {
        if (e.shiftKey) {
          // Shift-click: select range from last clicked to current row
          const lastPath = lastClickedRef.current;
          if (lastPath) {
            const lastIndex = data.findIndex((c) => c.path === lastPath);
            const currentIndex = data.findIndex((c) => c.path === path);
            if (lastIndex !== -1 && currentIndex !== -1) {
              const start = Math.min(lastIndex, currentIndex);
              const end = Math.max(lastIndex, currentIndex);
              if (onBatchSelectChange) {
                const batch: Record<string, boolean> = {};
                for (let i = start; i <= end; i++) {
                  batch[data[i].path] = true;
                }
                onBatchSelectChange(batch);
              } else {
                for (let i = start; i <= end; i++) {
                  onSelectChange(data[i].path, true);
                }
              }
            }
          } else {
            // No previous click: just select the current row
            onSelectChange(path, true);
          }
        } else {
          onSelectChange(path, !selectedChanges[path]);
        }
        lastClickedRef.current = path;
      },
      [data, selectedChanges, onSelectChange, onBatchSelectChange],
    );

    const columnHelper = useMemo(
      () => createColumnHelper<NormalizedChange>(),
      [],
    );

    // Columns definition - avoid putting selectedChanges in deps to prevent re-renders
    const columns = useMemo<ColumnDef<NormalizedChange, any>[]>(() => {
      const cols: ColumnDef<NormalizedChange, any>[] = [
        {
          id: 'select',
          header: '',
          size: 30,
          minSize: 30,
          maxSize: 30,
          enableResizing: false,
          cell: () => null, // Placeholder - we'll render checkbox separately
        },
        columnHelper.accessor('status', {
          header: 'Status',
          cell: ({ getValue, row }) => (
            <TooltipTrigger
              placement="top"
              overlay={<Tooltip id={`tooltip-status-${row.original.path}`}>{getStatusDescription(getValue())}</Tooltip>}
            >
              <StatusBadge $status={getValue()}>
                {submoduleSet.has(row.original.path) ? (
                  <Icon name="fa-plug" size="sm" />
                ) : (
                  getValue()?.[0]?.toUpperCase() || '?'
                )}
              </StatusBadge>
            </TooltipTrigger>
          ),
          size: 60,
          minSize: 50,
          maxSize: 80,
          enableResizing: true,
        }),
      ];

      // +/- lines column (only rendered when diffStats are available)
      if (diffStats && diffStats.size > 0) {
        cols.push({
          id: 'lines',
          header: '+/-',
          size: 80,
          minSize: 60,
          maxSize: 120,
          enableResizing: true,
          cell: ({ row }: { row: any }) => {
            const stat = diffStats.get(row.original.path);
            if (!stat) return null;
            if (stat.isBinary) {
              return <StatCell>binary</StatCell>;
            }
            return (
              <StatCell>
                <StatAdditions>+{stat.additions}</StatAdditions>
                <StatDeletions>-{stat.deletions}</StatDeletions>
              </StatCell>
            );
          },
        });
      }

      if (splitFilenameDisplay) {
        cols.push(
          columnHelper.accessor('dirPath', {
            header: 'Directory',
            cell: ({ getValue, row }) => (
              <TooltipTrigger
                placement="bottom"
                overlay={<Tooltip id={`tooltip-dirpath-${row.original.path}`}>{getValue()}</Tooltip>}
              >
                <DirPath>{getValue()}</DirPath>
              </TooltipTrigger>
            ),
            size: 200,
            minSize: 80,
            enableResizing: true,
          }),
          columnHelper.accessor('fileName', {
            header: 'File',
            cell: ({ getValue, row }) => (
              <FileNameCell>
                <TooltipTrigger
                  placement="bottom"
                  overlay={<Tooltip id={`tooltip-filename-${row.original.path}`}>{row.original.path}</Tooltip>}
                >
                  <FileBaseName>
                    {getValue()}
                  </FileBaseName>
                </TooltipTrigger>
              </FileNameCell>
            ),
            size: 150,
            minSize: 80,
            enableResizing: true,
          }),
        );
      } else {
        cols.push(
          columnHelper.accessor('path', {
            header: 'File',
            cell: ({ getValue, row }) => (
              <FileNameCell>
                <TooltipTrigger
                  placement="bottom"
                  overlay={<Tooltip id={`tooltip-path-${row.original.path}`}>{getValue()}</Tooltip>}
                >
                  <span>
                    {getValue()}
                  </span>
                </TooltipTrigger>
              </FileNameCell>
            ),
            size: 300,
            minSize: 100,
            enableResizing: true,
          }),
        );
      }

      cols.push({
        id: 'actions',
        header: '',
        size: 120,
        minSize: 80,
        enableResizing: false,
        cell: () => null, // Placeholder - we'll render actions separately
      });

      return cols;
    }, [columnHelper, splitFilenameDisplay, submoduleSet, diffStats]);

    const table = useReactTable({
      data,
      columns,
      state: { sorting },
      onSortingChange: setSorting,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      columnResizeMode: 'onChange' as ColumnResizeMode,
      enableColumnResizing: true,
    });

    // Render actions for a row
    const renderActions = useCallback(
      (change: NormalizedChange) => {
        return (
          <ActionButtons>
            {onCopyPath && (
              <TooltipTrigger
                placement="top"
                overlay={<Tooltip id={`tooltip-copy-path-${change.path}`}>Copy path</Tooltip>}
              >
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyPath(change.path);
                  }}
                >
                  <Icon name="fa-copy" size="sm" />
                </Button>
              </TooltipTrigger>
            )}
            {isConflicted(change) && onMergeFile && (
              <TooltipTrigger
                placement="top"
                overlay={<Tooltip id={`tooltip-merge-${change.path}`}>Merge</Tooltip>}
              >
                <Button
                  variant="outline-success"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMergeFile(change.path);
                  }}
                >
                  <Icon name="merge_type" size="sm" />
                </Button>
              </TooltipTrigger>
            )}
            {isConflicted(change) && onResolveConflict && (
              <ButtonGroup size="sm">
                <TooltipTrigger
                  placement="top"
                  overlay={<Tooltip id={`tooltip-use-ours-${change.path}`}>Use ours</Tooltip>}
                >
                  <Button
                    variant="outline-info"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResolveConflict(change.path, false);
                    }}
                  >
                    <Icon name="fa-user" size="sm" />
                  </Button>
                </TooltipTrigger>
                <TooltipTrigger
                  placement="top"
                  overlay={<Tooltip id={`tooltip-use-theirs-${change.path}`}>Use theirs</Tooltip>}
                >
                  <Button
                    variant="outline-warning"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResolveConflict(change.path, true);
                    }}
                  >
                    <Icon name="fa-users" size="sm" />
                  </Button>
                </TooltipTrigger>
              </ButtonGroup>
            )}
            {!isNewFile(change.status) &&
              !isConflicted(change) &&
              onUndoFile && (
                <TooltipTrigger
                  placement="top"
                  overlay={<Tooltip id={`tooltip-undo-${change.path}`}>Undo</Tooltip>}
                >
                  <Button
                    variant="outline-warning"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      const submodule = submodules.find(
                        (s) => s.path === change.path,
                      );
                      if (submodule && onUndoSubmodule) {
                        onUndoSubmodule(submodule);
                      } else {
                        onUndoFile(change.path, change.status);
                      }
                    }}
                  >
                    <Icon name="fa-undo" size="sm" />
                  </Button>
                </TooltipTrigger>
              )}
            {onDeleteFile && (
              <TooltipTrigger
                placement="top"
                overlay={<Tooltip id={`tooltip-delete-${change.path}`}>Delete</Tooltip>}
              >
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFile(change.path);
                  }}
                >
                  <Icon name="fa-trash" size="sm" />
                </Button>
              </TooltipTrigger>
            )}
          </ActionButtons>
        );
      },
      [
        onCopyPath,
        onMergeFile,
        onResolveConflict,
        onUndoFile,
        onUndoSubmodule,
        onDeleteFile,
        submodules,
        isConflicted,
        isNewFile,
      ],
    );

    return (
      <ChangeListContainer>
        <StyledTable size="sm" hover>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={
                      header.column.getCanSort()
                        ? header.column.getToggleSortingHandler()
                        : undefined
                    }
                    style={{
                      width: header.getSize(),
                      cursor: header.column.getCanSort()
                        ? 'pointer'
                        : 'default',
                    }}
                  >
                    {header.id === 'select' && data.length > 0 && (
                      <TooltipTrigger
                        placement="top"
                        overlay={
                          <Tooltip id="tooltip-select-all">
                            {allSelected ? 'Deselect all' : 'Select all'}
                          </Tooltip>
                        }
                      >
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected;
                          }}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectAll();
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TooltipTrigger>
                    )}
                    {header.id !== 'select' &&
                      header.id !== 'actions' &&
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    {header.column.getIsSorted() && (
                      <SortIcon>
                        {header.column.getIsSorted() === 'asc' ? '↑' : '↓'}
                      </SortIcon>
                    )}
                    {header.column.getCanResize() && (
                      <ResizeHandle
                        $isResizing={header.column.getIsResizing()}
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const change = row.original;
              const isSelected = selectedChanges[change.path] || false;

              return (
                <TableRow
                  key={row.id}
                  $selected={isSelected}
                  onClick={(e) => handleRowClick(e, change.path)}
                >
                  {row.getVisibleCells().map((cell) => {
                    // Special handling for checkbox and actions columns
                    if (cell.column.id === 'select') {
                      return (
                        <td
                          key={cell.id}
                          style={{ width: cell.column.getSize() }}
                        >
                          <RowCheckbox
                            path={change.path}
                            checked={isSelected}
                            onChange={onSelectChange}
                          />
                        </td>
                      );
                    }
                    if (cell.column.id === 'actions') {
                      return (
                        <td
                          key={cell.id}
                          style={{ width: cell.column.getSize() }}
                        >
                          {renderActions(change)}
                        </td>
                      );
                    }
                    return (
                      <td
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    );
                  })}
                </TableRow>
              );
            })}
          </tbody>
        </StyledTable>
        {data.length === 0 && (
          <div className="text-muted text-center py-3">No changes</div>
        )}
      </ChangeListContainer>
    );
  },
);

ChangeList.displayName = 'ChangeList';

export default ChangeList;
