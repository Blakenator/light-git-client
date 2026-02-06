import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    padding: 0;
    font-family: ${({ theme }) => theme.fonts.primary};
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    overflow: hidden;
    transition: background-color 0.2s, color 0.2s;
  }

  h1, h2, h3, h4, h5, h6 {
    margin: 0;
    font-weight: 500;
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.light};
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.secondary};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.dark};
  }

  /* Bootstrap card overrides */
  .card {
    box-shadow: ${({ theme }) => theme.shadows.material};
    border-radius: ${({ theme }) => theme.borderRadius};
    border: 1px solid ${({ theme }) => theme.colors.border};
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
  }

  .card-header {
    background-color: ${({ theme }) => theme.colors.light};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }

  .card-body {
    padding: 0.75rem;
  }

  /* Bootstrap form controls in dark mode */
  .dark-mode .form-control,
  .dark-mode .form-select {
    background-color: ${({ theme }) => theme.colors.formControlBg};
    border-color: ${({ theme }) => theme.colors.formControlBorder};
    color: ${({ theme }) => theme.colors.formControlText};
  }

  .dark-mode .form-control:focus,
  .dark-mode .form-select:focus {
    background-color: ${({ theme }) => theme.colors.formControlBg};
    border-color: ${({ theme }) => theme.colors.formControlFocusBorder};
    color: ${({ theme }) => theme.colors.formControlText};
  }

  /* Bootstrap input group text - use theme colors */
  .input-group-text {
    background-color: ${({ theme }) => theme.colors.light};
    border-color: ${({ theme }) => theme.colors.formControlBorder};
    color: ${({ theme }) => theme.colors.formControlText};
  }

  /* Bootstrap input group text in dark mode */
  .dark-mode .input-group-text {
    background-color: ${({ theme }) => theme.colors.formControlBg};
    border-color: ${({ theme }) => theme.colors.formControlBorder};
    color: ${({ theme }) => theme.colors.formControlText};
  }

  /* Bootstrap list groups in dark mode */
  .dark-mode .list-group-item {
    background-color: ${({ theme }) => theme.colors.background};
    border-color: ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.text};
  }

  /* Bootstrap modals in dark mode */
  .dark-mode .modal-content {
    background-color: ${({ theme }) => theme.colors.background};
    border-color: ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.text};
  }

  .dark-mode .modal-header {
    border-bottom-color: ${({ theme }) => theme.colors.border};
  }

  .dark-mode .modal-footer {
    border-top-color: ${({ theme }) => theme.colors.border};
  }

  /* Bootstrap tables in dark mode */
  .dark-mode .table {
    color: ${({ theme }) => theme.colors.text};
  }

  .dark-mode .table-hover tbody tr:hover {
    background-color: rgba(255, 255, 255, 0.075);
  }

  /* Bootstrap dropdowns in dark mode */
  .dark-mode .dropdown-menu {
    background-color: ${({ theme }) => theme.colors.formControlBg};
    border-color: ${({ theme }) => theme.colors.formControlBorder};
  }

  .dark-mode .dropdown-item {
    color: ${({ theme }) => theme.colors.formControlText};
  }

  .dark-mode .dropdown-item:hover,
  .dark-mode .dropdown-item:focus {
    background-color: ${({ theme }) => theme.colors.dark};
    color: ${({ theme }) => theme.colors.formControlText};
  }

  /* Custom gaps */
  .g-1 { gap: 0.25rem; }
  .g-2 { gap: 0.5rem; }
  .g-3 { gap: 1rem; }
  .g-4 { gap: 1.5rem; }
  .g-5 { gap: 3rem; }

  /* Utility classes */
  .cursor-pointer { cursor: pointer; }
  .full-width { width: 100%; }
  .bold { font-weight: bold; }

  /* Disable states */
  .disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  /* Font Awesome icon sizing */
  .fa, .fas, .far, .fab {
    font-size: 1em;
  }

  /* Material Icons sizing */
  .material-icons {
    font-size: 1.2em;
    vertical-align: middle;
  }

  /* Repo column layout */
  .repo-column {
    height: calc(100vh - 60px);
    overflow-y: auto;
    overflow-x: hidden;
  }

  /* Background mode */
  .bg-light-mode {
    background-color: ${({ theme }) => theme.colors.background};
  }

  /* React-toastify theme overrides for dark mode */
  .dark-mode .Toastify__toast-theme--colored.Toastify__toast--success {
    background-color: ${({ theme }) => theme.colors.success};
  }

  .dark-mode .Toastify__toast-theme--colored.Toastify__toast--error {
    background-color: ${({ theme }) => theme.colors.danger};
  }

  .dark-mode .Toastify__toast-theme--colored.Toastify__toast--warning {
    background-color: ${({ theme }) => theme.colors.warning};
  }

  .dark-mode .Toastify__toast-theme--colored.Toastify__toast--info {
    background-color: ${({ theme }) => theme.colors.info};
  }

  .dark-mode .Toastify__toast-theme--colored.Toastify__toast--default {
    background-color: ${({ theme }) => theme.colors.formControlBg};
  }

  /* Error toast copy button */
  .toast-error-content {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
  }

  .toast-error-message {
    flex: 1;
    word-break: break-word;
  }

  .toast-copy-btn {
    flex-shrink: 0;
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    color: inherit;
    cursor: pointer;
    padding: 2px 8px;
    font-size: 0.8em;
    line-height: 1.4;
    white-space: nowrap;
    transition: background 0.15s;

    &:hover {
      background: rgba(255, 255, 255, 0.35);
    }

    &:active {
      background: rgba(255, 255, 255, 0.5);
    }
  }

  /* Highlight.js theme switching for dark mode */
  /* Light mode: use github theme (default from import) */
  .light-mode .hljs {
    color: #24292e;
    background: #ffffff;
  }

  /* Dark mode: override with github-dark theme colors */
  .dark-mode .hljs {
    color: #c9d1d9;
    background: #0d1117;
  }

  .dark-mode .hljs-doctag,
  .dark-mode .hljs-keyword,
  .dark-mode .hljs-meta .hljs-keyword,
  .dark-mode .hljs-template-tag,
  .dark-mode .hljs-template-variable,
  .dark-mode .hljs-type,
  .dark-mode .hljs-variable.language_ {
    color: #ff7b72;
  }

  .dark-mode .hljs-title,
  .dark-mode .hljs-title.class_,
  .dark-mode .hljs-title.class_.inherited__,
  .dark-mode .hljs-title.function_ {
    color: #d2a8ff;
  }

  .dark-mode .hljs-attr,
  .dark-mode .hljs-attribute,
  .dark-mode .hljs-literal,
  .dark-mode .hljs-meta,
  .dark-mode .hljs-number,
  .dark-mode .hljs-operator,
  .dark-mode .hljs-selector-attr,
  .dark-mode .hljs-selector-class,
  .dark-mode .hljs-selector-id,
  .dark-mode .hljs-variable {
    color: #79c0ff;
  }

  .dark-mode .hljs-meta .hljs-string,
  .dark-mode .hljs-regexp,
  .dark-mode .hljs-string {
    color: #a5d6ff;
  }

  .dark-mode .hljs-built_in,
  .dark-mode .hljs-symbol {
    color: #ffa657;
  }

  .dark-mode .hljs-code,
  .dark-mode .hljs-comment,
  .dark-mode .hljs-formula {
    color: #8b949e;
  }

  .dark-mode .hljs-name,
  .dark-mode .hljs-quote,
  .dark-mode .hljs-selector-pseudo,
  .dark-mode .hljs-selector-tag {
    color: #7ee787;
  }

  .dark-mode .hljs-subst {
    color: #c9d1d9;
  }

  .dark-mode .hljs-section {
    color: #1f6feb;
    font-weight: bold;
  }

  .dark-mode .hljs-bullet {
    color: #f2cc60;
  }

  .dark-mode .hljs-emphasis {
    color: #c9d1d9;
    font-style: italic;
  }

  .dark-mode .hljs-strong {
    color: #c9d1d9;
    font-weight: bold;
  }

  .dark-mode .hljs-addition {
    color: #aff5b4;
    background-color: #033a16;
  }

  .dark-mode .hljs-deletion {
    color: #ffdcd7;
    background-color: #67060c;
  }
`;
