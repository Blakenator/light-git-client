import React, { useState, useCallback, useMemo } from 'react';
import { Form, Button, ListGroup, InputGroup, Badge } from 'react-bootstrap';
import styled from 'styled-components';
import { Icon } from '@light-git/core';
const ShortcutsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ShortcutItem = styled(ListGroup.Item)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ShortcutLabel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const ShortcutKey = styled.code`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.primary};
`;

const ShortcutDescription = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.secondary};
`;

const AddShortcutForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius};
`;

interface ConfigShortcut {
  key: string;
  value: string;
  description?: string;
  scope?: 'local' | 'global';
}

interface ConfigShortcutsSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

// Common git config shortcuts
const DEFAULT_SHORTCUTS: ConfigShortcut[] = [
  {
    key: 'user.name',
    value: '',
    description: 'Your name for commits',
    scope: 'global',
  },
  {
    key: 'user.email',
    value: '',
    description: 'Your email for commits',
    scope: 'global',
  },
  {
    key: 'core.autocrlf',
    value: 'input',
    description: 'Line ending conversion (true/false/input)',
    scope: 'global',
  },
  {
    key: 'pull.rebase',
    value: 'false',
    description: 'Rebase instead of merge on pull',
    scope: 'global',
  },
  {
    key: 'push.default',
    value: 'current',
    description: 'Default push behavior',
    scope: 'global',
  },
  {
    key: 'core.editor',
    value: 'code --wait',
    description: 'Default editor for git',
    scope: 'global',
  },
];

export const ConfigShortcutsSettings: React.FC<ConfigShortcutsSettingsProps> = ({
  settings,
  onChange,
}) => {
  const [shortcuts, setShortcuts] = useState<ConfigShortcut[]>(
    settings.configShortcuts?.length ? settings.configShortcuts : DEFAULT_SHORTCUTS
  );
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newScope, setNewScope] = useState<'local' | 'global'>('global');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleShortcutChange = useCallback(
    (index: number, value: string) => {
    const updated = [...shortcuts];
    updated[index] = { ...updated[index], value };
    setShortcuts(updated);
    onChange('configShortcuts', updated);
    },
    [shortcuts, onChange]
  );

  const handleAddShortcut = useCallback(() => {
    if (!newKey.trim()) return;

    const newShortcut: ConfigShortcut = {
      key: newKey.trim(),
      value: newValue.trim(),
      description: newDescription.trim() || undefined,
      scope: newScope,
    };

    const updated = [...shortcuts, newShortcut];
    setShortcuts(updated);
    onChange('configShortcuts', updated);

    // Reset form
    setNewKey('');
    setNewValue('');
    setNewDescription('');
    setShowAddForm(false);
  }, [newKey, newValue, newDescription, newScope, shortcuts, onChange]);

  const handleRemoveShortcut = useCallback(
    (index: number) => {
    const updated = shortcuts.filter((_, i) => i !== index);
    setShortcuts(updated);
    onChange('configShortcuts', updated);
    },
    [shortcuts, onChange]
  );

  const handleScopeChange = useCallback(
    (index: number, scope: 'local' | 'global') => {
    const updated = [...shortcuts];
    updated[index] = { ...updated[index], scope };
    setShortcuts(updated);
    onChange('configShortcuts', updated);
    },
    [shortcuts, onChange]
  );

  return (
    <ShortcutsContainer>
      <p className="text-muted">
        Configure quick access to common Git settings. Values here will be
        displayed in the Git Config tab for easy editing.
      </p>

      <ListGroup>
        {shortcuts.map((shortcut, index) => (
          <ShortcutItem key={shortcut.key}>
            <ShortcutLabel>
              <ShortcutKey>{shortcut.key}</ShortcutKey>
              {shortcut.description && (
                <ShortcutDescription>{shortcut.description}</ShortcutDescription>
              )}
            </ShortcutLabel>
            <Badge bg={shortcut.scope === 'local' ? 'info' : 'secondary'}>
              {shortcut.scope || 'global'}
            </Badge>
            <Form.Select
              size="sm"
              value={shortcut.scope || 'global'}
              onChange={(e) =>
                handleScopeChange(index, e.target.value as 'local' | 'global')
              }
              style={{ width: '100px' }}
            >
              <option value="global">Global</option>
              <option value="local">Local</option>
            </Form.Select>
            <InputGroup style={{ width: '200px' }}>
              <Form.Control
                size="sm"
                placeholder="Value"
                value={shortcut.value}
                onChange={(e) => handleShortcutChange(index, e.target.value)}
              />
            </InputGroup>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => handleRemoveShortcut(index)}
              title="Remove shortcut"
            >
              <Icon name="fa-trash" size="sm" />
            </Button>
          </ShortcutItem>
        ))}
      </ListGroup>

      {showAddForm ? (
        <AddShortcutForm>
          <Form.Group>
            <Form.Label>Config Key</Form.Label>
            <Form.Control
              placeholder="e.g., user.signingkey"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Default Value</Form.Label>
            <Form.Control
              placeholder="e.g., ABCDEF123456"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Description (optional)</Form.Label>
            <Form.Control
              placeholder="e.g., GPG key ID for signing commits"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Scope</Form.Label>
            <Form.Select
              value={newScope}
              onChange={(e) => setNewScope(e.target.value as 'local' | 'global')}
            >
              <option value="global">Global</option>
              <option value="local">Local</option>
            </Form.Select>
          </Form.Group>
          <div className="d-flex gap-2 mt-2">
            <Button variant="secondary" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddShortcut}>
              Add Shortcut
            </Button>
          </div>
        </AddShortcutForm>
      ) : (
        <Button variant="outline-primary" onClick={() => setShowAddForm(true)}>
          <Icon name="fa-plus" className="me-1" />
          Add Shortcut
        </Button>
      )}
    </ShortcutsContainer>
  );
};

export default ConfigShortcutsSettings;
