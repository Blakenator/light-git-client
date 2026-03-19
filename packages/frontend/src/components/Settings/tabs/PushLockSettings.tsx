import React, { useState, useMemo, useCallback } from 'react';
import { Form, ListGroup, Badge } from 'react-bootstrap';
import styled from 'styled-components';
import { Icon } from '@light-git/core';
import { useRepositoryStore, useSettingsStore } from '../../../stores';

const SectionTitle = styled.h6`
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 0.5rem;
`;

const BranchItem = styled(ListGroup.Item)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  user-select: none;

  &:hover {
    background-color: ${({ theme }) => theme.colors.light};
  }
`;

const BranchName = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TrackingInfo = styled.span`
  font-size: 0.8em;
  color: ${({ theme }) => theme.colors.secondary};
  opacity: 0.7;
`;

export const PushLockSettings: React.FC = () => {
  const activeTab = useRepositoryStore((state) => state.getActiveTab());
  const repoPath = activeTab?.path || '';
  const remoteBranches = useRepositoryStore(
    (state) => state.repoCache[repoPath]?.remoteBranches ?? [],
  );
  const localBranches = useRepositoryStore(
    (state) => state.repoCache[repoPath]?.localBranches ?? [],
  );
  const pushLockedBranches = useSettingsStore(
    (state) => state.settings.pushLockBranches?.[repoPath] ?? [],
  );
  const togglePushLockBranch = useSettingsStore((state) => state.togglePushLockBranch);
  const [filter, setFilter] = useState('');

  const trackingMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const b of localBranches) {
      if (b.trackingPath) {
        if (!map[b.trackingPath]) map[b.trackingPath] = [];
        map[b.trackingPath].push(b.name);
      }
    }
    return map;
  }, [localBranches]);

  const sortedBranches = useMemo(
    () => [...remoteBranches].sort((a, b) => a.name.localeCompare(b.name)),
    [remoteBranches],
  );

  const filteredBranches = useMemo(() => {
    if (!filter) return sortedBranches;
    const lower = filter.toLowerCase();
    return sortedBranches.filter((b) => b.name.toLowerCase().includes(lower));
  }, [sortedBranches, filter]);

  const handleToggle = useCallback(
    (remoteBranchName: string) => {
      if (repoPath) togglePushLockBranch(repoPath, remoteBranchName);
    },
    [repoPath, togglePushLockBranch],
  );

  if (!repoPath) {
    return (
      <p className="text-muted">No repository is currently open.</p>
    );
  }

  return (
    <div>
      <SectionTitle>
        <Icon name="fa-lock" className="me-2" />
        Push-Locked Branches
      </SectionTitle>
      <p className="text-muted mb-3">
        Select remote branches to prevent pushing to. Any local branch tracking a
        locked remote branch will have its pushes blocked (including force push and
        commit-and-push) with a warning toast.
      </p>
      {sortedBranches.length === 0 ? (
        <p className="text-muted">No remote branches found for this repository.</p>
      ) : (
        <>
        <Form.Control
          type="text"
          placeholder="Filter remote branches..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          size="sm"
          className="mb-2"
        />
        <ListGroup>
          {filteredBranches.map((branch) => {
            const isLocked = pushLockedBranches.includes(branch.name);
            const trackedBy = trackingMap[branch.name];
            return (
              <BranchItem
                key={branch.name}
                action
                onClick={() => handleToggle(branch.name)}
              >
                <Form.Check
                  type="checkbox"
                  checked={isLocked}
                  onChange={() => handleToggle(branch.name)}
                  onClick={(e) => e.stopPropagation()}
                  id={`push-lock-${branch.name}`}
                />
                <Icon name="fa-cloud" size="sm" />
                <BranchName>{branch.name}</BranchName>
                {trackedBy && trackedBy.length > 0 && (
                  <TrackingInfo>
                    ← {trackedBy.join(', ')}
                  </TrackingInfo>
                )}
                {isLocked && (
                  <Badge bg="warning" text="dark">
                    <Icon name="fa-lock" size="sm" /> locked
                  </Badge>
                )}
              </BranchItem>
            );
          })}
        </ListGroup>
        {filteredBranches.length === 0 && filter && (
          <p className="text-muted text-center mt-2">No branches matching "{filter}"</p>
        )}
        </>
      )}
    </div>
  );
};

export default PushLockSettings;
