import { useSettingsStore } from '../stores/settingsStore';

/**
 * Check if a branch is push-locked by matching its tracking path
 * against the locked remote branches for the repo.
 */
export function isBranchPushLocked(repoPath: string, trackingPath?: string): boolean {
  if (!trackingPath) return false;
  const locked = useSettingsStore.getState().settings.pushLockBranches?.[repoPath];
  return !!locked && locked.includes(trackingPath);
}
