import React, { useState, useCallback, useMemo } from 'react';
import { Form, Button, ListGroup, InputGroup, Badge, Accordion, Card } from 'react-bootstrap';
import styled from 'styled-components';
import { Icon, PrettyCheckbox } from '@light-git/core';

const FormSection = styled.div`
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h6`
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 0.5rem;
`;

const WatcherCard = styled(Card)`
  margin-bottom: 0.5rem;
`;

const WatcherHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
`;

const WatcherName = styled.span`
  font-weight: 500;
  flex: 1;
`;

const WatcherPattern = styled.code`
  color: ${({ theme }) => theme.colors.secondary};
  font-size: 0.8rem;
`;

const WatcherEditForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
`;

interface CodeWatcherModel {
  name: string;
  pattern: string;
  flags?: string;
  filePattern?: string;
  message?: string;
  disabled?: boolean;
  source?: 'user' | 'file';
}

interface CodeWatcherSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export const CodeWatcherSettings: React.FC<CodeWatcherSettingsProps> = ({
  settings,
  onChange,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPattern, setNewPattern] = useState('');
  const [newFlags, setNewFlags] = useState('gi');
  const [newFilePattern, setNewFilePattern] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [expandedWatcher, setExpandedWatcher] = useState<number | null>(null);

  // Merge user watchers and loaded watchers into one list
  const allWatchers = useMemo(() => {
    const userWatchers: CodeWatcherModel[] = (settings.codeWatchers || []).map((w: any) => ({
      ...w,
      source: 'user' as const,
    }));
    const loadedWatchers: CodeWatcherModel[] = (settings.loadedCodeWatchers || []).map((w: any) => ({
      ...w,
      source: 'file' as const,
    }));
    return [...userWatchers, ...loadedWatchers];
  }, [settings.codeWatchers, settings.loadedCodeWatchers]);

  const handleAddWatcher = useCallback(() => {
    if (!newName.trim() || !newPattern.trim()) return;

    const newWatcher: CodeWatcherModel = {
      name: newName.trim(),
      pattern: newPattern.trim(),
      flags: newFlags || 'gi',
      filePattern: newFilePattern.trim() || undefined,
      message: newMessage.trim() || undefined,
    };

    const currentWatchers = settings.codeWatchers || [];
    onChange('codeWatchers', [...currentWatchers, newWatcher]);

    // Reset form
    setNewName('');
    setNewPattern('');
    setNewFlags('gi');
    setNewFilePattern('');
    setNewMessage('');
    setShowAddForm(false);
  }, [newName, newPattern, newFlags, newFilePattern, newMessage, settings.codeWatchers, onChange]);

  const handleUpdateWatcher = useCallback(
    (index: number, updates: Partial<CodeWatcherModel>) => {
      const watcher = allWatchers[index];
      if (watcher.source === 'file') {
        // Move from loaded to user watchers with updates
        const loadedWatchers = settings.loadedCodeWatchers || [];
        const loadedIndex = loadedWatchers.findIndex((w: any) => 
          w.name === watcher.name && w.pattern === watcher.pattern
        );
        if (loadedIndex >= 0) {
          const newLoaded = loadedWatchers.filter((_: any, i: number) => i !== loadedIndex);
          onChange('loadedCodeWatchers', newLoaded);
        }
        const currentWatchers = settings.codeWatchers || [];
        onChange('codeWatchers', [...currentWatchers, { ...watcher, ...updates, source: undefined }]);
      } else {
        // Update user watcher
        const userIndex = (settings.codeWatchers || []).findIndex((w: any) =>
          w.name === watcher.name && w.pattern === watcher.pattern
        );
        if (userIndex >= 0) {
          const currentWatchers = [...(settings.codeWatchers || [])];
          currentWatchers[userIndex] = { ...currentWatchers[userIndex], ...updates };
          onChange('codeWatchers', currentWatchers);
        }
      }
    },
    [allWatchers, settings.codeWatchers, settings.loadedCodeWatchers, onChange]
  );

  const handleRemoveWatcher = useCallback(
    (index: number) => {
      const watcher = allWatchers[index];
      if (watcher.source === 'file') {
        const loadedWatchers = settings.loadedCodeWatchers || [];
        const loadedIndex = loadedWatchers.findIndex((w: any) => 
          w.name === watcher.name && w.pattern === watcher.pattern
        );
        if (loadedIndex >= 0) {
          const newLoaded = loadedWatchers.filter((_: any, i: number) => i !== loadedIndex);
          onChange('loadedCodeWatchers', newLoaded);
        }
      } else {
        const userIndex = (settings.codeWatchers || []).findIndex((w: any) =>
          w.name === watcher.name && w.pattern === watcher.pattern
        );
        if (userIndex >= 0) {
          const currentWatchers = (settings.codeWatchers || []).filter((_: any, i: number) => i !== userIndex);
          onChange('codeWatchers', currentWatchers);
        }
      }
    },
    [allWatchers, settings.codeWatchers, settings.loadedCodeWatchers, onChange]
  );

  const isPatternValid = useCallback((pattern: string): boolean => {
    if (!pattern) return true;
    try {
      new RegExp(pattern);
      return true;
    } catch {
      return false;
    }
  }, []);

  return (
    <>
      <FormSection>
        <SectionTitle>Code Watcher Settings</SectionTitle>
        <p className="text-muted">
          Code watchers analyze your staged changes before commit and alert you to
          potential issues like console.log statements, TODO comments, etc.
        </p>
        <Form.Check
          type="switch"
          id="include-unchanged"
          label="Include unchanged context in watcher analysis"
          checked={settings.includeUnchangedInWatcherAnalysis}
          onChange={(e) => onChange('includeUnchangedInWatcherAnalysis', e.target.checked)}
        />
      </FormSection>

      <FormSection>
        <SectionTitle>
          Code Watchers
          <Badge bg="secondary" className="ms-2">{allWatchers.length}</Badge>
        </SectionTitle>

        {allWatchers.length === 0 ? (
          <p className="text-muted">No code watchers configured. Add one below.</p>
        ) : (
          <Accordion activeKey={expandedWatcher?.toString()}>
            {allWatchers.map((watcher, index) => (
              <Accordion.Item key={index} eventKey={index.toString()}>
                <Accordion.Header onClick={() => setExpandedWatcher(expandedWatcher === index ? null : index)}>
                  <WatcherHeader>
                    <Form.Check
                      type="switch"
                      checked={!watcher.disabled}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleUpdateWatcher(index, { disabled: !e.target.checked });
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <WatcherName className={watcher.disabled ? 'text-muted' : ''}>
                      {watcher.name || 'Unnamed Watcher'}
                    </WatcherName>
                    {watcher.source === 'file' && (
                      <Badge bg="info" title="Loaded from config file">file</Badge>
                    )}
                    <WatcherPattern>
                      /{(watcher.pattern || '').length > 20 ? (watcher.pattern || '').substring(0, 20) + '...' : watcher.pattern || ''}/
                    </WatcherPattern>
                  </WatcherHeader>
                </Accordion.Header>
                <Accordion.Body>
                  <WatcherEditForm>
                    <Form.Group>
                      <Form.Label>Name</Form.Label>
                      <Form.Control
                        value={watcher.name || ''}
                        onChange={(e) => handleUpdateWatcher(index, { name: e.target.value })}
                      />
                    </Form.Group>
                    <Form.Group>
                      <Form.Label>Pattern (RegEx)</Form.Label>
                      <InputGroup>
                        <InputGroup.Text>/</InputGroup.Text>
                        <Form.Control
                          value={watcher.pattern || ''}
                          onChange={(e) => handleUpdateWatcher(index, { pattern: e.target.value })}
                          isInvalid={!isPatternValid(watcher.pattern || '')}
                        />
                        <InputGroup.Text>/</InputGroup.Text>
                        <Form.Control
                          value={watcher.flags || 'gi'}
                          onChange={(e) => handleUpdateWatcher(index, { flags: e.target.value })}
                          style={{ maxWidth: '60px' }}
                        />
                      </InputGroup>
                    </Form.Group>
                    <Form.Group>
                      <Form.Label>File Pattern (optional)</Form.Label>
                      <Form.Control
                        placeholder="e.g., *.ts,*.tsx"
                        value={watcher.filePattern || ''}
                        onChange={(e) => handleUpdateWatcher(index, { filePattern: e.target.value })}
                      />
                    </Form.Group>
                    <Form.Group>
                      <Form.Label>Warning Message (optional)</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        placeholder="Custom warning message to show when pattern matches"
                        value={watcher.message || ''}
                        onChange={(e) => handleUpdateWatcher(index, { message: e.target.value })}
                      />
                    </Form.Group>
                    <div className="d-flex justify-content-end">
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleRemoveWatcher(index)}
                      >
                        <Icon name="fa-trash" className="me-1" />
                        Remove Watcher
                      </Button>
                    </div>
                  </WatcherEditForm>
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        )}

        {showAddForm ? (
          <WatcherCard className="mt-3">
            <Card.Body>
              <WatcherEditForm>
                <h6>Add New Watcher</h6>
                <Form.Group>
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    placeholder="e.g., Console Log"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label>Pattern (RegEx)</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>/</InputGroup.Text>
                    <Form.Control
                      placeholder="e.g., console\\.log"
                      value={newPattern}
                      onChange={(e) => setNewPattern(e.target.value)}
                      isInvalid={newPattern && !isPatternValid(newPattern)}
                    />
                    <InputGroup.Text>/</InputGroup.Text>
                    <Form.Control
                      placeholder="gi"
                      value={newFlags}
                      onChange={(e) => setNewFlags(e.target.value)}
                      style={{ maxWidth: '60px' }}
                    />
                  </InputGroup>
                  {newPattern && !isPatternValid(newPattern) && (
                    <Form.Text className="text-danger">Invalid regular expression</Form.Text>
                  )}
                </Form.Group>
                <Form.Group>
                  <Form.Label>File Pattern (optional)</Form.Label>
                  <Form.Control
                    placeholder="e.g., *.ts,*.tsx"
                    value={newFilePattern}
                    onChange={(e) => setNewFilePattern(e.target.value)}
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label>Warning Message (optional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    placeholder="Custom warning message"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                </Form.Group>
                <div className="d-flex gap-2">
                  <Button variant="secondary" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleAddWatcher}
                    disabled={!newName.trim() || !newPattern.trim() || !isPatternValid(newPattern)}
                  >
                    Add Watcher
                  </Button>
                </div>
              </WatcherEditForm>
            </Card.Body>
          </WatcherCard>
        ) : (
          <Button
            variant="outline-primary"
            className="mt-3"
            onClick={() => setShowAddForm(true)}
          >
            <Icon name="fa-plus" className="me-1" />
            Add Code Watcher
          </Button>
        )}
      </FormSection>
    </>
  );
};

export default CodeWatcherSettings;
