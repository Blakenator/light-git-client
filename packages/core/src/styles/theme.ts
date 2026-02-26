export const lightTheme = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    light: '#f8f9fa',
    dark: '#343a40',
    background: '#ffffff',
    text: '#212529',
    border: '#dee2e6',
    // Git status colors
    statusChanged: '#ffc107',
    statusMoved: '#17a2b8',
    statusRenamed: '#6f42c1',
    statusAdded: '#28a745',
    statusDeleted: '#dc3545',
    // Alert colors
    alertSuccessBg: '#d4edda',
    alertSuccessText: '#155724',
    alertWarningBg: '#fff3cd',
    alertWarningText: '#856404',
    alertDangerBg: '#f8d7da',
    alertDangerText: '#721c24',
    alertInfoBg: '#d1ecf1',
    alertInfoText: '#0c5460',
    alertDefaultBg: '#e2e3e5',
    alertDefaultText: '#383d41',
    // Diff colors
    diffAddBg: '#e6ffec',
    diffDeleteBg: '#ffebe9',
    diffHunkHeaderBg: '#e8f4fd',
    diffHunkHeaderText: '#0366d6',
    diffAddText: '#28a745',
    diffDeleteText: '#dc3545',
    // Form control colors
    formControlBg: '#ffffff',
    formControlBorder: '#dee2e6',
    formControlText: '#212529',
    formControlFocusBorder: '#007bff',
    // Age info colors
    ageRecent: '#28a745',
    ageRecentSecondary: '#17a2b8',
    ageOld: '#6c757d',
    // Utility colors
    white: '#ffffff',
    black: '#000000',
    // Card body
    cardBodyBg: '#f5f6f8',
    // Code output colors
    codeOutputBg: '#ffffff',
    codeOutputText: '#212529',
    codeOutputError: '#dc3545',
    codeOutputSuccess: '#28a745',
    codeOutputInfo: '#007bff',
  },
  shadows: {
    material: '0 2px 4px rgba(0, 0, 0, 0.1)',
    materialLight: '0 1px 2px rgba(0, 0, 0, 0.05)',
    materialInset: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
    materialDialog: '0 4px 16px rgba(0, 0, 0, 0.2)',
  },
  borderRadius: '0.4em',
  fonts: {
    primary: "'Roboto', sans-serif",
    monospace: "'Consolas', 'Monaco', monospace",
  },
};

export const darkTheme = {
  colors: {
    primary: '#0d6efd',
    secondary: '#6c757d',
    success: '#198754',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#0dcaf0',
    light: '#212529',
    dark: '#f8f9fa',
    background: '#1a1a1a',
    text: '#f8f9fa',
    border: '#495057',
    // Git status colors
    statusChanged: '#ffc107',
    statusMoved: '#0dcaf0',
    statusRenamed: '#6f42c1',
    statusAdded: '#198754',
    statusDeleted: '#dc3545',
    // Alert colors
    alertSuccessBg: '#155724',
    alertSuccessText: '#d4edda',
    alertWarningBg: '#856404',
    alertWarningText: '#fff3cd',
    alertDangerBg: '#721c24',
    alertDangerText: '#f8d7da',
    alertInfoBg: '#0c5460',
    alertInfoText: '#d1ecf1',
    alertDefaultBg: '#383d41',
    alertDefaultText: '#e2e3e5',
    // Diff colors
    diffAddBg: 'rgba(40, 167, 69, 0.3)',
    diffDeleteBg: 'rgba(220, 53, 69, 0.3)',
    diffHunkHeaderBg: 'rgba(56, 139, 253, 0.15)',
    diffHunkHeaderText: '#58a6ff',
    diffAddText: '#28a745',
    diffDeleteText: '#dc3545',
    // Form control colors
    formControlBg: '#2b2b2b',
    formControlBorder: '#495057',
    formControlText: '#f8f9fa',
    formControlFocusBorder: '#0d6efd',
    // Age info colors
    ageRecent: '#198754',
    ageRecentSecondary: '#0dcaf0',
    ageOld: '#6c757d',
    // Utility colors
    white: '#ffffff',
    black: '#000000',
    // Card body
    cardBodyBg: '#1f1f1f',
    // Code output colors
    codeOutputBg: '#1e1e1e',
    codeOutputText: '#cccccc',
    codeOutputError: '#f14c4c',
    codeOutputSuccess: '#89d185',
    codeOutputInfo: '#3794ff',
  },
  shadows: {
    material: '0 2px 4px rgba(0, 0, 0, 0.3)',
    materialLight: '0 1px 2px rgba(0, 0, 0, 0.2)',
    materialInset: 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
    materialDialog: '0 4px 16px rgba(0, 0, 0, 0.5)',
  },
  borderRadius: '0.4em',
  fonts: {
    primary: "'Roboto', sans-serif",
    monospace: "'Consolas', 'Monaco', monospace",
  },
};

export type Theme = typeof lightTheme;
