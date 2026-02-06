import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Button, Form, Card, Badge } from 'react-bootstrap';
import { useIpc } from '../ipc/useIpc';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100vh;
  background-color: ${({ theme }) => theme.colors.light};
`;

const LoginCard = styled(Card)`
  width: 100%;
  max-width: 400px;
  box-shadow: ${({ theme }) => theme.shadows.materialDialog};
`;

const HostBadge = styled(Badge)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 1rem;
`;

const FormGroup = styled(Form.Group)`
  margin-bottom: 1rem;
`;

const getHostIcon = (url: string): string => {
  if (url === 'bitbucket.org') {
    return 'fab fa-bitbucket';
  } else if (url === 'github.com') {
    return 'fab fa-github';
  } else if (url === 'gitlab.com') {
    return 'fab fa-gitlab';
  } else {
    return 'fa fa-code-branch';
  }
};

const AskPassPage: React.FC = () => {
  const ipc = useIpc();
  const [host, setHost] = useState<string>('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const fetchHost = async () => {
      try {
        const hostData = await ipc.rpc<string>('getHost');
        setHost(hostData);
      } catch (error) {
        console.error('Failed to get host:', error);
      }
    };
    fetchHost();
  }, [ipc]);

  const needsUsername = useMemo(() => {
    return host && !host.includes('@');
  }, [host]);

  const hostUrl = useMemo(() => {
    if (!host) return '';
    if (needsUsername) {
      return host.replace(/https?:\/\//, '');
    } else {
      return host.split('@')[1] || '';
    }
  }, [host, needsUsername]);

  const existingUsername = useMemo(() => {
    if (needsUsername) return undefined;
    return host.split('@')[0]?.replace(/https?:\/\//, '') || '';
  }, [host, needsUsername]);

  const handleSubmit = useCallback(async () => {
    try {
      const finalUsername = needsUsername ? username : existingUsername;
      await ipc.rpc('CRED', finalUsername, password);
    } catch (error) {
      console.error('Failed to send credentials:', error);
    }
  }, [ipc, username, password, needsUsername, existingUsername]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <Container>
      <LoginCard>
        <Card.Body>
          {hostUrl && (
            <h3 className="text-center mb-4">
              <HostBadge bg="primary">
                <i className={getHostIcon(hostUrl)} />
                {hostUrl}
              </HostBadge>
            </h3>
          )}

          <FormGroup>
            <Form.Label>Username</Form.Label>
            {!needsUsername ? (
              <Form.Control disabled value={existingUsername} />
            ) : (
              <Form.Control
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
              />
            )}
          </FormGroup>

          <FormGroup>
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter password"
              autoFocus
            />
          </FormGroup>

          <Button variant="primary" onClick={handleSubmit} className="w-100">
            Login
          </Button>
        </Card.Body>
      </LoginCard>
    </Container>
  );
};

export default AskPassPage;
