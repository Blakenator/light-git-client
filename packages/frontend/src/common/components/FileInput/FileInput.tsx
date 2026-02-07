import React, { useCallback } from 'react';
import styled from 'styled-components';
import { Button, Form, InputGroup, Tooltip } from 'react-bootstrap';
import { invokeSync } from '../../../ipc/invokeSync';
import { SYNC_CHANNELS } from '@light-git/shared';
import { Icon, TooltipTrigger } from '@light-git/core';

const FileInputWrapper = styled.div`
  margin-bottom: 1rem;
`;

const FileInputLabel = styled(Form.Label)`
  font-weight: 500;
  margin-bottom: 0.5rem;
`;

interface FileInputProps {
  value: string;
  onChange: (path: string) => void;
  onEnterKeyPressed?: (path: string) => void;
  label?: string;
  placeholder?: string;
  isFolder?: boolean;
  allowMultiple?: boolean;
  disabled?: boolean;
  filter?: string[];
}

export const FileInput: React.FC<FileInputProps> = ({
  value,
  onChange,
  onEnterKeyPressed,
  label,
  placeholder = 'Select a file or folder...',
  isFolder = false,
  allowMultiple = false,
  disabled = false,
  filter = ['*'],
}) => {
  const handleBrowse = useCallback(async () => {
    try {
      const properties: string[] = isFolder ? ['openDirectory'] : ['openFile'];
      if (allowMultiple) {
        properties.push('multiSelections');
      }

      const result = await invokeSync(SYNC_CHANNELS.OpenFileDialog, {
        options: { properties, filters: filter },
      });

      if (result && result.length > 0) {
        if (allowMultiple) {
          onChange(result.join(','));
        } else {
          onChange(result[0]);
        }
      }
    } catch (error) {
      console.error('Failed to open file dialog:', error);
    }
  }, [isFolder, allowMultiple, filter, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onEnterKeyPressed) {
        onEnterKeyPressed(value.replace(/"/g, ''));
      }
    },
    [value, onEnterKeyPressed]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <FileInputWrapper>
      {label && <FileInputLabel>{label}</FileInputLabel>}
      <InputGroup>
        <Form.Control
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
        />
        <TooltipTrigger
          placement="top"
          overlay={<Tooltip id="tooltip-browse-file">{isFolder ? 'Browse for folder' : 'Browse for file'}</Tooltip>}
        >
          <Button
            variant="secondary"
            onClick={handleBrowse}
            disabled={disabled}
          >
            <Icon name="fa-folder-open" />
          </Button>
        </TooltipTrigger>
      </InputGroup>
    </FileInputWrapper>
  );
};

export default FileInput;
