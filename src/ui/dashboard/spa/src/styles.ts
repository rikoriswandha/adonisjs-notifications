export interface ThemeColors {
  bg: string
  surface: string
  surface2: string
  surface3: string
  text: string
  muted: string
  border: string
  accent: string
  success: string
  danger: string
  warning: string
  info: string
}

const palette = {
  sand: {
    50: '#fbf9f5',
    100: '#f5f0e8',
    200: '#e8e0d3',
    300: '#d6cbb8',
    400: '#b8a896',
    500: '#9a8b75',
    600: '#7d7060',
    700: '#5e5448',
    800: '#3f3830',
    900: '#211e19',
    950: '#0f0d0b',
  },
  dust: '#a8a29e',
  status: {
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  },
}

export function getThemeColors(dark: boolean): ThemeColors {
  const s = palette.sand
  if (dark) {
    return {
      bg: s[950],
      surface: s[900],
      surface2: s[800],
      surface3: s[700],
      text: s[100],
      muted: s[400],
      border: s[700],
      accent: s[300],
      ...palette.status,
    }
  }
  return {
    bg: s[50],
    surface: '#ffffff',
    surface2: s[100],
    surface3: s[200],
    text: s[900],
    muted: s[600],
    border: s[200],
    accent: s[700],
    ...palette.status,
  }
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

export const radius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
}

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
}
