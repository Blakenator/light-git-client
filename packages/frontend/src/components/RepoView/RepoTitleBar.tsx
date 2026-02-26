import React, { useCallback } from 'react';
import { Button, ButtonGroup, Dropdown, Tooltip } from 'react-bootstrap';
import { Icon, TooltipTrigger } from '@light-git/core';
import { useRepositoryStore } from '../../stores';
import { ConfirmModal } from '../../common/components/ConfirmModal/ConfirmModal';
import { useRepoTitleActions } from './hooks';
import {
  RepoTitle,
  TitleButtonGroup,
  EllipsisDropdownWrapper,
} from './RepoView.styles';

interface RepoTitleBarProps {
  repoPath: string;
  refreshRepo: () => Promise<void>;
  isEditingSections: boolean;
  onToggleEditSections: () => void;
}

export const RepoTitleBar: React.FC<RepoTitleBarProps> = React.memo(({
  repoPath,
  refreshRepo,
  isEditingSections,
  onToggleEditSections,
}) => {
  const getActiveTab = useRepositoryStore((state) => state.getActiveTab);
  const activeTab = getActiveTab();

  const {
    handlePushCurrent,
    handlePullCurrent,
    handleForcePushCurrent,
    handleForcePullCurrent,
    handleFullRefresh,
    handleDiscardAll,
    handleHardReset,
    handleOpenTerminal,
    handleOpenFolder,
  } = useRepoTitleActions(repoPath, refreshRepo);

  const handleOpenFolderDefault = useCallback(() => handleOpenFolder(), [handleOpenFolder]);

  return (
    <>
      <RepoTitle>
        {activeTab?.name || 'Repository'}
        <TitleButtonGroup>
          <Dropdown as={ButtonGroup} size="sm">
            <TooltipTrigger
              placement="bottom"
              overlay={<Tooltip id="tooltip-pull-repo">Pull</Tooltip>}
            >
              <Button variant="info" onClick={handlePullCurrent}>
                <Icon name="fa-arrow-down" />
              </Button>
            </TooltipTrigger>
            <Dropdown.Toggle split variant="info" />
            <Dropdown.Menu popperConfig={{ strategy: 'fixed' }} renderOnMount>
              <Dropdown.Item onClick={handleForcePullCurrent}>
                <Icon name="fa-shield-alt" /> Force Pull
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          <Dropdown as={ButtonGroup} size="sm">
            <TooltipTrigger
              placement="bottom"
              overlay={<Tooltip id="tooltip-push-repo">Push</Tooltip>}
            >
              <Button variant="info" onClick={handlePushCurrent}>
                <Icon name="fa-arrow-up" />
              </Button>
            </TooltipTrigger>
            <Dropdown.Toggle split variant="info" />
            <Dropdown.Menu popperConfig={{ strategy: 'fixed' }} renderOnMount>
              <Dropdown.Item onClick={handleForcePushCurrent}>
                <Icon name="fa-shield-alt" /> Force Push
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          <TooltipTrigger
            placement="bottom"
            overlay={<Tooltip id="tooltip-refresh-all">Refresh All</Tooltip>}
          >
            <Button variant="primary" size="sm" onClick={handleFullRefresh}>
              <Icon name="fa-sync-alt" />
            </Button>
          </TooltipTrigger>
          <TooltipTrigger
            placement="bottom"
            overlay={<Tooltip id="tooltip-discard-all">Discard All Changes</Tooltip>}
          >
            <Button variant="warning" size="sm" onClick={handleDiscardAll}>
              <Icon name="fa-undo" />
            </Button>
          </TooltipTrigger>
        </TitleButtonGroup>
        <EllipsisDropdownWrapper>
          <Dropdown align="end">
            <Dropdown.Toggle variant="link" size="sm" id="repo-menu-dropdown">
              <Icon name="fa-ellipsis-vertical" />
            </Dropdown.Toggle>
            <Dropdown.Menu popperConfig={{ strategy: 'fixed' }} renderOnMount>
              <Dropdown.Item onClick={handleOpenTerminal}>
                <Icon name="fa-terminal" /> Open Terminal
              </Dropdown.Item>
              <Dropdown.Item onClick={handleOpenFolderDefault}>
                <Icon name="fa-folder-open" /> Open Folder
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item onClick={onToggleEditSections}>
                {isEditingSections ? 'Done Editing' : 'Edit Sections'}
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </EllipsisDropdownWrapper>
      </RepoTitle>

      {/* Discard all confirmation modal */}
      <ConfirmModal
        modalId="discardAllModal"
        title="Confirm Discard All"
        confirmText="Discard All"
        confirmVariant="danger"
        onConfirm={handleHardReset}
      >
        <p>Are you sure you want to discard <em>all changes</em>?</p>
        <p><strong>This cannot be undone</strong></p>
      </ConfirmModal>
    </>
  );
});

RepoTitleBar.displayName = 'RepoTitleBar';

export default RepoTitleBar;
