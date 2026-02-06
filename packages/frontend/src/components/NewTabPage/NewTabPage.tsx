import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { Button } from 'react-bootstrap';
import { Icon } from '@light-git/core';
import { useIpc } from '../../ipc/useIpc';
import { useUiStore } from '../../stores';
import { Channels } from '@light-git/shared';
import { CloneDialog } from '../RepoView/dialogs/CloneDialog';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
  padding: 2rem;
`;

const Title = styled.h2`
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.text};
`;

const Subtitle = styled.p`
  margin-bottom: 2rem;
  color: ${({ theme }) => theme.colors.secondary};
  text-align: center;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const ActionButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
`;

interface NewTabPageProps {
  onLoadRepo: (path: string) => void;
}

export const NewTabPage: React.FC<NewTabPageProps> = ({ onLoadRepo }) => {
  const ipc = useIpc();
  const addAlert = useUiStore((state) => state.addAlert);
  const [showCloneDialog, setShowCloneDialog] = useState(false);

  const handleOpenFolder = useCallback(async () => {
    try {
      // Use OPENFILEDIALOG with openDirectory property to show folder picker
      const result = await ipc.rpc<string[] | undefined>(
        Channels.OPENFILEDIALOG,
        { properties: ['openDirectory'] }
      );
      if (result && result[0]) {
        onLoadRepo(result[0]);
      }
    } catch (error: any) {
      addAlert(`Failed to open folder: ${error.message}`, 'error');
    }
  }, [ipc, onLoadRepo, addAlert]);

  const handleClone = useCallback(() => {
    setShowCloneDialog(true);
  }, []);

  const handleCloneSuccess = useCallback((path: string) => {
    setShowCloneDialog(false);
    onLoadRepo(path);
  }, [onLoadRepo]);

  return (
    <>
      <Container>
        <Title>Welcome to Light Git</Title>
        <Subtitle>
          Open an existing repository or clone a new one to get started.
        </Subtitle>
        <ButtonGroup>
          <ActionButton variant="primary" onClick={handleOpenFolder}>
            <Icon name="fa-folder-open" />
            Open Repository
          </ActionButton>
          <ActionButton variant="success" onClick={handleClone}>
            <Icon name="fa-clone" />
            Clone Repository
          </ActionButton>
        </ButtonGroup>
      </Container>
      
      <CloneDialog
        show={showCloneDialog}
        onHide={() => setShowCloneDialog(false)}
        onSuccess={handleCloneSuccess}
      />
    </>
  );
};

export default NewTabPage;
