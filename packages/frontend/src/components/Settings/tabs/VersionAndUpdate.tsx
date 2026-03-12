import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Badge, Button, ProgressBar, Accordion, Alert, Card } from 'react-bootstrap';
import styled from 'styled-components';
import { SYNC_CHANNELS, ASYNC_CHANNELS } from '@light-git/shared';
import type { UpdateStatusInfo, UpdateDownloadProgress } from '@light-git/shared';
import { UpdateState } from '@light-git/shared';
import { Icon, TooltipTrigger } from '@light-git/core';
import { invokeSync } from '../../../ipc/invokeSync';
import { useBackendListener } from '../../../ipc/useBackendListener';
import { useBackendAsync } from '../../../ipc';
import { useUiStore } from '../../../stores';

const VersionBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const ReleaseNotesContent = styled.div`
  max-height: 300px;
  overflow-y: auto;
  font-size: 0.875rem;
  padding: 0.5rem;

  ul, ol {
    padding-left: 1.25rem;
  }

  h1, h2, h3 {
    font-size: 1rem;
    margin-top: 0.75rem;
    margin-bottom: 0.5rem;
  }
`;

const ProgressDetails = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.secondary};
  margin-top: 0.25rem;
  display: flex;
  justify-content: space-between;
`;

const AccordionHeaderContent = styled.span`
  display: flex;
  align-items: center;
  flex: 1;
  gap: 0.5rem;
`;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export const VersionAndUpdate: React.FC = () => {
  const [version, setVersion] = useState('');
  const [updateStatus, setUpdateStatus] = useState<UpdateStatusInfo>({ state: UpdateState.Idle });
  const [downloadProgress, setDownloadProgress] = useState<UpdateDownloadProgress | null>(null);
  const addAlert = useUiStore((state) => state.addAlert);
  const prevStateRef = useRef(updateStatus.state);

  useEffect(() => {
    invokeSync(SYNC_CHANNELS.GetVersion)
      .then((v) => setVersion(v))
      .catch(() => {});

    invokeSync(SYNC_CHANNELS.GetUpdateStatus)
      .then((status) => setUpdateStatus(status))
      .catch(() => {});
  }, []);

  useBackendListener<UpdateStatusInfo>(SYNC_CHANNELS.UpdateStatusChanged, useCallback((status) => {
    setUpdateStatus(status);

    if (status.state === UpdateState.Available && prevStateRef.current !== UpdateState.Available) {
      addAlert(`Version ${status.version} is available!`, 'info');
    }

    prevStateRef.current = status.state;
  }, [addAlert]));

  const checkForUpdates = useCallback(() => {
    invokeSync(SYNC_CHANNELS.CheckForUpdates)
      .then((status) => setUpdateStatus(status))
      .catch(() => {});
  }, []);

  const { refetch: startDownload } = useBackendAsync({
    channel: ASYNC_CHANNELS.DownloadUpdate,
    skip: true,
    onProgress: useCallback((progress: UpdateDownloadProgress) => {
      setDownloadProgress(progress);
    }, []),
    onComplete: useCallback((status: UpdateStatusInfo) => {
      setUpdateStatus(status);
      setDownloadProgress(null);
    }, []),
  });

  const downloadUpdate = useCallback(() => {
    setDownloadProgress({ percent: 0, bytesPerSecond: 0, transferred: 0, total: 0 });
    startDownload(undefined as any);
  }, [startDownload]);

  const cancelDownload = useCallback(() => {
    invokeSync(SYNC_CHANNELS.CancelDownloadUpdate)
      .then(() => {
        setDownloadProgress(null);
        setUpdateStatus((prev) => ({ ...prev, state: UpdateState.Available }));
      })
      .catch(() => {});
  }, []);

  const restartAndInstall = useCallback(() => {
    invokeSync(SYNC_CHANNELS.RestartAndInstallUpdate).catch(() => {});
  }, []);

  const openDownloadFolder = useCallback(() => {
    if (updateStatus.downloadedFilePath) {
      invokeSync(SYNC_CHANNELS.OpenFolder, { path: updateStatus.downloadedFilePath }).catch(() => {});
    }
  }, [updateStatus.downloadedFilePath]);

  const renderUpdateUI = () => {
    switch (updateStatus.state) {
      case UpdateState.Idle:
        return (
          <Button
            variant="primary"
            size="sm"
            onClick={checkForUpdates}
            className="d-inline-flex align-items-center gap-1"
          >
            <Icon name="fa-sync" size="sm" />
            Check for Updates
          </Button>
        );

      case UpdateState.Checking:
        return (
          <Button
            variant="primary"
            size="sm"
            disabled
            className="d-inline-flex align-items-center gap-1"
          >
            <Icon name="fa-sync" size="sm" />
            Checking...
          </Button>
        );

      case UpdateState.NotAvailable:
        return (
          <>
            <span className="text-success fw-semibold">
              <Icon name="fa-check-circle" size="sm" className="me-1" />
              You're on the latest version
            </span>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={checkForUpdates}
              className="d-inline-flex align-items-center gap-1"
            >
              <Icon name="fa-sync" size="sm" />
              Check Again
            </Button>
          </>
        );

      case UpdateState.Available:
        return (
          <>
            <Badge bg="success">v{updateStatus.version} available</Badge>
            <Button
              variant="primary"
              size="sm"
              onClick={downloadUpdate}
              className="d-inline-flex align-items-center gap-1"
            >
              <Icon name="fa-download" size="sm" />
              Download Update
            </Button>
          </>
        );

      case UpdateState.Downloading:
        return (
          <>
            <Badge bg="info">Downloading v{updateStatus.version}...</Badge>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={cancelDownload}
              className="d-inline-flex align-items-center gap-1"
            >
              <Icon name="fa-times" size="sm" />
              Cancel
            </Button>
          </>
        );

      case UpdateState.Downloaded:
        return (
          <>
            <span className="text-success fw-semibold">Update ready to install!</span>
            <Button
              variant="warning"
              size="sm"
              onClick={restartAndInstall}
              className="d-inline-flex align-items-center gap-1"
            >
              <Icon name="fa-arrow-circle-up" size="sm" />
              Restart to Install v{updateStatus.version}
            </Button>
            {updateStatus.downloadedFilePath && (
              <TooltipTrigger tooltip="Open download folder in file explorer" placement="top">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={openDownloadFolder}
                  className="d-inline-flex align-items-center gap-1"
                >
                  <Icon name="fa-folder-open" size="sm" />
                </Button>
              </TooltipTrigger>
            )}
          </>
        );

      case UpdateState.Error:
        return (
          <Button
            variant="primary"
            size="sm"
            onClick={checkForUpdates}
            className="d-inline-flex align-items-center gap-1"
          >
            <Icon name="fa-sync" size="sm" />
            Check for Updates
          </Button>
        );

      default:
        return null;
    }
  };

  const progress = downloadProgress ?? updateStatus.downloadProgress;
  const showReleaseNotes =
    updateStatus.releaseNotes &&
    (updateStatus.state === UpdateState.Available ||
      updateStatus.state === UpdateState.Downloading ||
      updateStatus.state === UpdateState.Downloaded);

  return (
    <>
      <VersionBar>
        <span>Light Git</span>
        {version && <Badge bg="info">v{version}</Badge>}
        {renderUpdateUI()}
      </VersionBar>

      {updateStatus.state === UpdateState.Error && (
        <Alert
          variant="danger"
          dismissible
          onClose={() => setUpdateStatus({ state: UpdateState.Idle })}
          className="mt-2 mb-0 py-2 px-3"
        >
          <small>{updateStatus.error || 'An unknown error occurred while checking for updates.'}</small>
        </Alert>
      )}

      {updateStatus.state === UpdateState.Downloading && (
        <Card className="mt-2" body>
          <ProgressBar
            now={progress?.percent ?? 0}
            label={`${Math.round(progress?.percent ?? 0)}%`}
            animated
            striped
          />
          {progress && (
            <ProgressDetails>
              <span>
                {formatBytes(progress.transferred)} / {formatBytes(progress.total)}
              </span>
              <span>{formatBytes(progress.bytesPerSecond)}/s</span>
            </ProgressDetails>
          )}
        </Card>
      )}

      {showReleaseNotes && (
        <Accordion className="mt-2">
          <Accordion.Item eventKey="0">
            <Accordion.Header>
              <AccordionHeaderContent>
                <span className="flex-grow-1">
                  Release Notes{updateStatus.version ? ` - v${updateStatus.version}` : ''}
                </span>
                {updateStatus.releaseUrl && (
                  <TooltipTrigger tooltip="View on GitHub" placement="top">
                    <span
                      role="button"
                      tabIndex={0}
                      className="btn btn-outline-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        invokeSync(SYNC_CHANNELS.OpenUrl, { url: updateStatus.releaseUrl! });
                      }}
                    >
                      <Icon name="fab-github" size="sm" />
                    </span>
                  </TooltipTrigger>
                )}
              </AccordionHeaderContent>
            </Accordion.Header>
            <Accordion.Body className="p-0">
              <ReleaseNotesContent
                dangerouslySetInnerHTML={{ __html: updateStatus.releaseNotes! }}
              />
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      )}
    </>
  );
};

export default VersionAndUpdate;
