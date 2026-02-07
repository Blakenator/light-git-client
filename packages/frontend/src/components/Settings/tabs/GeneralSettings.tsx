import React, { useState, useEffect, useCallback } from 'react';
import { Form, Row, Col, Badge, Button } from 'react-bootstrap';
import styled from 'styled-components';
import { SYNC_CHANNELS } from '@light-git/shared';
import { Icon } from '@light-git/core';
import { invokeSync } from '../../../ipc/invokeSync';

const FormSection = styled.div`
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h6`
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 0.5rem;
`;

const VersionBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

interface GeneralSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
  onThemeChange: (dark: boolean) => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  settings,
  onChange,
  onThemeChange,
}) => {
  const [version, setVersion] = useState('');
  const [isUpdateDownloaded, setIsUpdateDownloaded] = useState(false);
  const [downloadedUpdateVersion, setDownloadedUpdateVersion] = useState('');
  const [checkingForUpdates, setCheckingForUpdates] = useState(false);

  useEffect(() => {
    invokeSync(SYNC_CHANNELS.GetVersion)
      .then((v) => setVersion(v))
      .catch(() => {});

    invokeSync(SYNC_CHANNELS.IsUpdateDownloaded)
      .then((info) => {
        setIsUpdateDownloaded(info.downloaded);
        setDownloadedUpdateVersion(info.version);
      })
      .catch(() => {});
  }, []);

  const checkForUpdates = useCallback(() => {
    setCheckingForUpdates(true);
    invokeSync(SYNC_CHANNELS.CheckForUpdates)
      .then(() => {
        return invokeSync(SYNC_CHANNELS.IsUpdateDownloaded);
      })
      .then((info) => {
        setIsUpdateDownloaded(info.downloaded);
        setDownloadedUpdateVersion(info.version);
      })
      .catch(() => {})
      .finally(() => setCheckingForUpdates(false));
  }, []);

  const restartAndInstall = useCallback(() => {
    invokeSync(SYNC_CHANNELS.RestartAndInstallUpdate).catch(() => {});
  }, []);

  return (
    <>
      <FormSection>
        <VersionBar>
          <span>Light Git</span>
          {version && <Badge bg="info">v{version}</Badge>}
          {!isUpdateDownloaded ? (
            <Button
              variant="primary"
              size="sm"
              onClick={checkForUpdates}
              disabled={checkingForUpdates}
              className="d-inline-flex align-items-center gap-1"
            >
              <Icon name="fa-sync" size="sm" />
              {checkingForUpdates ? 'Checking...' : 'Check for Updates'}
            </Button>
          ) : (
            <>
              <span className="text-success fw-semibold">New update available!</span>
              <Button
                variant="warning"
                size="sm"
                onClick={restartAndInstall}
                className="d-inline-flex align-items-center gap-1"
              >
                <Icon name="fa-arrow-circle-up" size="sm" />
                Update to
                <Badge bg="info">v{downloadedUpdateVersion}</Badge>
              </Button>
            </>
          )}
        </VersionBar>
      </FormSection>

      <FormSection>
        <SectionTitle>Appearance</SectionTitle>
        <Form.Check
          type="switch"
          id="setting-darkMode"
          label="Dark Mode"
          checked={settings.darkMode}
          onChange={(e) => onThemeChange(e.target.checked)}
        />
      </FormSection>

      <FormSection>
        <SectionTitle>Behavior</SectionTitle>
        <Row className="mb-2">
          <Col>
            <Form.Check
              type="switch"
              id="setting-commitAndPush"
              label="Commit and Push by default"
              checked={settings.commitAndPush}
              onChange={(e) => onChange('commitAndPush', e.target.checked)}
            />
          </Col>
        </Row>
        <Row className="mb-2">
          <Col>
            <Form.Check
              type="switch"
              id="setting-rebasePull"
              label="Rebase on Pull"
              checked={settings.rebasePull}
              onChange={(e) => onChange('rebasePull', e.target.checked)}
            />
          </Col>
        </Row>
        <Row className="mb-2">
          <Col>
            <Form.Check
              type="switch"
              id="setting-commitMessageAutocomplete"
              label="Enable commit message autocomplete"
              checked={settings.commitMessageAutocomplete}
              onChange={(e) => onChange('commitMessageAutocomplete', e.target.checked)}
            />
          </Col>
        </Row>
        <Row className="mb-2">
          <Col>
            <Form.Check
              type="switch"
              id="setting-airplaneMode"
              label="Airplane Mode (disable network operations)"
              checked={settings.airplaneMode}
              onChange={(e) => onChange('airplaneMode', e.target.checked)}
            />
          </Col>
        </Row>
      </FormSection>

      <FormSection>
        <SectionTitle>Display</SectionTitle>
        <Row className="mb-2">
          <Col>
            <Form.Check
              type="switch"
              id="setting-splitFilenameDisplay"
              label="Split filename display (show directory separately)"
              checked={settings.splitFilenameDisplay}
              onChange={(e) => onChange('splitFilenameDisplay', e.target.checked)}
            />
          </Col>
        </Row>
        <Row className="mb-2">
          <Col>
            <Form.Check
              type="switch"
              id="setting-showTrackingPath"
              label="Show tracking path in branch list"
              checked={settings.showTrackingPath}
              onChange={(e) => onChange('showTrackingPath', e.target.checked)}
            />
          </Col>
        </Row>
        <Row className="mb-2">
          <Col>
            <Form.Check
              type="switch"
              id="setting-diffIgnoreWhitespace"
              label="Ignore whitespace in diffs"
              checked={settings.diffIgnoreWhitespace}
              onChange={(e) => onChange('diffIgnoreWhitespace', e.target.checked)}
            />
          </Col>
        </Row>
      </FormSection>

      <FormSection>
        <SectionTitle>Updates</SectionTitle>
        <Row className="mb-2">
          <Col>
            <Form.Check
              type="switch"
              id="setting-allowPrerelease"
              label="Bleeding Edge Builds"
              checked={settings.allowPrerelease}
              onChange={(e) => onChange('allowPrerelease', e.target.checked)}
            />
          </Col>
        </Row>
        <Row className="mb-2">
          <Col>
            <Form.Check
              type="switch"
              id="setting-allowStats"
              label="Send anonymized statistics to help improve Light-Git"
              checked={settings.allowStats}
              onChange={(e) => onChange('allowStats', e.target.checked)}
            />
          </Col>
        </Row>
      </FormSection>

      <FormSection>
        <SectionTitle>Branch Prefix</SectionTitle>
        <Form.Group>
          <Form.Label>Default branch name prefix</Form.Label>
          <Form.Control
            type="text"
            value={settings.branchNamePrefix || ''}
            onChange={(e) => onChange('branchNamePrefix', e.target.value)}
            placeholder="e.g., feature/, bugfix/"
          />
        </Form.Group>
      </FormSection>
    </>
  );
};

export default GeneralSettings;
