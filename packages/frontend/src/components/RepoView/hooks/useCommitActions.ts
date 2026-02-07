import { useCallback, useRef } from 'react';
import { useRepositoryStore, useSettingsStore, useUiStore } from '../../../stores';
import { useRepoViewStore } from '../../../stores/repoViewStore';
import { useGitService } from '../../../ipc';
import {
  detectPreCommitStatus,
  detectRemoteMessage,
} from '../../../utils/warningDetectors';

/**
 * Hook providing commit operations: commit, amend, commit message management.
 */
export function useCommitActions(repoPath: string) {
  const gitService = useGitService(repoPath);
  const addAlert = useUiStore((state) => state.addAlert);
  const showModal = useUiStore((state) => state.showModal);
  const setPreCommitStatus = useUiStore((state) => state.setPreCommitStatus);
  const commitAndPush = useSettingsStore((state) => state.settings.commitAndPush);

  const repoCache = useRepositoryStore((state) => state.getCacheFor(repoPath));
  const repoCacheRef = useRef(repoCache);
  repoCacheRef.current = repoCache;

  // Commit message from repoViewStore
  const commitMessage = useRepoViewStore((state) => state.commitMessage[repoPath] || '');

  const handleCommit = useCallback(async (amend: boolean) => {
    const store = useRepoViewStore.getState();
    let message = store.getCommitMessage(repoPath);
    // When amending with no message, reuse the previous commit message
    if (amend && !message.trim()) {
      const lastCommit = repoCacheRef.current?.commitHistory?.[0];
      message = lastCommit?.message || '';
    }
    const currentBranch = commitAndPush
      ? repoCacheRef.current?.localBranches?.find((b: any) => b.isCurrentBranch)
      : undefined;

    let succeeded = false;
    try {
      await gitService.commit(message, amend, commitAndPush, currentBranch);
      succeeded = true;
    } catch (error: any) {
      const errorMsg = error.message || '';
      const preCommit = detectPreCommitStatus(errorMsg);
      if (preCommit) {
        setPreCommitStatus(preCommit);
        if (preCommit.isError()) {
          showModal('preCommit');
        } else {
          succeeded = true;
          // Pre-commit succeeded but the backend rejected due to stderr output,
          // so the push step in the backend was skipped. Push explicitly now.
          if (commitAndPush) {
            try {
              await gitService.push(currentBranch, false);
            } catch (pushError: any) {
              const remoteMsg = detectRemoteMessage(pushError.message || '');
              if (remoteMsg) {
                addAlert(remoteMsg.message, 'info', 0);
              } else {
                addAlert(`Push failed: ${pushError.message}`, 'error');
              }
            }
          }
        }
      } else {
        const remoteMsg = detectRemoteMessage(errorMsg);
        if (remoteMsg) {
          succeeded = true;
          addAlert(remoteMsg.message, 'info', 0);
        } else {
          addAlert(`Commit failed: ${errorMsg}`, 'error');
        }
      }
    }

    if (succeeded) {
      store.setCommitMessage(repoPath, '');
      store.resetDiffState(repoPath);
      addAlert(amend ? 'Commit amended' : 'Committed successfully', 'success');
    }
  }, [gitService, commitAndPush, addAlert, setPreCommitStatus, showModal, repoPath]);

  const handleCommitAndPushChange = useCallback((value: boolean) => {
    const { updateSettings, saveSettings } = useSettingsStore.getState();
    updateSettings({ commitAndPush: value });
    saveSettings();
  }, []);

  const setCommitMessage = useCallback((message: string) => {
    useRepoViewStore.getState().setCommitMessage(repoPath, message);
  }, [repoPath]);

  return {
    commitMessage,
    commitAndPush,
    handleCommit,
    handleCommitAndPushChange,
    setCommitMessage,
  };
}
