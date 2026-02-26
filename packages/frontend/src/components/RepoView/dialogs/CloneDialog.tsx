import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Modal, Button, Form, ProgressBar, Badge } from 'react-bootstrap';
import styled from 'styled-components';
import { useUiStore } from '../../../stores';
import { useBackendAsync, ASYNC_CHANNELS } from '../../../ipc';
import { Icon } from '@light-git/core';
import { FileInput } from '../../../common/components/FileInput/FileInput';

const OutputContainer = styled.div`
  background-color: ${({ theme }) => theme.colors.codeOutputBg};
  color: ${({ theme }) => theme.colors.codeOutputText};
  font-family: ${({ theme }) => theme.fonts.monospace};
  font-size: 0.75rem;
  padding: 0.5rem;
  border-radius: ${({ theme }) => theme.borderRadius};
  max-height: 200px;
  overflow-y: auto;
  margin-top: 0.5rem;
`;

const OutputLine = styled.div<{ $type?: 'error' | 'success' | 'info' }>`
  padding: 0.125rem 0;
  color: ${({ $type, theme }) => {
    switch ($type) {
      case 'error':
        return theme.colors.codeOutputError;
      case 'success':
        return theme.colors.codeOutputSuccess;
      case 'info':
        return theme.colors.codeOutputInfo;
      default:
        return theme.colors.codeOutputText;
    }
  }};
`;

const StatusBadge = styled(Badge)`
  margin-left: 0.5rem;
`;

interface CloneDialogProps {
  show?: boolean;
  onHide?: () => void;
  onSuccess?: (path: string) => void;
  onCloneComplete?: (path: string) => void;
}

interface CloneOutput {
  message: string;
  type?: 'error' | 'success' | 'info';
}

export const CloneDialog: React.FC<CloneDialogProps> = ({
  show,
  onHide,
  onSuccess,
  onCloneComplete,
}) => {
  const modalVisible = useUiStore((state) => state.modals['clone'] || false);
  const hideModal = useUiStore((state) => state.hideModal);

  // Support both prop-based and store-based visibility
  const isVisible = show !== undefined ? show : modalVisible;

  const [url, setUrl] = useState('');
  const [targetPath, setTargetPath] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [outputs, setOutputs] = useState<CloneOutput[]>([]);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const outputContainerRef = useRef<HTMLDivElement>(null);
  const targetPathRef = useRef(targetPath);
  targetPathRef.current = targetPath;

  // Use super-ipc async hook for clone streaming
  const { refetch: startClone } = useBackendAsync({
    channel: ASYNC_CHANNELS.Clone,
    skip: true,
    onProgress: useCallback((event: { out?: string; err?: string; done?: boolean }) => {
      if (event.out) {
        setOutputs((prev) => [...prev, { message: event.out! }]);
        setStatusMessage(event.out);
      }
      if (event.err) {
        setOutputs((prev) => [...prev, { message: event.err!, type: 'error' }]);
      }
    }, []),
    onComplete: useCallback((event: { success: boolean }) => {
      setIsCloning(false);
      if (event.success) {
        setProgress(100);
        setOutputs((prev) => [
          ...prev,
          { message: 'Clone completed successfully!', type: 'success' },
        ]);
        setTimeout(() => {
          if (onHide) {
            onHide();
          } else {
            hideModal('clone');
          }
          const callback = onSuccess || onCloneComplete;
          if (callback) {
            callback(targetPathRef.current);
          }
        }, 1000);
      }
    }, [onHide, onSuccess, onCloneComplete, hideModal]),
  });

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (outputContainerRef.current) {
      outputContainerRef.current.scrollTop = outputContainerRef.current.scrollHeight;
    }
  }, [outputs]);

  const handleClose = useCallback(() => {
    if (!isCloning) {
      if (onHide) {
        onHide();
      } else {
        hideModal('clone');
      }
      setUrl('');
      setTargetPath('');
      setProgress(0);
      setStatusMessage('');
      setOutputs([]);
      setCloneError(null);
    }
  }, [isCloning, hideModal, onHide]);

  const handleClone = useCallback(async () => {
    if (!url || !targetPath) return;

    setIsCloning(true);
    setProgress(0);
    setStatusMessage('Starting clone...');
    setOutputs([{ message: `Cloning ${url} to ${targetPath}...`, type: 'info' }]);
    setCloneError(null);

    try {
      await startClone({ repoPath: targetPath, url, targetPath });
    } catch (error: any) {
      console.error('Failed to start clone:', error);
      setCloneError(error.message || 'Failed to start clone');
      setIsCloning(false);
    }
  }, [url, targetPath, startClone]);

  const handleUrlKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && url && targetPath) {
        handleClone();
      }
    },
    [url, targetPath, handleClone]
  );

  // Extract repo name from URL for default folder name
  const handleUrlChange = useCallback((newUrl: string) => {
    setUrl(newUrl);
    // Suggest folder name from URL
    if (newUrl && !targetPath) {
      const match = newUrl.match(/\/([^\/]+?)(\.git)?$/);
      if (match) {
        setTargetPath((prev) => (prev ? prev : `~/${match[1]}`));
      }
    }
  }, [targetPath]);

  return (
    <Modal show={isVisible} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <Icon name="fa-download" className="me-2" />
          Clone Repository
          {isCloning && <StatusBadge bg="info">Cloning...</StatusBadge>}
          {cloneError && <StatusBadge bg="danger">Error</StatusBadge>}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Repository URL</Form.Label>
          <Form.Control
            type="text"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            onKeyPress={handleUrlKeyPress}
            placeholder="https://github.com/user/repo.git"
            disabled={isCloning}
          />
          <Form.Text className="text-muted">
            Enter the URL of the repository you want to clone (HTTPS, SSH, or file path)
          </Form.Text>
        </Form.Group>

        <FileInput
          value={targetPath}
          onChange={setTargetPath}
          onEnterKeyPressed={handleClone}
          label="Target Directory"
          placeholder="/path/to/clone"
          isFolder
          disabled={isCloning}
        />

        {(isCloning || outputs.length > 0) && (
          <>
            <ProgressBar
              now={progress}
              label={progress > 0 ? `${progress}%` : ''}
              animated={isCloning}
              variant={cloneError ? 'danger' : progress === 100 ? 'success' : 'primary'}
              className="mb-2"
            />
            <OutputContainer ref={outputContainerRef}>
              {outputs.map((output, index) => (
                <OutputLine key={index} $type={output.type}>
                  {output.message}
                </OutputLine>
              ))}
            </OutputContainer>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={isCloning}>
          {isCloning ? 'Close (Cancel)' : 'Cancel'}
        </Button>
        <Button
          variant="success"
          onClick={handleClone}
          disabled={!url || !targetPath || isCloning}
        >
          {isCloning ? (
            <>
              <Icon name="fa-spinner" className="fa-spin me-1" />
              Cloning...
            </>
          ) : (
            'Clone'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CloneDialog;
