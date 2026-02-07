import React, { useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { Button, ButtonGroup, Dropdown, Tooltip } from 'react-bootstrap';
import { Icon, TooltipTrigger } from '@light-git/core';

const TreeContainer = styled.div`
  padding-left: 0;
`;

const ChildrenContainer = styled.div<{ $level: number }>`
  margin-left: 0.5em;
  border-left: dashed 2px rgba(128, 128, 128, 0.3);
  padding-left: 0.5em;
`;

const BranchRow = styled.div<{ $current?: boolean }>`
  display: flex;
  align-items: center;
  padding: 0.2em 0.25em;
  border-radius: ${({ theme }) => theme.borderRadius};
  cursor: default;
  background-color: ${({ $current, theme }) =>
    $current ? `${theme.colors.primary}15` : 'transparent'};
  color: ${({ theme }) => theme.colors.text};
  transition: background-color 0.2s;

  &:hover {
    background-color: ${({ theme }) => theme.colors.light};
  }
`;

const FolderRow = styled.div`
  display: flex;
  align-items: center;
  padding: 0.2em 0.25em;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.borderRadius};
  color: ${({ theme }) => theme.colors.text};

  &:hover {
    background-color: rgba(128, 128, 128, 0.2);
  }
`;

const CaretIcon = styled.span<{ $expanded: boolean }>`
  width: 16px;
  display: inline-flex;
  justify-content: center;
  margin-right: 0.25em;
  color: ${({ theme }) => theme.colors.secondary};
`;

const BranchIcon = styled.span`
  width: 16px;
  display: inline-flex;
  justify-content: center;
  margin-right: 0.25em;
  color: ${({ theme }) => theme.colors.info};
`;

const BranchName = styled.span<{ $current?: boolean; $muted?: boolean }>`
  flex: 1;
  font-weight: ${({ $current }) => ($current ? 'bold' : 'normal')};
  color: ${({ $muted, theme }) =>
    $muted ? theme.colors.secondary : 'inherit'};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
`;

const StatusIndicators = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 0.5rem;
`;

const AheadBehindBadge = styled.span<{ $type: 'ahead' | 'behind' }>`
  font-size: 0.7rem;
  padding: 0.1rem 0.3rem;
  background-color: ${({ $type, theme }) =>
    $type === 'ahead' ? theme.colors.success : theme.colors.warning};
  color: ${({ theme }) => theme.colors.white};
  border-radius: 0.2rem;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
`;

const TrackingInfo = styled.span`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.secondary};
  margin-left: 0.25rem;
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
`;

const WorktreeIndicator = styled.span`
  color: ${({ theme }) => theme.colors.warning};
  margin-left: 0.25rem;
`;

const ExpandButton = styled.button<{ $visible: boolean }>`
  background: none;
  border: none;
  padding: 0.2rem 0.4rem;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.secondary};
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity 0.2s;

  ${BranchRow}:hover & {
    opacity: 1;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const ActionBar = styled.div<{ $expanded: boolean }>`
  max-height: ${({ $expanded }) => ($expanded ? '4em' : '0')};
  overflow: hidden;
  transition: max-height 0.2s ease-in-out;
  padding-left: 1.5em;
  display: flex;
  justify-content: flex-end;
  gap: 0.25rem;
  flex-wrap: wrap;
  padding-top: ${({ $expanded }) => ($expanded ? '0.25em' : '0')};
  padding-bottom: ${({ $expanded }) => ($expanded ? '0.25em' : '0')};
`;

export interface BranchModel {
  name: string;
  isCurrentBranch?: boolean;
  isRemote?: boolean;
  trackingPath?: string;
  ahead?: number;
  behind?: number;
  hash?: string;
}

interface WorktreeModel {
  path: string;
  branch?: string;
  isBare?: boolean;
}

interface BranchTreeItemProps {
  branches: BranchModel[];
  isLocal: boolean;
  filter?: string;
  showTrackingPath?: boolean;
  worktrees?: WorktreeModel[];
  localBranches?: BranchModel[];
  onCheckoutClicked: (info: { branch: string; andPull: boolean }) => void;
  onPushClicked?: (branch: BranchModel, force: boolean) => void;
  onPullClicked?: (branch: BranchModel, force: boolean) => void;
  onDeleteClicked: (branch: BranchModel) => void;
  onMergeClicked?: (branch: BranchModel) => void;
  onRebaseClicked?: (branch: BranchModel) => void;
  onInteractiveRebaseClicked?: (branch: BranchModel) => void;
  onFastForwardClicked?: (branch: BranchModel) => void;
  onBranchRename?: (branch: BranchModel) => void;
  onCopyBranchName?: (branch: BranchModel) => void;
  onViewChanges?: (branch: BranchModel) => void;
}

interface TreeNodeData {
  name: string;
  fullPath: string;
  branch?: BranchModel;
  children: { [key: string]: TreeNodeData };
}

export const BranchTreeItem: React.FC<BranchTreeItemProps> = ({
  branches,
  isLocal,
  filter = '',
  showTrackingPath = false,
  worktrees = [],
  localBranches = [],
  onCheckoutClicked,
  onPushClicked,
  onPullClicked,
  onDeleteClicked,
  onMergeClicked,
  onRebaseClicked,
  onInteractiveRebaseClicked,
  onFastForwardClicked,
  onBranchRename,
  onCopyBranchName,
  onViewChanges,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<{
    [key: string]: boolean;
  }>({});
  const [expandedActions, setExpandedActions] = useState<{
    [key: string]: boolean;
  }>({});

  const filteredBranches = useMemo(() => {
    if (!filter) return branches;
    const lowerFilter = filter.toLowerCase();
    return branches.filter((b) => b.name.toLowerCase().includes(lowerFilter));
  }, [branches, filter]);

  // Build tree structure from flat branch list
  const tree = useMemo(() => {
    const root: TreeNodeData = { name: '', fullPath: '', children: {} };

    filteredBranches.forEach((branch) => {
      const parts = branch.name.split('/');
      let current = root;

      parts.forEach((part, index) => {
        const path = parts.slice(0, index + 1).join('/');
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            fullPath: path,
            children: {},
          };
        }
        if (index === parts.length - 1) {
          current.children[part].branch = branch;
        }
        current = current.children[part];
      });
    });

    return root;
  }, [filteredBranches]);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  }, []);

  const isFolderExpanded = useCallback(
    (path: string) => {
      return expandedFolders[path] !== false; // Default expanded
    },
    [expandedFolders],
  );

  const toggleActions = useCallback(
    (branchName: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setExpandedActions((prev) => ({
        ...prev,
        [branchName]: !prev[branchName],
      }));
    },
    [],
  );

  const handleCopyBranchName = useCallback(
    (branch: BranchModel, e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(branch.name);
      onCopyBranchName?.(branch);
    },
    [onCopyBranchName],
  );

  // Check if a branch is checked out in a worktree (not the main one)
  const isInWorktree = useCallback((branchName: string): boolean => {
    return worktrees.some(
      (wt) => wt.branch === branchName && !wt.isBare
    );
  }, [worktrees]);

  // For remote branches: check if the remote branch has a corresponding local branch
  const localBranchNameSet = useMemo(() => {
    return new Set(localBranches.map((b) => b.name));
  }, [localBranches]);

  const currentLocalBranch = useMemo(() => {
    return localBranches.find((b) => b.isCurrentBranch)?.name;
  }, [localBranches]);

  const renderBranchNode = (node: TreeNodeData): React.ReactNode => {
    if (!node.branch) return null;
    const branch = node.branch;
    const isActionsExpanded = expandedActions[branch.name] || false;
    const branchInWorktree = isLocal && !branch.isCurrentBranch && isInWorktree(branch.name);
    // For remote branches, check if already checked out locally
    const remoteBranchLocalName = !isLocal ? branch.name.replace(/^origin\//, '') : '';
    const isRemoteCheckedOutLocally = !isLocal && localBranchNameSet.has(remoteBranchLocalName);
    const isRemoteCurrentLocal = !isLocal && currentLocalBranch === remoteBranchLocalName;

    return (
      <div key={node.fullPath}>
        <BranchRow $current={isRemoteCurrentLocal}>
          {(isRemoteCurrentLocal || isRemoteCheckedOutLocally || branch.isCurrentBranch) && (
            <BranchIcon>
              <Icon name="fa-shopping-cart" size="sm" />
            </BranchIcon>
          )}
          <TooltipTrigger
            placement="top"
            tooltip={branch.name}
            tooltipId={`tooltip-branch-name-${branch.name}`}
          >
            <BranchName
              $current={branch.isCurrentBranch || isRemoteCurrentLocal}
              $muted={branchInWorktree}
            >
              {node.name}
            </BranchName>
          </TooltipTrigger>
          {/* Worktree indicator */}
          {branchInWorktree && (
            <TooltipTrigger
              placement="top"
              tooltip="Checked out in another worktree"
              tooltipId={`tooltip-worktree-${branch.name}`}
            >
              <WorktreeIndicator>
                <Icon name="fa-lock" size="sm" />
              </WorktreeIndicator>
            </TooltipTrigger>
          )}
          {/* Tracking path display */}
          {isLocal && showTrackingPath && branch.trackingPath && (
            <TooltipTrigger
              placement="top"
              tooltip={`Tracking: ${branch.trackingPath}`}
              tooltipId={`tooltip-tracking-${branch.name}`}
            >
              <TrackingInfo>
                <Icon name="fa-cloud" size="sm" />
              </TrackingInfo>
            </TooltipTrigger>
          )}
          {isLocal && showTrackingPath && !branch.trackingPath && !branch.isRemote && (
            <TooltipTrigger
              placement="top"
              tooltip="No remote tracking"
              tooltipId={`tooltip-no-tracking-${branch.name}`}
            >
              <TrackingInfo>
                <Icon name="fa-unlink" size="sm" />
              </TrackingInfo>
            </TooltipTrigger>
          )}
          <StatusIndicators>
            {branch.ahead !== undefined && branch.ahead > 0 && (
              <TooltipTrigger
                placement="top"
                tooltip={`${branch.ahead} commits ahead - click to push`}
                tooltipId={`tooltip-ahead-${branch.name}`}
              >
                <AheadBehindBadge
                  $type="ahead"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPushClicked?.(branch, false);
                  }}
                >
                  ↑{branch.ahead}
                </AheadBehindBadge>
              </TooltipTrigger>
            )}
            {branch.behind !== undefined && branch.behind > 0 && (
              <TooltipTrigger
                placement="top"
                tooltip={
                  branch.isCurrentBranch
                    ? `${branch.behind} commits behind - click to pull`
                    : `${branch.behind} commits behind - click to fast forward`
                }
                tooltipId={`tooltip-behind-${branch.name}`}
              >
                <AheadBehindBadge
                  $type="behind"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (branch.isCurrentBranch) {
                      onPullClicked?.(branch, false);
                    } else if (!branch.ahead && onFastForwardClicked) {
                      onFastForwardClicked(branch);
                    }
                  }}
                >
                  ↓{branch.behind}
                </AheadBehindBadge>
              </TooltipTrigger>
            )}
          </StatusIndicators>
          <TooltipTrigger
            placement="bottom"
            tooltip={isActionsExpanded ? 'Hide actions' : 'Show actions'}
            tooltipId={`tooltip-expand-${branch.name}`}
          >
            <ExpandButton
              $visible={isActionsExpanded}
              onClick={(e) => toggleActions(branch.name, e)}
            >
              <Icon
                name={isActionsExpanded ? 'fa-times' : 'fa-ellipsis-vertical'}
                size="sm"
              />
            </ExpandButton>
          </TooltipTrigger>
        </BranchRow>
        <ActionBar $expanded={isActionsExpanded}>
          {/* Copy branch name */}
          <TooltipTrigger
            placement="top"
            tooltip="Copy branch name"
            tooltipId={`tooltip-copy-${branch.name}`}
          >
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={(e) => handleCopyBranchName(branch, e)}
            >
              <Icon name="fa-copy" size="sm" />
            </Button>
          </TooltipTrigger>

          {/* Checkout (only for non-current branches, not in worktree) */}
          {!branch.isCurrentBranch && !branchInWorktree && (
            <Dropdown as={ButtonGroup} size="sm">
              <TooltipTrigger
                placement="top"
                tooltip="Checkout"
                tooltipId={`tooltip-checkout-${branch.name}`}
              >
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => onCheckoutClicked({ branch: branch.name, andPull: false })}
                >
                  <Icon name="fa-shopping-cart" size="sm" />
                </Button>
              </TooltipTrigger>
              {isLocal && (
                <>
                  <Dropdown.Toggle
                    split
                    variant="outline-primary"
                    size="sm"
                  />
                  <Dropdown.Menu popperConfig={{ strategy: 'fixed' }} renderOnMount>
                    <Dropdown.Item
                      onClick={() =>
                        onCheckoutClicked({
                          branch: branch.name,
                          andPull: true,
                        })
                      }
                    >
                      Checkout and Pull
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </>
              )}
            </Dropdown>
          )}

          {/* Worktree disabled checkout indicator */}
          {!branch.isCurrentBranch && branchInWorktree && (
            <TooltipTrigger
              placement="top"
              tooltip="Branch is checked out in another worktree"
              tooltipId={`tooltip-worktree-disabled-${branch.name}`}
            >
              <Button
                variant="outline-secondary"
                size="sm"
                disabled
              >
                <Icon name="fa-lock" size="sm" />
              </Button>
            </TooltipTrigger>
          )}

          {/* View Changes / Branch premerge */}
          {onViewChanges && !branch.isCurrentBranch && (
            <TooltipTrigger
              placement="top"
              tooltip="View changes since common ancestor"
              tooltipId={`tooltip-view-changes-${branch.name}`}
            >
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewChanges(branch);
                }}
              >
                <Icon name="fa-eye" size="sm" />
              </Button>
            </TooltipTrigger>
          )}

          {/* Fast Forward (local, non-current only) */}
          {isLocal && !branch.isCurrentBranch && onFastForwardClicked && (
            <TooltipTrigger
              placement="top"
              tooltip="Fast Forward"
              tooltipId={`tooltip-fast-forward-${branch.name}`}
            >
              <Button
                variant="outline-warning"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onFastForwardClicked(branch);
                }}
              >
                <Icon name="fa-forward" size="sm" />
              </Button>
            </TooltipTrigger>
          )}

          {/* Pull (current branch only, with trackingPath check) */}
          {isLocal && branch.isCurrentBranch && branch.trackingPath && onPullClicked && (
            <Dropdown as={ButtonGroup} size="sm">
              <TooltipTrigger
                placement="top"
                tooltip="Pull"
                tooltipId={`tooltip-pull-${branch.name}`}
              >
                <Button
                  variant="outline-info"
                  size="sm"
                  onClick={() => onPullClicked(branch, false)}
                >
                  <Icon name="fa-arrow-down" size="sm" />
                </Button>
              </TooltipTrigger>
              <Dropdown.Toggle
                split
                variant="outline-info"
                size="sm"
              />
              <Dropdown.Menu popperConfig={{ strategy: 'fixed' }} renderOnMount>
                <Dropdown.Item onClick={() => onPullClicked(branch, true)}>
                  <Icon name="fa-shield-alt" /> Force Pull
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          )}

          {/* Push (local only) */}
          {isLocal && onPushClicked && (
            <Dropdown as={ButtonGroup} size="sm">
              <TooltipTrigger
                placement="top"
                tooltip="Push"
                tooltipId={`tooltip-push-${branch.name}`}
              >
                <Button
                  variant="outline-info"
                  size="sm"
                  onClick={() => onPushClicked(branch, false)}
                >
                  <Icon name="fa-arrow-up" size="sm" />
                </Button>
              </TooltipTrigger>
              <Dropdown.Toggle
                split
                variant="outline-info"
                size="sm"
              />
              <Dropdown.Menu popperConfig={{ strategy: 'fixed' }} renderOnMount>
                <Dropdown.Item onClick={() => onPushClicked(branch, true)}>
                  <Icon name="fa-shield-alt" /> Force Push
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          )}

          {/* Merge / Rebase / Interactive Rebase */}
          {!branch.isCurrentBranch && onMergeClicked && (
            <Dropdown as={ButtonGroup} size="sm">
              <TooltipTrigger
                placement="top"
                tooltip="Merge into current branch"
                tooltipId={`tooltip-merge-${branch.name}`}
              >
                <Button
                  variant="outline-success"
                  size="sm"
                  onClick={() => onMergeClicked(branch)}
                >
                  <Icon name="merge_type" size="sm" />
                </Button>
              </TooltipTrigger>
              {isLocal && (onRebaseClicked || onInteractiveRebaseClicked) && (
                <>
                  <Dropdown.Toggle
                    split
                    variant="outline-success"
                    size="sm"
                  />
                  <Dropdown.Menu popperConfig={{ strategy: 'fixed' }} renderOnMount>
                    {onRebaseClicked && (
                      <Dropdown.Item onClick={() => onRebaseClicked(branch)}>
                        Rebase
                      </Dropdown.Item>
                    )}
                    {onInteractiveRebaseClicked && (
                      <Dropdown.Item onClick={() => onInteractiveRebaseClicked(branch)}>
                        Interactive Rebase
                      </Dropdown.Item>
                    )}
                  </Dropdown.Menu>
                </>
              )}
            </Dropdown>
          )}

          {/* Rename (local only, not current) */}
          {isLocal && onBranchRename && !branch.isCurrentBranch && (
            <TooltipTrigger
              placement="top"
              tooltip="Rename branch"
              tooltipId={`tooltip-rename-${branch.name}`}
            >
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onBranchRename(branch);
                }}
              >
                <Icon name="edit" size="sm" />
              </Button>
            </TooltipTrigger>
          )}

          {/* Delete (not for current branch) */}
          {!branch.isCurrentBranch && (
            <TooltipTrigger
              placement="top"
              tooltip="Delete branch"
              tooltipId={`tooltip-delete-${branch.name}`}
            >
              <Button
                variant="outline-danger"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteClicked(branch);
                }}
              >
                <Icon name="fa-trash" size="sm" />
              </Button>
            </TooltipTrigger>
          )}
        </ActionBar>
      </div>
    );
  };

  const renderNode = (
    node: TreeNodeData,
    level: number = 0,
  ): React.ReactNode => {
    const childKeys = Object.keys(node.children);
    const hasChildren = childKeys.length > 0;

    if (node.branch) {
      // Leaf node - actual branch
      return renderBranchNode(node);
    }

    // Folder node
    const isExpanded = isFolderExpanded(node.fullPath);

    return (
      <div key={node.fullPath || 'root'}>
        {node.fullPath && (
          <FolderRow onClick={() => toggleFolder(node.fullPath)}>
            <CaretIcon $expanded={isExpanded}>
              <Icon
                name={isExpanded ? 'fa-caret-down' : 'fa-caret-right'}
                size="sm"
              />
            </CaretIcon>
            <BranchName>{node.name}</BranchName>
          </FolderRow>
        )}
        {(isExpanded || !node.fullPath) && hasChildren && (
          <ChildrenContainer $level={node.fullPath ? 1 : 0}>
            {childKeys.map((key) => renderNode(node.children[key], level + 1))}
          </ChildrenContainer>
        )}
      </div>
    );
  };

  return <TreeContainer>{renderNode(tree)}</TreeContainer>;
};

export default BranchTreeItem;
