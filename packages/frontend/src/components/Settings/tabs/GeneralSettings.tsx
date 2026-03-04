import React from 'react';
import { Form, Row, Col } from 'react-bootstrap';
import styled from 'styled-components';
import { VersionAndUpdate } from './VersionAndUpdate';

const FormSection = styled.div`
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h6`
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 0.5rem;
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
  return (
    <>
      <FormSection>
        <VersionAndUpdate />
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
