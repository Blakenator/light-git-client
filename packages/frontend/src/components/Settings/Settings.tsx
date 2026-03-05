import React, { useCallback, useState } from 'react';
import { Modal as BsModal, Button, Nav, Tab, Tabs } from 'react-bootstrap';
import styled from 'styled-components';
import { useSettingsStore, useUiStore } from '../../stores';
import { Icon } from '@light-git/core';
import { GeneralSettings } from './tabs/GeneralSettings';
import { CodeWatcherSettings } from './tabs/CodeWatcherSettings';
import { GitConfigSettings } from './tabs/GitConfigSettings';
import { ConfigShortcutsSettings } from './tabs/ConfigShortcutsSettings';
import { AutocompletePhrasesSettings } from './tabs/AutocompletePhrasesSettings';

const SettingsContainer = styled.div`
  min-height: 400px;
`;

const TopNav = styled(Nav)`
  margin-bottom: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 0.75rem;
`;

const TabContent = styled.div`
  padding: 1rem 0;
`;

type SettingsSection = 'global' | 'repo';

export const Settings: React.FC = () => {
  const isVisible = useUiStore((state) => state.modals['settings'] || false);
  const hideModal = useUiStore((state) => state.hideModal);
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const saveSettings = useSettingsStore((state) => state.saveSettings);
  const setTheme = useSettingsStore((state) => state.setTheme);

  const [activeSection, setActiveSection] = useState<SettingsSection>('global');

  const handleClose = useCallback(() => {
    saveSettings();
    hideModal('settings');
  }, [hideModal, saveSettings]);

  const handleSettingChange = useCallback(
    <K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
      updateSettings({ [key]: value });
    },
    [updateSettings]
  );

  return (
    <BsModal show={isVisible} onHide={handleClose} size="lg" centered scrollable>
      <BsModal.Header closeButton>
        <BsModal.Title>
          <Icon name="settings" className="me-2" />
          Settings
        </BsModal.Title>
      </BsModal.Header>
      <BsModal.Body>
        <SettingsContainer>
          <TopNav variant="pills" activeKey={activeSection} onSelect={(k) => setActiveSection(k as SettingsSection)}>
            <Nav.Item>
              <Nav.Link eventKey="global">Global Settings</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="repo">Repo Settings</Nav.Link>
            </Nav.Item>
          </TopNav>

          {activeSection === 'global' && (
            <Tabs defaultActiveKey="general" className="mb-3">
              <Tab eventKey="general" title="General">
                <TabContent>
                  <GeneralSettings
                    settings={settings}
                    onChange={handleSettingChange}
                    onThemeChange={setTheme}
                  />
                </TabContent>
              </Tab>
              <Tab eventKey="codeWatchers" title="Code Watchers">
                <TabContent>
                  <CodeWatcherSettings
                    settings={settings}
                    onChange={handleSettingChange}
                  />
                </TabContent>
              </Tab>
              <Tab eventKey="autocomplete" title="Autocomplete Phrases">
                <TabContent>
                  <AutocompletePhrasesSettings
                    settings={settings}
                    onChange={handleSettingChange}
                  />
                </TabContent>
              </Tab>
              <Tab eventKey="git" title="Git Config">
                <TabContent>
                  <GitConfigSettings
                    settings={settings}
                    onChange={handleSettingChange}
                  />
                </TabContent>
              </Tab>
            </Tabs>
          )}

          {activeSection === 'repo' && (
            <TabContent>
              <ConfigShortcutsSettings
                settings={settings}
                onChange={handleSettingChange}
              />
            </TabContent>
          )}
        </SettingsContainer>
      </BsModal.Body>
      <BsModal.Footer>
        <Button variant="primary" onClick={handleClose}>
          Save & Close
        </Button>
      </BsModal.Footer>
    </BsModal>
  );
};

export default Settings;
