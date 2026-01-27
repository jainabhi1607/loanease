/**
 * Loanease Brand Colors
 * Matching the web app design system
 */
export const Colors = {
  // Primary colors
  primary: '#00D37F',
  primaryDark: '#00B86E',
  primaryLight: '#EDFFD7',

  // Dark teal (headers, text)
  teal: '#02383B',
  tealLight: '#1a3a3a',

  // Status colors
  success: '#00D169',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Border
  border: '#E7EBEF',

  // Background
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',

  // Outcome colors
  outcomeGreen: '#00D169',
  outcomeYellow: '#F59E0B',
  outcomeRed: '#EF4444',
} as const;

/**
 * Status badge colors
 */
export const StatusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#F3F4F6', text: '#6B7280' },
  opportunity: { bg: '#DBEAFE', text: '#1D4ED8' },
  application_created: { bg: '#FEF3C7', text: '#D97706' },
  application_submitted: { bg: '#FEF3C7', text: '#D97706' },
  conditionally_approved: { bg: '#D1FAE5', text: '#059669' },
  approved: { bg: '#D1FAE5', text: '#059669' },
  declined: { bg: '#FEE2E2', text: '#DC2626' },
  settled: { bg: '#00D169', text: '#FFFFFF' },
  withdrawn: { bg: '#F3F4F6', text: '#6B7280' },
};

export type ColorType = typeof Colors;
