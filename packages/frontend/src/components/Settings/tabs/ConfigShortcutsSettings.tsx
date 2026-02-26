import React, { useState, useCallback, useMemo } from 'react';
import { Form, Button, ListGroup, InputGroup, Badge, Row, Col, Alert, Tooltip } from 'react-bootstrap';
import styled from 'styled-components';
import { Icon, TooltipTrigger } from '@light-git/core';

const FormSection = styled.div`
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h6`
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 0.5rem;
`;

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
  const [credentialHelper, setCredentialHelper] = useState(settings.credentialHelper || 'cache');
  const [cacheHelperSeconds, setCacheHelperSeconds] = useState(settings.cacheHelperSeconds || '900');
  const [mergetoolName, setMergetoolName] = useState(settings.mergetool || '');
  const [mergetoolCommand, setMergetoolCommand] = useState(settings.mergetoolCommand || '');
  const [setGlobalDefaultUserConfig, setSetGlobalDefaultUserConfig] = useState(false);
  const [setGlobalDefaultMergetoolConfig, setSetGlobalDefaultMergetoolConfig] = useState(false);

  const handleCredentialHelperChange = useCallback(
    (value: string) => {
      setCredentialHelper(value);
      onChange('credentialHelper', value);
    },
    [onChange]
  );

  const handleCacheTimeoutChange = useCallback(
    (value: string) => {
      setCacheHelperSeconds(value);
      onChange('cacheHelperSeconds', value);
    },
    [onChange]
  );

  const handleMergetoolNameChange = useCallback(
    (value: string) => {
      setMergetoolName(value);
      onChange('mergetool', value);
    },
    [onChange]
  );

  const handleMergetoolCommandChange = useCallback(
    (value: string) => {
      setMergetoolCommand(value);
      onChange('mergetoolCommand', value);
    },
    [onChange]
  );

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
      <FormSection>
        <SectionTitle>User Config</SectionTitle>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Display Name</Form.Label>
              <Form.Control
                type="text"
                value={settings.username || ''}
                onChange={(e) => onChange('username', e.target.value)}
                placeholder="Your name"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Display Email</Form.Label>
              <Form.Control
                type="email"
                value={settings.email || ''}
                onChange={(e) => onChange('email', e.target.value)}
                placeholder="your@email.com"
              />
            </Form.Group>
            <Form.Check
              type="switch"
              id="setting-globalDefaultUserConfig"
              label="Set as Global Defaults"
              checked={setGlobalDefaultUserConfig}
              onChange={(e) => setSetGlobalDefaultUserConfig(e.target.checked)}
            />
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Mergetool Name</Form.Label>
              <Form.Control
                type="text"
                value={mergetoolName}
                onChange={(e) => handleMergetoolNameChange(e.target.value)}
                placeholder="e.g., vscode, sourcetree"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Mergetool Command</Form.Label>
              <Form.Text className="text-muted d-block mb-1">
                Supports <code>$BASE $LOCAL $MERGED $REMOTE</code>
              </Form.Text>
              <Form.Control
                type="text"
                value={mergetoolCommand}
                onChange={(e) => handleMergetoolCommandChange(e.target.value)}
                placeholder="e.g., code --wait --merge $REMOTE $LOCAL $BASE $MERGED"
              />
            </Form.Group>
            <Form.Check
              type="switch"
              id="setting-globalDefaultMergetoolConfig"
              label="Set as Global Default"
              checked={setGlobalDefaultMergetoolConfig}
              onChange={(e) => setSetGlobalDefaultMergetoolConfig(e.target.checked)}
            />
          </Col>
        </Row>
      </FormSection>

      <FormSection>
        <SectionTitle>Credential Helper</SectionTitle>
        {(credentialHelper === 'osxkeychain' || credentialHelper === 'wincred') && (
          <Alert variant="warning" className="py-2">
            {credentialHelper === 'osxkeychain' && 'Warning: This only works on Mac'}
            {credentialHelper === 'wincred' && 'Warning: This only works on Windows'}
          </Alert>
        )}
        <Form.Group className="mb-3">
          <Form.Select
            value={credentialHelper}
            onChange={(e) => handleCredentialHelperChange(e.target.value)}
          >
            <option value="cache">Cache</option>
            <option value="store">Unencrypted</option>
            <option value="osxkeychain">OSX Keychain</option>
            <option value="wincred">Windows Credential Manager</option>
          </Form.Select>
        </Form.Group>
        {credentialHelper === 'cache' && (
          <Form.Group className="mb-3">
            <Form.Label>Cache Timeout</Form.Label>
            <InputGroup>
              <Form.Control
                type="text"
                value={cacheHelperSeconds}
                onChange={(e) => handleCacheTimeoutChange(e.target.value)}
                pattern="^\d+$"
              />
              <InputGroup.Text>seconds</InputGroup.Text>
            </InputGroup>
          </Form.Group>
        )}
      </FormSection>

      <FormSection>
        <SectionTitle>Config Shortcuts</SectionTitle>
        <p className="text-muted">
          Configure quick access to common Git settings. Values here will be
          displayed in the Git Config tab for easy editing.
        </p>
      </FormSection>

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
            <TooltipTrigger
              placement="top"
              overlay={<Tooltip id={`tooltip-remove-shortcut-${index}`}>Remove shortcut</Tooltip>}
            >
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => handleRemoveShortcut(index)}
              >
                <Icon name="fa-trash" size="sm" />
              </Button>
            </TooltipTrigger>
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
