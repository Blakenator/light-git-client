import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Button, Tooltip } from 'react-bootstrap';
import { TooltipTrigger } from '@light-git/core';
import { LayoutCard } from '../../LayoutCard/LayoutCard';
import { Icon } from '@light-git/core';
import { CardHeaderContent, CardFilterInput, CardHeaderButtons } from '../RepoView.styles';
import { BranchTreeItem } from '../../BranchTreeItem/BranchTreeItem';
import { useRepositoryStore } from '../../../stores';
import { useBranchActions } from '../hooks';
import { useGitService } from '../../../ipc';

const _EMPTY_ARR: any[] = [];

const REMOTE_BRANCHES_DEFAULT_LIMIT = 200;
const SEARCH_DEBOUNCE_MS = 300;

/** Extracts the remote name from a branch name like "origin/main" → "origin" */
function extractRemoteName(branchName: string): string {
  const slashIndex = branchName.indexOf('/');
  if (slashIndex === -1) return 'origin';
  return branchName.substring(0, slashIndex);
}

interface RemoteBranchesCardProps {
  repoPath: string;
}

export const RemoteBranchesCard: React.FC<RemoteBranchesCardProps> = React.memo(({
  repoPath,
}) => {
  const [filter, setFilter] = useState('');
  const [loadingAll, setLoadingAll] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storeBranches = useRepositoryStore((state) => state.repoCache[repoPath]?.remoteBranches) ?? _EMPTY_ARR;
  const localBranches = useRepositoryStore((state) => state.repoCache[repoPath]?.localBranches) ?? _EMPTY_ARR;
  const updateRepoCache = useRepositoryStore((state) => state.updateRepoCache);
  const gitService = useGitService(repoPath);

  const { handleRemoteCheckout, handleDeleteBranch } = useBranchActions(repoPath);

  // When filter changes, debounce a backend search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!filter) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimerRef.current = setTimeout(() => {
      gitService
        .getRemoteBranches(REMOTE_BRANCHES_DEFAULT_LIMIT, filter)
        .then((result: any) => {
          if (result !== undefined) setSearchResults(result);
        })
        .catch(() => {})
        .finally(() => setIsSearching(false));
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [filter, gitService]);

  // Use search results when filtering, otherwise the store's initial set
  const displayBranches = searchResults !== null ? searchResults : storeBranches;

  const handleCheckout = useCallback(
    (info: { branch: string; andPull: boolean }) => {
      const branch = displayBranches.find((b: any) => b.name === info.branch);
      if (branch) {
        handleRemoteCheckout(branch);
      }
    },
    [displayBranches, handleRemoteCheckout]
  );

  const handleCopyBranchName = useCallback((branch: any) => {}, []);

  const handleLoadAll = useCallback(async () => {
    setLoadingAll(true);
    try {
      const result = await gitService.getRemoteBranches();
      if (result !== undefined) {
        updateRepoCache(repoPath, { remoteBranches: result });
      }
    } catch {
      // Non-critical
    } finally {
      setLoadingAll(false);
    }
  }, [gitService, repoPath, updateRepoCache]);

  const isTruncated = !filter && storeBranches.length >= REMOTE_BRANCHES_DEFAULT_LIMIT;

  // Group branches by remote name for multi-remote support
  const branchesByRemote = useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const branch of displayBranches) {
      const remote = extractRemoteName(branch.name);
      if (!groups.has(remote)) {
        groups.set(remote, []);
      }
      groups.get(remote)!.push(branch);
    }
    return groups;
  }, [displayBranches]);

  const remoteNames = useMemo(() => Array.from(branchesByRemote.keys()).sort(), [branchesByRemote]);

  const headerContent = (
    <CardHeaderContent>
      <CardFilterInput
        placeholder="Filter..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <CardHeaderButtons />
    </CardHeaderContent>
  );

  return (
    <LayoutCard
      title="Remotes"
      iconClass="fa fa-cloud"
      expandKey="remotes"
      headerContent={headerContent}
    >
      <div className="px-2">
        {remoteNames.map((remoteName) => {
          const branches = branchesByRemote.get(remoteName) || [];
          return (
            <div key={remoteName}>
              {remoteNames.length > 1 && (
                <div
                  className="d-flex align-items-center gap-1 py-1"
                  style={{
                    fontWeight: 600,
                    fontSize: '0.85em',
                    color: 'var(--bs-secondary, #6c757d)',
                  }}
                >
                  <Icon name="fa-cloud" size="sm" />
                  <span>{remoteName}</span>
                  <span style={{ fontWeight: 400, fontSize: '0.8em' }}>
                    ({branches.length})
                  </span>
                </div>
              )}
              <BranchTreeItem
                branches={branches as any}
                isLocal={false}
                filter={remoteNames.length > 1 ? '' : filter}
                localBranches={localBranches as any}
                onCheckoutClicked={handleCheckout}
                onDeleteClicked={(branch) => handleDeleteBranch(branch as any)}
                onCopyBranchName={handleCopyBranchName}
              />
            </div>
          );
        })}
        {displayBranches.length === 0 && !isSearching && (
          <div className="text-muted text-center py-2">
            {filter ? 'No matching remote branches' : 'No remote branches found'}
          </div>
        )}
        {isSearching && displayBranches.length === 0 && (
          <div className="text-muted text-center py-2">Searching...</div>
        )}
        {isTruncated && (
          <div className="text-muted text-center py-2" style={{ fontSize: '0.85em' }}>
            Showing first {REMOTE_BRANCHES_DEFAULT_LIMIT} branches.{' '}
            <button
              onClick={handleLoadAll}
              disabled={loadingAll}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: 'var(--bs-link-color, #0d6efd)',
                textDecoration: 'underline',
                cursor: loadingAll ? 'wait' : 'pointer',
                fontSize: 'inherit',
              }}
            >
              {loadingAll ? 'Loading...' : 'Load all'}
            </button>
          </div>
        )}
      </div>
    </LayoutCard>
  );
});

RemoteBranchesCard.displayName = 'RemoteBranchesCard';

export default RemoteBranchesCard;
