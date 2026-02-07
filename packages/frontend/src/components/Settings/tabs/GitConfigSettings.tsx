import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Form, Button, ButtonGroup, Table, Tooltip } from 'react-bootstrap';
import styled from 'styled-components';
import { Channels } from '@light-git/shared';
import { Icon, TooltipTrigger } from '@light-git/core';
import { useIpc } from '../../../ipc/useIpc';
import { useRepositoryStore } from '../../../stores';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';

const FormSection = styled.div`
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h6`
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 0.5rem;
`;

const StyledTable = styled(Table)`
  margin-bottom: 0;

  th {
    user-select: none;
    white-space: nowrap;
  }

  td {
    vertical-align: middle;
  }
`;

const SortableHeader = styled.div<{ $canSort: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: ${({ $canSort }) => ($canSort ? 'pointer' : 'default')};
`;

const SortIcon = styled.span`
  opacity: 0.7;
  font-size: 0.75rem;
`;

const EditableCell = styled.td`
  cursor: pointer;
  &:hover {
    background-color: ${({ theme }) => theme.colors.background};
  }
`;

const CellContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const EditIcon = styled.span`
  opacity: 0.3;
  font-size: 0.875rem;
  ${EditableCell}:hover & {
    opacity: 0.7;
  }
`;

const EditInputGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const NewItemRow = styled.tr`
  cursor: pointer;
  &:hover {
    background-color: ${({ theme }) => theme.colors.background};
  }
`;

interface ConfigItemModel {
  key: string;
  value: string;
  sourceFile: string;
}

interface GitConfigSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

// Editable cell component for the Key column
const EditableKeyCell: React.FC<{
  item: ConfigItemModel;
  isEditing: boolean;
  editedValue: string;
  onStartEdit: (item: ConfigItemModel, isKey: boolean) => void;
  onEditChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent, item: ConfigItemModel) => void;
  onSave: (item: ConfigItemModel) => void;
  onCancel: () => void;
}> = ({ item, isEditing, editedValue, onStartEdit, onEditChange, onKeyDown, onSave, onCancel }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current !== null) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const handleBlur = useCallback(() => {
    // Delay blur so button clicks register first
    blurTimeoutRef.current = window.setTimeout(() => {
      onSave(item);
    }, 150);
  }, [item, onSave]);

  const handleButtonMouseDown = useCallback((e: React.MouseEvent) => {
    // Prevent the input blur from firing before the button click
    e.preventDefault();
  }, []);

  return (
    <EditableCell onClick={() => !isEditing && onStartEdit(item, true)}>
      {!isEditing ? (
        <CellContent>
          {item.key}
          <EditIcon>
            <Icon name="edit" size="sm" />
          </EditIcon>
        </CellContent>
      ) : (
        <EditInputGroup>
          <Form.Control
            ref={inputRef}
            size="sm"
            value={editedValue}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => onKeyDown(e, item)}
            onBlur={handleBlur}
          />
          <ButtonGroup size="sm">
            <Button
              variant="outline-success"
              onMouseDown={handleButtonMouseDown}
              onClick={() => onSave(item)}
            >
              <Icon name="fa-check" size="sm" />
            </Button>
            <Button
              variant="outline-secondary"
              onMouseDown={handleButtonMouseDown}
              onClick={onCancel}
            >
              <Icon name="fa-times" size="sm" />
            </Button>
          </ButtonGroup>
        </EditInputGroup>
      )}
    </EditableCell>
  );
};

// Editable cell component for the Value column
const EditableValueCell: React.FC<{
  item: ConfigItemModel;
  isEditing: boolean;
  editedValue: string;
  onStartEdit: (item: ConfigItemModel, isKey: boolean) => void;
  onEditChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent, item: ConfigItemModel) => void;
  onSave: (item: ConfigItemModel) => void;
  onCancel: () => void;
}> = ({ item, isEditing, editedValue, onStartEdit, onEditChange, onKeyDown, onSave, onCancel }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current !== null) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const handleBlur = useCallback(() => {
    blurTimeoutRef.current = window.setTimeout(() => {
      onSave(item);
    }, 150);
  }, [item, onSave]);

  const handleButtonMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <EditableCell onClick={() => !isEditing && onStartEdit(item, false)}>
      {!isEditing ? (
        <CellContent>
          {item.value}
          <EditIcon>
            <Icon name="edit" size="sm" />
          </EditIcon>
        </CellContent>
      ) : (
        <EditInputGroup>
          <Form.Control
            ref={inputRef}
            size="sm"
            value={editedValue}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => onKeyDown(e, item)}
            onBlur={handleBlur}
          />
          <ButtonGroup size="sm">
            <Button
              variant="outline-success"
              onMouseDown={handleButtonMouseDown}
              onClick={() => onSave(item)}
            >
              <Icon name="fa-check" size="sm" />
            </Button>
            <Button
              variant="outline-secondary"
              onMouseDown={handleButtonMouseDown}
              onClick={onCancel}
            >
              <Icon name="fa-times" size="sm" />
            </Button>
          </ButtonGroup>
        </EditInputGroup>
      )}
    </EditableCell>
  );
};

export const GitConfigSettings: React.FC<GitConfigSettingsProps> = ({
  settings,
  onChange,
}) => {
  const ipc = useIpc();
  const getActiveTab = useRepositoryStore((state) => state.getActiveTab);
  const [configItems, setConfigItems] = useState<ConfigItemModel[]>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'key', desc: false }]);
  const [currentEdit, setCurrentEdit] = useState<ConfigItemModel | null>(null);
  const [editedItem, setEditedItem] = useState<ConfigItemModel>({ key: '', value: '', sourceFile: '' });
  const [clickedKey, setClickedKey] = useState(true);

  // Load config items when component mounts
  useEffect(() => {
    const activeTab = getActiveTab();
    if (activeTab?.path) {
      ipc.rpc<ConfigItemModel[]>(Channels.GETCONFIGITEMS, activeTab.path)
        .then((items) => setConfigItems(items))
        .catch((err) => console.error('Failed to load config items:', err));
    }
  }, [ipc, getActiveTab]);

  const getConfigFileDisplay = useCallback((sourceFile: string) => {
    if (!sourceFile) return '';
    return sourceFile.replace(/^.*?:/, '').replace(/['"]/g, '').replace(/\\\\/g, '\\');
  }, []);

  const isEditingItem = useCallback(
    (item: ConfigItemModel) => {
      return currentEdit !== null && currentEdit.sourceFile === item.sourceFile && currentEdit.key === item.key;
    },
    [currentEdit]
  );

  const startEdit = useCallback(
    (item: ConfigItemModel, isKey: boolean) => {
      setClickedKey(isKey);
      setEditedItem({ ...item });
      setCurrentEdit({ ...item });
    },
    []
  );

  const cancelEdit = useCallback(() => {
    setCurrentEdit(null);
  }, []);

  const doSaveItem = useCallback(
    (originalItem: ConfigItemModel, rename?: ConfigItemModel) => {
      const activeTab = getActiveTab();
      if (!activeTab?.path) return;

      ipc.rpc<ConfigItemModel[]>(Channels.SETCONFIGITEM, activeTab.path, editedItem, rename)
        .then((items) => setConfigItems(items))
        .catch((err) => {
          console.error('Failed to save config item:', err);
          if (!editedItem.sourceFile) {
            setConfigItems((prev) => prev.slice(0, -1));
          }
        });
    },
    [ipc, getActiveTab, editedItem]
  );

  const saveConfigItem = useCallback(
    (originalItem: ConfigItemModel, rename?: ConfigItemModel) => {
      if (
        !editedItem ||
        !(editedItem.key || '').trim() ||
        !currentEdit ||
        ((!clickedKey && editedItem.value === originalItem.value) ||
          (clickedKey && editedItem.key === originalItem.key)) ||
        (!currentEdit.sourceFile && !currentEdit.value)
      ) {
        return;
      }
      setCurrentEdit(null);
      doSaveItem(originalItem, rename);
    },
    [editedItem, currentEdit, clickedKey, doSaveItem]
  );

  const deleteConfigItem = useCallback(
    (item: ConfigItemModel) => {
      if (item.sourceFile) {
        const activeTab = getActiveTab();
        if (!activeTab?.path) return;

        ipc.rpc<ConfigItemModel[]>(Channels.SETCONFIGITEM, activeTab.path, { ...item, value: '' })
          .then((items) => setConfigItems(items))
          .catch((err) => console.error('Failed to delete config item:', err));
      } else {
        setConfigItems((prev) => prev.filter((i) => i !== item));
      }
    },
    [ipc, getActiveTab]
  );

  const newItem = useCallback(() => {
    let index = 0;
    while (configItems.find((x) => x.key === 'newKey' + index)) {
      index++;
    }
    const newKey = 'newKey' + index;
    const newConfigItem: ConfigItemModel = { key: newKey, value: 'newValue', sourceFile: '' };
    setConfigItems((prev) => [...prev, newConfigItem]);
    setEditedItem(newConfigItem);
    setCurrentEdit(newConfigItem);
    setClickedKey(true);
  }, [configItems]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, item: ConfigItemModel) => {
      if (e.key === 'Enter') {
        saveConfigItem(item, item);
      } else if (e.key === 'Escape') {
        cancelEdit();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (clickedKey) {
          setClickedKey(false);
        } else {
          if (!item.sourceFile) {
            saveConfigItem(item);
            setTimeout(() => newItem(), 100);
          }
        }
      }
    },
    [clickedKey, saveConfigItem, cancelEdit, newItem]
  );

  const handleEditKeyChange = useCallback((value: string) => {
    setEditedItem((prev) => ({ ...prev, key: value }));
  }, []);

  const handleEditValueChange = useCallback((value: string) => {
    setEditedItem((prev) => ({ ...prev, value: value }));
  }, []);

  const handleKeySave = useCallback(
    (item: ConfigItemModel) => {
      saveConfigItem(item, item);
    },
    [saveConfigItem]
  );

  const handleValueSave = useCallback(
    (item: ConfigItemModel) => {
      saveConfigItem(item);
    },
    [saveConfigItem]
  );

  // Column definitions
  const columnHelper = useMemo(() => createColumnHelper<ConfigItemModel>(), []);

  const columns = useMemo<ColumnDef<ConfigItemModel, any>[]>(
    () => [
      columnHelper.accessor('key', {
        header: 'Key',
        filterFn: 'includesString',
        enableSorting: true,
        cell: ({ row }) => {
          const item = row.original;
          const editing = isEditingItem(item) && clickedKey;
          return (
            <EditableKeyCell
              item={item}
              isEditing={editing}
              editedValue={editedItem.key}
              onStartEdit={startEdit}
              onEditChange={handleEditKeyChange}
              onKeyDown={handleKeyDown}
              onSave={handleKeySave}
              onCancel={cancelEdit}
            />
          );
        },
      }),
      columnHelper.accessor('value', {
        header: 'Value',
        enableSorting: true,
        cell: ({ row }) => {
          const item = row.original;
          const editing = isEditingItem(item) && !clickedKey;
          return (
            <EditableValueCell
              item={item}
              isEditing={editing}
              editedValue={editedItem.value}
              onStartEdit={startEdit}
              onEditChange={handleEditValueChange}
              onKeyDown={handleKeyDown}
              onSave={handleValueSave}
              onCancel={cancelEdit}
            />
          );
        },
      }),
      columnHelper.accessor('sourceFile', {
        header: 'Location',
        enableSorting: true,
        cell: ({ getValue }) => getConfigFileDisplay(getValue()),
      }),
      {
        id: 'actions',
        header: '',
        size: 40,
        enableSorting: false,
        cell: ({ row }) => (
          <TooltipTrigger
            placement="top"
            overlay={<Tooltip id={`tooltip-delete-config-${row.index}`}>Delete config item</Tooltip>}
          >
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => deleteConfigItem(row.original)}
            >
              <Icon name="fa-trash" size="sm" />
            </Button>
          </TooltipTrigger>
        ),
      },
    ],
    [
      columnHelper,
      isEditingItem,
      clickedKey,
      editedItem,
      startEdit,
      handleEditKeyChange,
      handleEditValueChange,
      handleKeyDown,
      handleKeySave,
      handleValueSave,
      cancelEdit,
      getConfigFileDisplay,
      deleteConfigItem,
    ]
  );

  const table = useReactTable({
    data: configItems,
    columns,
    state: {
      globalFilter,
      sorting,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    globalFilterFn: (row, _columnId, filterValue) => {
      return row.original.key.toLowerCase().includes(filterValue.toLowerCase());
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      <FormSection>
        <SectionTitle>Git Paths</SectionTitle>
        <Form.Group className="mb-3">
          <Form.Label>Git executable path</Form.Label>
          <Form.Control
            type="text"
            value={settings.gitPath || 'git'}
            onChange={(e) => onChange('gitPath', e.target.value)}
            placeholder="git"
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Bash executable path</Form.Label>
          <Form.Control
            type="text"
            value={settings.bashPath || 'bash'}
            onChange={(e) => onChange('bashPath', e.target.value)}
            placeholder="bash"
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Merge tool</Form.Label>
          <Form.Control
            type="text"
            value={settings.mergetool || ''}
            onChange={(e) => onChange('mergetool', e.target.value)}
            placeholder="sourcetree, vscode, etc."
          />
        </Form.Group>
      </FormSection>

      <FormSection>
        <SectionTitle>Timeouts</SectionTitle>
        <Form.Group>
          <Form.Label>Command timeout (seconds)</Form.Label>
          <Form.Control
            type="number"
            value={settings.commandTimeoutSeconds || 10}
            onChange={(e) => onChange('commandTimeoutSeconds', parseInt(e.target.value))}
            min={1}
            max={300}
          />
        </Form.Group>
      </FormSection>

      <FormSection>
        <SectionTitle>Git Config</SectionTitle>
        <Form.Control
          type="text"
          placeholder="Filter..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="mb-3"
        />
        <StyledTable striped hover size="sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    style={header.id === 'actions' ? { width: '1%' } : undefined}
                    onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                  >
                    <SortableHeader $canSort={header.column.getCanSort()}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() && (
                        <SortIcon>
                          {header.column.getIsSorted() === 'asc' ? '▲' : '▼'}
                        </SortIcon>
                      )}
                    </SortableHeader>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  // Key and Value columns render their own <td> (EditableCell)
                  if (cell.column.id === 'key' || cell.column.id === 'value') {
                    return (
                      <React.Fragment key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </React.Fragment>
                    );
                  }
                  return (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
            <NewItemRow onClick={newItem}>
              <td colSpan={4} className="text-muted">
                New Item...
              </td>
            </NewItemRow>
          </tbody>
        </StyledTable>
      </FormSection>
    </>
  );
};

export default GitConfigSettings;
