import React, { useState, useCallback, useMemo } from 'react';
import { Form, Button, ListGroup, InputGroup, Badge, Accordion, Card, Tooltip } from 'react-bootstrap';
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
  regex: string;
  regexFlags?: string;
  activeFilter?: string;
  message?: string;
  enabled?: boolean;
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
  const [newRegex, setNewRegex] = useState('');
  const [newFlags, setNewFlags] = useState('gi');
  const [newActiveFilter, setNewActiveFilter] = useState('');
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
    if (!newName.trim() || !newRegex.trim()) return;

    const newWatcher: CodeWatcherModel = {
      name: newName.trim(),
      regex: newRegex.trim(),
      regexFlags: newFlags || 'gi',
      activeFilter: newActiveFilter.trim() || undefined,
      message: newMessage.trim() || undefined,
      enabled: true,
    };

    const currentWatchers = settings.codeWatchers || [];
    onChange('codeWatchers', [...currentWatchers, newWatcher]);

    // Reset form
    setNewName('');
    setNewRegex('');
    setNewFlags('gi');
    setNewActiveFilter('');
    setNewMessage('');
    setShowAddForm(false);
  }, [newName, newRegex, newFlags, newActiveFilter, newMessage, settings.codeWatchers, onChange]);

  const handleUpdateWatcher = useCallback(
    (index: number, updates: Partial<CodeWatcherModel>) => {
      const watcher = allWatchers[index];
      if (watcher.source === 'file') {
        // Move from loaded to user watchers with updates
        const loadedWatchers = settings.loadedCodeWatchers || [];
        const loadedIndex = loadedWatchers.findIndex((w: any) => 
          w.name === watcher.name && w.regex === watcher.regex
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
          w.name === watcher.name && w.regex === watcher.regex
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
          w.name === watcher.name && w.regex === watcher.regex
        );
        if (loadedIndex >= 0) {
          const newLoaded = loadedWatchers.filter((_: any, i: number) => i !== loadedIndex);
          onChange('loadedCodeWatchers', newLoaded);
        }
      } else {
        const userIndex = (settings.codeWatchers || []).findIndex((w: any) =>
          w.name === watcher.name && w.regex === watcher.regex
        );
        if (userIndex >= 0) {
          const currentWatchers = (settings.codeWatchers || []).filter((_: any, i: number) => i !== userIndex);
          onChange('codeWatchers', currentWatchers);
        }
      }
    },
    [allWatchers, settings.codeWatchers, settings.loadedCodeWatchers, onChange]
  );

  const handleCopyWatcher = useCallback(
    (index: number) => {
      const watcher = allWatchers[index];
      const copy: CodeWatcherModel = {
        name: (watcher.name || '') + ' (copy)',
        regex: watcher.regex,
        regexFlags: watcher.regexFlags,
        activeFilter: watcher.activeFilter,
        message: watcher.message,
        enabled: watcher.enabled,
      };
      const currentWatchers = settings.codeWatchers || [];
      onChange('codeWatchers', [...currentWatchers, copy]);
    },
    [allWatchers, settings.codeWatchers, onChange]
  );

  const handleWatcherPathChange = useCallback(
    (index: number, value: string) => {
      const paths = [...(settings.codeWatcherPaths || [])];
      paths[index] = value;
      onChange('codeWatcherPaths', paths);
    },
    [settings.codeWatcherPaths, onChange]
  );

  const handleAddWatcherPath = useCallback(() => {
    const paths = [...(settings.codeWatcherPaths || []), ''];
    onChange('codeWatcherPaths', paths);
  }, [settings.codeWatcherPaths, onChange]);

  const handleRemoveWatcherPath = useCallback(
    (index: number) => {
      const paths = (settings.codeWatcherPaths || []).filter((_: any, i: number) => i !== index);
      onChange('codeWatcherPaths', paths);
    },
    [settings.codeWatcherPaths, onChange]
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
        <SectionTitle>Code Watcher Files</SectionTitle>
        <p className="text-muted">
          Specify file paths containing code watcher definitions.
        </p>
        <ListGroup className="mb-2">
          {(settings.codeWatcherPaths || []).map((path: string, index: number) => (
            <ListGroup.Item key={index} className="d-flex align-items-center gap-2 py-1 px-2">
              <Form.Control
                size="sm"
                type="text"
                value={path}
                onChange={(e) => handleWatcherPathChange(index, e.target.value)}
                placeholder="Path to watcher file..."
                className="flex-grow-1"
              />
              <TooltipTrigger
                placement="top"
                overlay={<Tooltip id={`tooltip-remove-watcher-path-${index}`}>Remove watcher file</Tooltip>}
              >
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleRemoveWatcherPath(index)}
                >
                  <Icon name="fa-trash" size="sm" />
                </Button>
              </TooltipTrigger>
            </ListGroup.Item>
          ))}
        </ListGroup>
        <Button variant="outline-primary" size="sm" onClick={handleAddWatcherPath}>
          <Icon name="fa-plus" className="me-1" />
          Add File
        </Button>
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
                      checked={watcher.enabled !== false}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleUpdateWatcher(index, { enabled: e.target.checked });
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <WatcherName className={watcher.enabled === false ? 'text-muted' : ''}>
                      {watcher.name || 'Unnamed Watcher'}
                    </WatcherName>
                    {watcher.source === 'file' && (
                      <TooltipTrigger
                        placement="top"
                        overlay={<Tooltip id={`tooltip-watcher-file-${watcher.name}`}>Loaded from config file</Tooltip>}
                      >
                        <Badge bg="info">file</Badge>
                      </TooltipTrigger>
                    )}
                    <WatcherPattern>
                      /{(watcher.regex || '').length > 20 ? (watcher.regex || '').substring(0, 20) + '...' : watcher.regex || ''}/
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
                          value={watcher.regex || ''}
                          onChange={(e) => handleUpdateWatcher(index, { regex: e.target.value })}
                          isInvalid={!isPatternValid(watcher.regex || '')}
                        />
                        <InputGroup.Text>/</InputGroup.Text>
                        <Form.Control
                          value={watcher.regexFlags || 'gi'}
                          onChange={(e) => handleUpdateWatcher(index, { regexFlags: e.target.value })}
                          style={{ maxWidth: '60px' }}
                        />
                      </InputGroup>
                      {!isPatternValid(watcher.regex || '') && (
                        <Form.Text className="text-danger">Invalid regular expression</Form.Text>
                      )}
                    </Form.Group>
                    <Form.Group>
                      <Form.Label>Filename Filter (RegEx, optional)</Form.Label>
                      <Form.Control
                        placeholder="e.g., \.test\.ts$ or \.(ts|tsx)$"
                        value={watcher.activeFilter || ''}
                        onChange={(e) => handleUpdateWatcher(index, { activeFilter: e.target.value })}
                        isInvalid={!isPatternValid(watcher.activeFilter || '')}
                      />
                      {!isPatternValid(watcher.activeFilter || '') && (
                        <Form.Text className="text-danger">Invalid regular expression &mdash; this field uses regex, not glob patterns</Form.Text>
                      )}
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
                    <div className="d-flex justify-content-end gap-2">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => handleCopyWatcher(index)}
                      >
                        <Icon name="fa-copy" className="me-1" />
                        Copy
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleRemoveWatcher(index)}
                      >
                        <Icon name="fa-trash" className="me-1" />
                        Remove
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
                      value={newRegex}
                      onChange={(e) => setNewRegex(e.target.value)}
                      isInvalid={!!newRegex && !isPatternValid(newRegex)}
                    />
                    <InputGroup.Text>/</InputGroup.Text>
                    <Form.Control
                      placeholder="gi"
                      value={newFlags}
                      onChange={(e) => setNewFlags(e.target.value)}
                      style={{ maxWidth: '60px' }}
                    />
                  </InputGroup>
                  {newRegex && !isPatternValid(newRegex) && (
                    <Form.Text className="text-danger">Invalid regular expression</Form.Text>
                  )}
                </Form.Group>
                <Form.Group>
                  <Form.Label>Filename Filter (RegEx, optional)</Form.Label>
                  <Form.Control
                    placeholder="e.g., \.test\.ts$ or \.(ts|tsx)$"
                    value={newActiveFilter}
                    onChange={(e) => setNewActiveFilter(e.target.value)}
                    isInvalid={!!newActiveFilter && !isPatternValid(newActiveFilter)}
                  />
                  {newActiveFilter && !isPatternValid(newActiveFilter) && (
                    <Form.Text className="text-danger">Invalid regular expression &mdash; this field uses regex, not glob patterns</Form.Text>
                  )}
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
                    disabled={
                      !newName.trim() || !newRegex.trim()
                      || !isPatternValid(newRegex)
                      || !isPatternValid(newActiveFilter)
                    }
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
