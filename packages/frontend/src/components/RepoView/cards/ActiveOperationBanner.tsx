import React, { useCallback, useEffect, useMemo } from 'react';
import { Button, Tooltip } from 'react-bootstrap';
import { OperationBanner } from '../RepoView.styles';
import { Icon, TooltipTrigger } from '@light-git/core';
import { useRepositoryStore, useUiStore } from '../../../stores';
import { useRepoViewStore } from '../../../stores/repoViewStore';
import { useGitService } from '../../../ipc';
import { detectPreCommitStatus } from '../../../utils/warningDetectors';
import { ActiveOperation } from '@light-git/shared';

const operationConfig: Record<ActiveOperation, { name: string; icon: string; isFa: boolean; variant: 'warning' | 'info' | 'danger' }> = {
  [ActiveOperation.Merge]: {
    name: 'Merge',
    icon: 'merge_type',
    isFa: false,
    variant: 'warning',
  },
  [ActiveOperation.Rebase]: {
    name: 'Rebase',
    icon: 'fa-code-branch',
    isFa: true,
    variant: 'info',
  },
  [ActiveOperation.CherryPick]: {
    name: 'Cherry Pick',
    icon: 'fa-apple-alt',
    isFa: true,
    variant: 'info',
  },
  [ActiveOperation.Revert]: {
    name: 'Revert',
    icon: 'fa-undo',
    isFa: true,
    variant: 'danger',
  },
};

interface ActiveOperationBannerProps {
  repoPath: string;
}

export const ActiveOperationBanner: React.FC<ActiveOperationBannerProps> = React.memo(({
  repoPath,
}) => {
  const gitService = useGitService(repoPath);
  const addAlert = useUiStore((state) => state.addAlert);
  const showModal = useUiStore((state) => state.showModal);
  const setPreCommitStatus = useUiStore((state) => state.setPreCommitStatus);

  const repoCache = useRepositoryStore((state) => state.getCacheFor(repoPath));
  const activeOperation = useRepoViewStore((state) => state.activeOperation[repoPath] || null);

  // Detect active operation from changes data
  useEffect(() => {
    const activeOps = repoCache?.changes?.activeOperations;
    if (activeOps) {
      const [op] = Object.entries(activeOps).find(([, val]) => val) ?? [];
      useRepoViewStore.getState().setActiveOperation(repoPath, (op as ActiveOperation) ?? null);
    } else {
      useRepoViewStore.getState().setActiveOperation(repoPath, null);
    }
  }, [repoCache?.changes?.activeOperations, repoPath]);

  const handleAbort = useCallback(async () => {
    if (!activeOperation) return;
    try {
      await gitService.changeActiveOperation(activeOperation, true);
      useRepoViewStore.getState().setActiveOperation(repoPath, null);
      addAlert('Operation aborted', 'info');
    } catch (error: any) {
      addAlert(`Abort failed: ${error.message}`, 'error');
    }
  }, [gitService, addAlert, activeOperation, repoPath]);

  const handleContinue = useCallback(async () => {
    if (!activeOperation) return;
    let succeeded = false;
    try {
      await gitService.changeActiveOperation(activeOperation, false);
      succeeded = true;
    } catch (error: any) {
      const preCommit = detectPreCommitStatus(error.message || '');
      if (preCommit) {
        setPreCommitStatus(preCommit);
        if (preCommit.isError()) {
          showModal('preCommit');
        } else {
          succeeded = true;
        }
      } else {
        addAlert(`Continue failed: ${error.message}`, 'error');
      }
    }
    if (succeeded) {
      useRepoViewStore.getState().setActiveOperation(repoPath, null);
    }
  }, [gitService, addAlert, activeOperation, setPreCommitStatus, showModal, repoPath]);

  if (!activeOperation) return null;

  const config = operationConfig[activeOperation];

  return (
    <OperationBanner variant={config.variant}>
      <Icon name={config.icon} />
      <span>Active {config.name}</span>
      <span className="flex-grow-1" />
      <TooltipTrigger
        placement="top"
        overlay={<Tooltip id={`tooltip-abort-${config.name}`}>Abort the {config.name}</Tooltip>}
      >
        <Button
          variant="outline-light"
          size="sm"
          onClick={handleAbort}
        >
          <Icon name="fa-undo" />
        </Button>
      </TooltipTrigger>
      <TooltipTrigger
        placement="top"
        overlay={<Tooltip id={`tooltip-continue-${config.name}`}>Continue the {config.name}</Tooltip>}
      >
        <Button
          variant="outline-light"
          size="sm"
          onClick={handleContinue}
          className="ms-1"
        >
          <Icon name="fa-play" />
        </Button>
      </TooltipTrigger>
    </OperationBanner>
  );
});

ActiveOperationBanner.displayName = 'ActiveOperationBanner';

export default ActiveOperationBanner;
