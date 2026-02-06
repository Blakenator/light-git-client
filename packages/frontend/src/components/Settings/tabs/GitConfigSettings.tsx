import React from 'react';
import { Form } from 'react-bootstrap';
import styled from 'styled-components';

const FormSection = styled.div`
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h6`
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 0.5rem;
`;

interface GitConfigSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

export const GitConfigSettings: React.FC<GitConfigSettingsProps> = ({
  settings,
  onChange,
}) => (
  <>
    <FormSection>
      <SectionTitle>Git Paths</SectionTitle>
      <Form.Group className="mb-3">
        <Form.Label>Git executable path</Form.Label>
        <Form.Control
          type="text"
          value={settings.gitPath || 'git'}
          onChange={(e) => onChange('gitPath', e.target.value)}
          placeholder="git"
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Bash executable path</Form.Label>
        <Form.Control
          type="text"
          value={settings.bashPath || 'bash'}
          onChange={(e) => onChange('bashPath', e.target.value)}
          placeholder="bash"
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Merge tool</Form.Label>
        <Form.Control
          type="text"
          value={settings.mergetool || ''}
          onChange={(e) => onChange('mergetool', e.target.value)}
          placeholder="sourcetree, vscode, etc."
        />
      </Form.Group>
    </FormSection>

    <FormSection>
      <SectionTitle>User Info</SectionTitle>
      <Form.Group className="mb-3">
        <Form.Label>Username</Form.Label>
        <Form.Control
          type="text"
          value={settings.username || ''}
          onChange={(e) => onChange('username', e.target.value)}
          placeholder="Your name"
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Email</Form.Label>
        <Form.Control
          type="email"
          value={settings.email || ''}
          onChange={(e) => onChange('email', e.target.value)}
          placeholder="your@email.com"
        />
      </Form.Group>
    </FormSection>

    <FormSection>
      <SectionTitle>Timeouts</SectionTitle>
      <Form.Group>
        <Form.Label>Command timeout (seconds)</Form.Label>
        <Form.Control
          type="number"
          value={settings.commandTimeoutSeconds || 10}
          onChange={(e) => onChange('commandTimeoutSeconds', parseInt(e.target.value))}
          min={1}
          max={300}
        />
      </Form.Group>
    </FormSection>
  </>
);

export default GitConfigSettings;
