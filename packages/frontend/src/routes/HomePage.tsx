import React, { useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { Tooltip } from 'react-bootstrap';
import { TooltipTrigger } from '@light-git/core';
import { useRepositoryStore, useSettingsStore, useUiStore } from '../stores';
import { useIpc } from '../ipc/useIpc';
import { Channels } from '@light-git/shared';
import { TabBar } from '../components/TabBar/TabBar';
import { ActiveJobs } from '../components/ActiveJobs/ActiveJobs';
import { NewTabPage } from '../components/NewTabPage/NewTabPage';
import { RepoView } from '../components/RepoView';
import { Settings } from '../components/Settings/Settings';
import { AlertToasts } from '@/common/components/Alert/Alert';
import { ErrorMessages } from '@/common/components/ErrorMessage/ErrorMessage';

const MainPanel = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

const Navbar = styled.nav<{ airplaneMode?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background-color: ${({ airplaneMode, theme }) =>
    airplaneMode ? theme.colors.info : theme.colors.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const AirplaneModeIcon = styled.div`
  padding: 0.25rem 0.5rem;
`;

const MainBody = styled.div`
  flex-grow: 1;
  overflow: hidden;
`;

const SettingsButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background-color: ${({ theme }) => theme.colors.secondary};
  color: ${({ theme }) => theme.colors.white};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: 0.375rem 0.75rem;
  cursor: pointer;
  font-size: 1rem;

  &:hover {
    opacity: 0.9;
  }
`;

const HomePage: React.FC = () => {
  const ipc = useIpc();
  
  // Repository store
  const tabs = useRepositoryStore((state) => state.tabs);
  const activeTabIndex = useRepositoryStore((state) => state.activeTabIndex);
  const getActiveTab = useRepositoryStore((state) => state.getActiveTab);
  const setActiveTabIndex = useRepositoryStore((state) => state.setActiveTabIndex);
  const initializeCache = useRepositoryStore((state) => state.initializeCache);
  const setActiveTabData = useRepositoryStore((state) => state.setActiveTabData);
  const initializeCacheForPath = useRepositoryStore((state) => state.initializeCacheForPath);

  // Settings store
  const settings = useSettingsStore((state) => state.settings);
  const isSettingsLoaded = useSettingsStore((state) => state.isLoaded);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const saveSettings = useSettingsStore((state) => state.saveSettings);

  // UI store
  const showModal = useUiStore((state) => state.showModal);
  const addAlert = useUiStore((state) => state.addAlert);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      await loadSettings();
    };
    init();
  }, [loadSettings]);

  // Track if we've initialized from saved settings
  const initializedRef = useRef(false);

  // Load repo callback - initializes git client in backend
  // RepoView will fetch the actual data via its useEffect
  const loadRepo = useCallback(async (path: string) => {
    if (!path) return;

    try {
      // Initialize the git client on backend FIRST (validates it's a valid repo)
      // This must happen before setActiveTabData so the git client exists when RepoView mounts
      await ipc.rpc(Channels.LOADREPO, path);

      // Now update the UI state - RepoView will mount and can safely call git operations
      setActiveTabData(path);
      initializeCacheForPath(path);

      // Save to settings - use getState() to get fresh tabs after setActiveTabData
      const currentTabs = useRepositoryStore.getState().tabs;
      const currentActiveIndex = useRepositoryStore.getState().activeTabIndex;
      updateSettings({
        activeTab: currentActiveIndex,
        openRepos: currentTabs.map((t) => t.path),
        tabNames: currentTabs.map((t) => t.name),
      });
      saveSettings();
    } catch (error: any) {
      addAlert(`Failed to load repository: ${error.message}`, 'error');
    }
  }, [ipc, setActiveTabData, initializeCacheForPath, updateSettings, saveSettings, addAlert]);

  // Initialize cache and load active repo when settings are loaded
  useEffect(() => {
    // Wait for settings to actually load before initializing
    if (!isSettingsLoaded) return;
    if (initializedRef.current) return;
    
    // Check if we have any non-empty repo paths
    const hasValidRepos = settings.openRepos.some(path => path && path.trim().length > 0);
    const hasValidTabs = settings.tabNames.length > 0;
    
    if (hasValidTabs) {
      initializedRef.current = true;
      
      // Set active tab index from settings
      const activeIndex = Math.min(settings.activeTab ?? 0, settings.tabNames.length - 1);
      const safeActiveIndex = Math.max(0, activeIndex);
      
      // Initialize tabs with their paths from settings
      const tabsData = settings.tabNames.map((name, index) => ({
        name: name || 'New Tab',
        path: settings.openRepos[index] || '', // Include the path
      }));
      initializeCache(tabsData);
      setActiveTabIndex(safeActiveIndex);
      
      // Load the active repo from settings (only if path is non-empty)
      // loadRepo will call LOADREPO first to create git client
      if (hasValidRepos) {
        const activeRepoPath = settings.openRepos[safeActiveIndex];
        if (activeRepoPath && activeRepoPath.trim().length > 0) {
          loadRepo(activeRepoPath);
        }
      }
    }
  }, [isSettingsLoaded, settings.openRepos, settings.tabNames, settings.activeTab, initializeCache, setActiveTabIndex, loadRepo]);

  const handleSettingsClick = useCallback(() => {
    showModal('settings');
  }, [showModal]);

  const handleOpenRepoNewTab = useCallback((path: string) => {
    const { addTab } = useRepositoryStore.getState();
    addTab({ path, name: path.split('/').pop() || 'New Tab' });
  }, []);

  const handleLoadRepoFailed = useCallback((error: any) => {
    addAlert(`Failed to load repository: ${error.message || error}`, 'error');
  }, [addAlert]);

  const activeTab = getActiveTab();
  const hasRepoPath = activeTab?.path && activeTab.path.length > 0;

  return (
    <MainPanel>
      <Navbar airplaneMode={settings.airplaneMode}>
        {settings.airplaneMode && (
          <TooltipTrigger
            placement="bottom"
            overlay={<Tooltip id="tooltip-airplane-mode">Airplane Mode is Active</Tooltip>}
          >
            <AirplaneModeIcon>
              <i className="fa fa-plane" />
            </AirplaneModeIcon>
          </TooltipTrigger>
        )}
        <ActiveJobs />
        <TabBar onLoadRepo={loadRepo} />
        <TooltipTrigger
          placement="bottom"
          overlay={<Tooltip id="tooltip-app-settings">App Settings</Tooltip>}
        >
          <SettingsButton onClick={handleSettingsClick}>
            <i className="material-icons">settings</i>
            <span>Settings</span>
          </SettingsButton>
        </TooltipTrigger>
      </Navbar>
      <MainBody>
        {activeTabIndex >= 0 && (
          <>
            {!hasRepoPath && <NewTabPage onLoadRepo={loadRepo} />}
            {hasRepoPath && (
              <RepoView
                repoPath={activeTab.path}
                onOpenRepoNewTab={handleOpenRepoNewTab}
                onLoadRepoFailed={handleLoadRepoFailed}
              />
            )}
          </>
        )}
      </MainBody>
      <AlertToasts />
      <ErrorMessages />
      <Settings />
    </MainPanel>
  );
};

export default HomePage;
