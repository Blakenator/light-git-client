import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';

import App from './App';
import { lightTheme, darkTheme } from './styles/theme';
import { GlobalStyles } from './styles/GlobalStyles';
import { useSettingsStore } from './stores';

// Import Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';

// Import Material Icons
import 'material-icons/iconfont/material-icons.css';

// Import highlight.js themes for code syntax highlighting (both light and dark)
import 'highlight.js/styles/github.css';
import 'highlight.js/styles/github-dark.css';

// Import Font Awesome core
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
library.add(fas);
library.add(faGithub);

// Theme-aware wrapper component
const ThemedApp: React.FC = () => {
  const darkMode = useSettingsStore((state) => state.settings.darkMode);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const isLoaded = useSettingsStore((state) => state.isLoaded);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Apply Bootstrap dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-bs-theme', 'dark');
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    } else {
      document.documentElement.setAttribute('data-bs-theme', 'light');
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const theme = darkMode ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <HashRouter>
        <App />
      </HashRouter>
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemedApp />
  </React.StrictMode>,
);

// Hide loading screen once React is ready
const loadingScreen = document.getElementById('loadingScreen');
if (loadingScreen) {
  loadingScreen.classList.remove('visible');
}
