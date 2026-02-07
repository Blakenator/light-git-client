import 'styled-components';

interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  danger: string;
  warning: string;
  info: string;
  light: string;
  dark: string;
  background: string;
  text: string;
  border: string;
  statusChanged: string;
  statusMoved: string;
  statusRenamed: string;
  statusAdded: string;
  statusDeleted: string;
  // Alert colors
  alertSuccessBg: string;
  alertSuccessText: string;
  alertWarningBg: string;
  alertWarningText: string;
  alertDangerBg: string;
  alertDangerText: string;
  alertInfoBg: string;
  alertInfoText: string;
  alertDefaultBg: string;
  alertDefaultText: string;
  // Diff colors
  diffAddBg: string;
  diffDeleteBg: string;
  diffHunkHeaderBg: string;
  diffHunkHeaderText: string;
  diffAddText: string;
  diffDeleteText: string;
  // Form control colors
  formControlBg: string;
  formControlBorder: string;
  formControlText: string;
  formControlFocusBorder: string;
  // Age info colors
  ageRecent: string;
  ageRecentSecondary: string;
  ageOld: string;
  // Utility colors
  white: string;
  black: string;
  // Card body
  cardBodyBg: string;
  // Code output colors
  codeOutputBg: string;
  codeOutputText: string;
  codeOutputError: string;
  codeOutputSuccess: string;
  codeOutputInfo: string;
}

interface ThemeShadows {
  material: string;
  materialLight: string;
  materialInset: string;
  materialDialog: string;
}

interface ThemeFonts {
  primary: string;
  monospace: string;
}

declare module 'styled-components' {
  export interface DefaultTheme {
    colors: ThemeColors;
    shadows: ThemeShadows;
    borderRadius: string;
    fonts: ThemeFonts;
  }
}
