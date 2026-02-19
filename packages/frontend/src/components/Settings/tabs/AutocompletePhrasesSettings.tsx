import React, { useState, useCallback } from 'react';
import { Form, Button, Table } from 'react-bootstrap';
import styled from 'styled-components';
import { Icon } from '@light-git/core';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.secondary};
  margin-bottom: 0;
`;

const StyledTable = styled(Table)`
  margin-bottom: 0;

  td {
    vertical-align: middle;
  }

  td:last-child {
    white-space: nowrap;
    width: 1%;
  }
`;

const KeywordInput = styled(Form.Control)`
  font-family: ${({ theme }) => theme.fonts.monospace};
  font-size: 0.875rem;
`;

const ValueTextarea = styled(Form.Control)`
  font-size: 0.875rem;
  min-height: 36px;
  resize: vertical;
`;

interface AutocompletePhrase {
  keyword: string;
  value: string;
}

interface AutocompletePhrasesSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export const AutocompletePhrasesSettings: React.FC<AutocompletePhrasesSettingsProps> = ({
  settings,
  onChange,
}) => {
  const [phrases, setPhrases] = useState<AutocompletePhrase[]>(
    settings.autocompletePhrases?.length ? settings.autocompletePhrases : [],
  );

  const update = useCallback(
    (next: AutocompletePhrase[]) => {
      setPhrases(next);
      onChange('autocompletePhrases', next);
    },
    [onChange],
  );

  const handleKeywordChange = useCallback(
    (index: number, keyword: string) => {
      const next = [...phrases];
      next[index] = { ...next[index], keyword };
      update(next);
    },
    [phrases, update],
  );

  const handleValueChange = useCallback(
    (index: number, value: string) => {
      const next = [...phrases];
      next[index] = { ...next[index], value };
      update(next);
    },
    [phrases, update],
  );

  const handleDelete = useCallback(
    (index: number) => {
      update(phrases.filter((_, i) => i !== index));
    },
    [phrases, update],
  );

  const handleClone = useCallback(
    (index: number) => {
      const cloned = { ...phrases[index] };
      const next = [...phrases];
      next.splice(index + 1, 0, cloned);
      update(next);
    },
    [phrases, update],
  );

  const handleAdd = useCallback(() => {
    update([...phrases, { keyword: '', value: '' }]);
  }, [phrases, update]);

  return (
    <Container>
      <Description>
        Define keywords and their replacement values. These will always appear
        in the commit message autocomplete list when you type <code>@</code>.
      </Description>

      <StyledTable size="sm" hover>
        <thead>
          <tr>
            <th style={{ width: '30%' }}>Keyword</th>
            <th>Value</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {phrases.map((phrase, index) => (
            <tr key={index}>
              <td>
                <KeywordInput
                  size="sm"
                  value={phrase.keyword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleKeywordChange(index, e.target.value)
                  }
                  placeholder="keyword"
                />
              </td>
              <td>
                <ValueTextarea
                  as="textarea"
                  size="sm"
                  rows={1}
                  value={phrase.value}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    handleValueChange(index, e.target.value)
                  }
                  placeholder="replacement value"
                />
              </td>
              <td>
                <div className="d-flex gap-1">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => handleClone(index)}
                    title="Clone"
                  >
                    <Icon name="fa-clone" size="sm" />
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDelete(index)}
                    title="Delete"
                  >
                    <Icon name="fa-trash" size="sm" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {phrases.length === 0 && (
            <tr>
              <td colSpan={3} className="text-center text-muted py-3">
                No autocomplete phrases yet. Add one below.
              </td>
            </tr>
          )}
        </tbody>
      </StyledTable>

      <div>
        <Button variant="outline-primary" size="sm" onClick={handleAdd}>
          <Icon name="fa-plus" className="me-1" />
          Add Phrase
        </Button>
      </div>
    </Container>
  );
};

export default AutocompletePhrasesSettings;
