/**
 * PlayMechi Design Tokens
 * Central source of truth for colors, spacing, typography, and other design values
 */

export const colors = {
  // Background
  background: {
    primary: '#07111F',
    secondary: '#0E1A2D',
    tertiary: '#111D31',
  },

  // Surface
  surface: {
    base: '#0E1A2D',
    elevated: '#111D31',
    overlay: 'rgba(7, 17, 31, 0.8)',
  },

  // Border
  border: {
    default: '#22334D',
    light: '#2A3F5F',
    dark: '#1A2847',
  },

  // Text
  text: {
    primary: '#FFFFFF',
    secondary: '#B0B8C8',
    muted: '#7A8299',
    inverse: '#07111F',
  },

  // Primary Accent (Teal/Cyan)
  primary: {
    default: '#00D4C4',
    hover: '#00C4B4',
    active: '#00B4A4',
    light: 'rgba(0, 212, 196, 0.1)',
    lighter: 'rgba(0, 212, 196, 0.05)',
  },

  // Danger Accent (Coral/Red)
  danger: {
    default: '#FF6B6B',
    hover: '#FF5555',
    active: '#FF4545',
    light: 'rgba(255, 107, 107, 0.1)',
    lighter: 'rgba(255, 107, 107, 0.05)',
  },

  // Status Colors
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },

  // Semantic Status
  semantic: {
    confirmed: '#10B981',
    pending: '#F59E0B',
    disputed: '#EF4444',
    neutral: '#6B7280',
    active: '#00D4C4',
    inactive: '#4B5563',
  },

  // Plan Colors
  plan: {
    free: '#6B7280',
    pro: '#00D4C4',
    elite: '#A855F7',
  },

  // Rank Colors
  rank: {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
    diamond: '#B9F2FF',
    legend: '#FF6B6B',
  },
};

export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
};

export const radius = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
};

export const typography = {
  fontFamily: {
    display: '"Montserrat", "Segoe UI Semibold", sans-serif',
    body: '"Open Sans", "Segoe UI", sans-serif',
    mono: '"Fira Code", "Courier New", monospace',
  },

  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
    '5xl': '48px',
  },

  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },

  letterSpacing: {
    tight: '-0.02em',
    normal: '0em',
    wide: '0.02em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  backdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
};

export const transitions = {
  fast: '150ms ease-in-out',
  base: '200ms ease-in-out',
  slow: '300ms ease-in-out',
};

/**
 * Component-specific tokens
 */

export const button = {
  padding: {
    sm: `${spacing[2]} ${spacing[3]}`,
    md: `${spacing[2]} ${spacing[4]}`,
    lg: `${spacing[3]} ${spacing[6]}`,
  },
  fontSize: {
    sm: typography.fontSize.sm,
    md: typography.fontSize.base,
    lg: typography.fontSize.lg,
  },
  radius: radius.md,
  fontWeight: typography.fontWeight.semibold,
};

export const card = {
  padding: spacing[4],
  radius: radius.lg,
  shadow: shadows.md,
  border: `1px solid ${colors.border.default}`,
};

export const input = {
  padding: spacing[3],
  radius: radius.md,
  fontSize: typography.fontSize.base,
  border: `1px solid ${colors.border.default}`,
  focusBorder: `2px solid ${colors.primary.default}`,
};

export const badge = {
  padding: `${spacing[1]} ${spacing[2]}`,
  radius: radius.full,
  fontSize: typography.fontSize.xs,
  fontWeight: typography.fontWeight.semibold,
};

export const table = {
  headerPadding: spacing[3],
  cellPadding: spacing[3],
  headerBg: colors.surface.elevated,
  headerText: colors.text.secondary,
  borderColor: colors.border.default,
  hoverBg: colors.surface.elevated,
};
