export interface ThemeColors {
  bg: string
  surface: string
  surface2: string
  surface3: string
  text: string
  muted: string
  border: string
  borderSubtle: string
  accent: string
  accentContrast: string
  accentBg: string
  success: string
  successBg: string
  danger: string
  dangerBg: string
  warning: string
  warningBg: string
  info: string
  infoBg: string
}

interface RawTheme {
  bg: string
  surface: string
  surface2: string
  surface3: string
  text: string
  muted: string
  border: string
  borderSubtle: string
  accent: string
  accentContrast: string
  success: string
  danger: string
  warning: string
  info: string
}

const light: RawTheme = {
  bg: 'oklch(98.2% 0.004 80)',
  surface: 'oklch(100% 0.002 80)',
  surface2: 'oklch(96.5% 0.006 80)',
  surface3: 'oklch(92.5% 0.008 80)',
  text: 'oklch(24% 0.012 80)',
  muted: 'oklch(52% 0.01 80)',
  accent: 'oklch(55% 0.13 55)',
  accentContrast: 'oklch(22% 0.02 55)',
  success: 'oklch(60% 0.14 145)',
  danger: 'oklch(52% 0.18 25)',
  warning: 'oklch(70% 0.13 85)',
  info: 'oklch(60% 0.12 250)',
}

const dark: RawTheme = {
  bg: 'oklch(17% 0.01 80)',
  surface: 'oklch(23% 0.012 80)',
  surface2: 'oklch(28% 0.014 80)',
  surface3: 'oklch(34% 0.016 80)',
  text: 'oklch(93% 0.01 80)',
  muted: 'oklch(66% 0.012 80)',
  border: 'oklch(38% 0.014 80)',
  borderSubtle: 'oklch(32% 0.012 80)',
  accent: 'oklch(65% 0.14 60)',
  accentContrast: 'oklch(22% 0.02 55)',
  success: 'oklch(65% 0.13 145)',
  danger: 'oklch(60% 0.16 30)',
  warning: 'oklch(72% 0.12 85)',
  info: 'oklch(65% 0.11 250)',
}

function mix(color: string, alpha: number): string {
  return `color-mix(in oklch, ${color} ${alpha * 100}%, transparent)`
}

function wrap(theme: RawTheme): ThemeColors {
  return {
    ...theme,
    accentBg: mix(theme.accent, 0.1),
    successBg: mix(theme.success, 0.1),
    dangerBg: mix(theme.danger, 0.1),
    warningBg: mix(theme.warning, 0.1),
    infoBg: mix(theme.info, 0.1),
  }
}

export function getThemeColors(darkMode: boolean): ThemeColors {
  return wrap(darkMode ? dark : light)
}

export function themeVariables(darkMode: boolean): Record<string, string> {
  const t = getThemeColors(darkMode)
  return {
    '--color-bg': t.bg,
    '--color-surface': t.surface,
    '--color-surface-2': t.surface2,
    '--color-surface-3': t.surface3,
    '--color-text': t.text,
    '--color-muted': t.muted,
    '--color-border': t.border,
    '--color-border-subtle': t.borderSubtle,
    '--color-accent': t.accent,
    '--color-accent-contrast': t.accentContrast,
    '--color-accent-bg': t.accentBg,
    '--color-success': t.success,
    '--color-success-bg': t.successBg,
    '--color-danger': t.danger,
    '--color-danger-bg': t.dangerBg,
    '--color-warning': t.warning,
    '--color-warning-bg': t.warningBg,
    '--color-info': t.info,
    '--color-info-bg': t.infoBg,
  }
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

export const radius = {
  sm: '6px',
  md: '10px',
  lg: '14px',
}

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '48px',
}

export const typography = {
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  size: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
  },
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
  },
  lineHeight: {
    body: 1.5,
    heading: 1.25,
  },
}

export const motion = {
  easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
  duration: {
    fast: '150ms',
    base: '200ms',
    slow: '250ms',
  },
}

export const shadow = {
  topBar: '0 1px 0 oklch(0% 0 0 / 0.04), 0 2px 6px oklch(0% 0 0 / 0.03)',
  topBarDark: '0 1px 0 oklch(100% 0 0 / 0.06), 0 2px 6px oklch(0% 0 0 / 0.12)',
}
