export const COLORS = {
  primary: '#E65100', // Express Orange
  primaryLight: '#FFE0B2',
  primaryDark: '#BF360C',
  accent: '#FF7043',
  background: '#F4F6F8', // Soft neutral gray for cards separation
  surface: '#FFFFFF',
  text: '#1E293B', // Slate 800 for sharp legibility
  textSecondary: '#64748B', // Slate 500
  textMuted: '#94A3B8', // Slate 400
  border: '#E2E8F0',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  overlay: 'rgba(15, 23, 42, 0.5)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: 26,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  h2: {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodyBold: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 15,
    fontWeight: '700' as const,
    lineHeight: 20,
  },
};

export const BORDER_RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  round: 9999,
};

export const SHADOWS = {
  light: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const THEME = {
  colors: COLORS,
  spacing: SPACING,
  typography: TYPOGRAPHY,
  borderRadius: BORDER_RADIUS,
  shadows: SHADOWS,
};

export default THEME;
