import React from 'react';
import { Form, Row, Col } from 'react-bootstrap';
import styled from 'styled-components';
import { PrettyCheckbox } from '@light-git/core';

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
}) => (
  <>
    <FormSection>
      <SectionTitle>Appearance</SectionTitle>
      <PrettyCheckbox
        checked={settings.darkMode}
        onChange={(checked) => onThemeChange(checked)}
      >
        Dark Mode
      </PrettyCheckbox>
    </FormSection>

    <FormSection>
      <SectionTitle>Behavior</SectionTitle>
      <Row className="mb-2">
        <Col>
          <PrettyCheckbox
            checked={settings.commitAndPush}
            onChange={(checked) => onChange('commitAndPush', checked)}
          >
            Commit and Push by default
          </PrettyCheckbox>
        </Col>
      </Row>
      <Row className="mb-2">
        <Col>
          <PrettyCheckbox
            checked={settings.rebasePull}
            onChange={(checked) => onChange('rebasePull', checked)}
          >
            Rebase on Pull
          </PrettyCheckbox>
        </Col>
      </Row>
      <Row className="mb-2">
        <Col>
          <PrettyCheckbox
            checked={settings.commitMessageAutocomplete}
            onChange={(checked) => onChange('commitMessageAutocomplete', checked)}
          >
            Enable commit message autocomplete
          </PrettyCheckbox>
        </Col>
      </Row>
      <Row className="mb-2">
        <Col>
          <PrettyCheckbox
            checked={settings.airplaneMode}
            onChange={(checked) => onChange('airplaneMode', checked)}
          >
            Airplane Mode (disable network operations)
          </PrettyCheckbox>
        </Col>
      </Row>
    </FormSection>

    <FormSection>
      <SectionTitle>Display</SectionTitle>
      <Row className="mb-2">
        <Col>
          <PrettyCheckbox
            checked={settings.splitFilenameDisplay}
            onChange={(checked) => onChange('splitFilenameDisplay', checked)}
          >
            Split filename display (show directory separately)
          </PrettyCheckbox>
        </Col>
      </Row>
      <Row className="mb-2">
        <Col>
          <PrettyCheckbox
            checked={settings.showTrackingPath}
            onChange={(checked) => onChange('showTrackingPath', checked)}
          >
            Show tracking path in branch list
          </PrettyCheckbox>
        </Col>
      </Row>
      <Row className="mb-2">
        <Col>
          <PrettyCheckbox
            checked={settings.diffIgnoreWhitespace}
            onChange={(checked) => onChange('diffIgnoreWhitespace', checked)}
          >
            Ignore whitespace in diffs
          </PrettyCheckbox>
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

export default GeneralSettings;
