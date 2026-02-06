import React, { useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { Button, ButtonGroup, Dropdown } from 'react-bootstrap';
import { Icon } from '@light-git/core';

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
  color: ${({ theme }) => theme.colors.secondary};
`;

const BranchName = styled.span<{ $current?: boolean; $muted?: boolean }>`
  flex: 1;
  font-weight: ${({ $current }) => ($current ? 'bold' : 'normal')};
  color: ${({ $muted, theme }) => ($muted ? theme.colors.secondary : 'inherit')};
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
}

interface BranchTreeItemProps {
  branches: BranchModel[];
  isLocal: boolean;
  filter?: string;
  showTrackingPath?: boolean;
  onCheckoutClicked: (info: { branch: string; andPull: boolean }) => void;
  onPushClicked?: (branch: BranchModel, force: boolean) => void;
  onPullClicked?: (branch: BranchModel, force: boolean) => void;
  onDeleteClicked: (branch: BranchModel) => void;
  onMergeClicked?: (branch: BranchModel) => void;
  onRebaseClicked?: (branch: BranchModel) => void;
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
  onCheckoutClicked,
  onPushClicked,
  onPullClicked,
  onDeleteClicked,
  onMergeClicked,
  onRebaseClicked,
  onFastForwardClicked,
  onBranchRename,
  onCopyBranchName,
  onViewChanges,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<{ [key: string]: boolean }>({});
  const [expandedActions, setExpandedActions] = useState<{ [key: string]: boolean }>({});

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

  const isFolderExpanded = useCallback((path: string) => {
    return expandedFolders[path] !== false; // Default expanded
  }, [expandedFolders]);

  const toggleActions = useCallback((branchName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedActions((prev) => ({ ...prev, [branchName]: !prev[branchName] }));
  }, []);

  const handleCopyBranchName = useCallback((branch: BranchModel, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(branch.name);
    onCopyBranchName?.(branch);
  }, [onCopyBranchName]);

  const renderBranchNode = (node: TreeNodeData): React.ReactNode => {
    if (!node.branch) return null;
    const branch = node.branch;
    const isActionsExpanded = expandedActions[branch.name] || false;

    return (
      <div key={node.fullPath}>
        <BranchRow $current={branch.isCurrentBranch}>
          <BranchIcon>
            {branch.isCurrentBranch ? (
              <Icon name="fa-shopping-cart" size="sm" />
            ) : (
              <Icon name="fa-code-branch" size="sm" />
            )}
          </BranchIcon>
          <BranchName $current={branch.isCurrentBranch} title={branch.name}>
            {node.name}
          </BranchName>
          <StatusIndicators>
            {branch.ahead !== undefined && branch.ahead > 0 && (
              <AheadBehindBadge
                $type="ahead"
                title={`${branch.ahead} commits ahead - click to push`}
                onClick={(e) => {
                  e.stopPropagation();
                  onPushClicked?.(branch, false);
                }}
              >
                ↑{branch.ahead}
              </AheadBehindBadge>
            )}
            {branch.behind !== undefined && branch.behind > 0 && (
              <AheadBehindBadge
                $type="behind"
                title={`${branch.behind} commits behind - click to pull`}
                onClick={(e) => {
                  e.stopPropagation();
                  onPullClicked?.(branch, false);
                }}
              >
                ↓{branch.behind}
              </AheadBehindBadge>
            )}
          </StatusIndicators>
          <ExpandButton
            $visible={isActionsExpanded}
            onClick={(e) => toggleActions(branch.name, e)}
            title={isActionsExpanded ? 'Hide actions' : 'Show actions'}
          >
            <Icon name={isActionsExpanded ? 'fa-times' : 'fa-ellipsis-h'} size="sm" />
          </ExpandButton>
        </BranchRow>
        <ActionBar $expanded={isActionsExpanded}>
          {/* Copy branch name */}
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={(e) => handleCopyBranchName(branch, e)}
            title="Copy branch name"
          >
            <Icon name="fa-copy" size="sm" />
          </Button>

          {/* Checkout (only for non-current branches) */}
          {!branch.isCurrentBranch && (
            <Dropdown as={ButtonGroup} size="sm">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onCheckoutClicked({ branch: branch.name, andPull: false });
                }}
                title="Checkout"
              >
                <Icon name="fa-sign-in-alt" size="sm" />
              </Button>
              {isLocal && (
                <>
                  <Dropdown.Toggle split variant="outline-primary" size="sm" onClick={(e) => e.stopPropagation()} />
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => onCheckoutClicked({ branch: branch.name, andPull: true })}>
                      Checkout and Pull
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </>
              )}
            </Dropdown>
          )}

          {/* View Changes */}
          {onViewChanges && (
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewChanges(branch);
              }}
              title="View changes in branch"
            >
              <Icon name="fa-eye" size="sm" />
            </Button>
          )}

          {/* Fast Forward (local, non-current only) */}
          {isLocal && !branch.isCurrentBranch && onFastForwardClicked && (
            <Button
              variant="outline-warning"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onFastForwardClicked(branch);
              }}
              title="Fast Forward"
            >
              <Icon name="fa-forward" size="sm" />
            </Button>
          )}

          {/* Pull (current branch only) */}
          {isLocal && branch.isCurrentBranch && onPullClicked && (
            <Dropdown as={ButtonGroup} size="sm">
              <Button
                variant="outline-info"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onPullClicked(branch, false);
                }}
                title="Pull"
              >
                <Icon name="fa-download" size="sm" />
              </Button>
              <Dropdown.Toggle split variant="outline-info" size="sm" onClick={(e) => e.stopPropagation()} />
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => onPullClicked(branch, true)}>
                  Force Pull
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          )}

          {/* Push (local only) */}
          {isLocal && onPushClicked && (
            <Dropdown as={ButtonGroup} size="sm">
              <Button
                variant="outline-info"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onPushClicked(branch, false);
                }}
                title="Push"
              >
                <Icon name="fa-upload" size="sm" />
              </Button>
              <Dropdown.Toggle split variant="outline-info" size="sm" onClick={(e) => e.stopPropagation()} />
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => onPushClicked(branch, true)}>
                  Force Push
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          )}

          {/* Merge */}
          {onMergeClicked && (
            <Dropdown as={ButtonGroup} size="sm">
              <Button
                variant="outline-success"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onMergeClicked(branch);
                }}
                title="Merge into current branch"
              >
                <Icon name="merge_type" size="sm" />
              </Button>
              {isLocal && onRebaseClicked && (
                <>
                  <Dropdown.Toggle split variant="outline-success" size="sm" onClick={(e) => e.stopPropagation()} />
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => onRebaseClicked(branch)}>
                      Rebase
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </>
              )}
            </Dropdown>
          )}

          {/* Rename (local only) */}
          {isLocal && onBranchRename && (
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onBranchRename(branch);
              }}
              title="Rename branch"
            >
              <Icon name="edit" size="sm" />
            </Button>
          )}

          {/* Delete */}
          <Button
            variant="outline-danger"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClicked(branch);
            }}
            title="Delete branch"
          >
            <Icon name="fa-trash" size="sm" />
          </Button>
        </ActionBar>
      </div>
    );
  };

  const renderNode = (node: TreeNodeData, level: number = 0): React.ReactNode => {
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
              <Icon name={isExpanded ? 'fa-caret-down' : 'fa-caret-right'} size="sm" />
            </CaretIcon>
            <BranchName>
              {node.name}
            </BranchName>
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
