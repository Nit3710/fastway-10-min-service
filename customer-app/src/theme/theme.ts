export const COLORS = {
  // Brand Workshop Palette
  background: '#EDEBE6',      // warm concrete/paper gray
  surface: '#FFFFFF',
  surfaceRaised: '#F7F5F1',  // slightly warm off-white
  graphite: '#262421',       // primary text/ink
  graphiteMuted: '#6B6862',
  brass: '#A87D4A',          // primary brand accent (active states)
  brassDeep: '#8B6238',      // pressed/dark brand accent
  amber: '#E8A33D',          // CTA, Add to Cart, urgent accent
  success: '#4A7A5E',        // muted sage green
  error: '#B5493A',          // muted brick red
  border: '#DDD9D1',
  
  // Semantic Compatibility Maps
  primary: '#A87D4A',        // brass
  primaryDark: '#8B6238',    // brassDeep
  primaryLight: '#F7F5F1',   // surfaceRaised
  accent: '#E8A33D',         // amber
  accentDark: '#8B6238',
  accentLight: '#F7F5F1',
  text: '#262421',           // graphite
  textPrimary: '#262421',
  textSecondary: '#6B6862',  // graphiteMuted
  textMuted: '#6B6862',
  borderDark: '#DDD9D1',
  warning: '#E8A33D',        // amber
  info: '#A87D4A',
  overlay: 'rgba(38, 36, 33, 0.5)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
};

export const TYPOGRAPHY = {
  display: {
    fontSize: 32,
    fontWeight: '800' as const,
    lineHeight: 38,
  },
  h1: {
    fontSize: 24,
    fontWeight: '800' as const,
    lineHeight: 30,
  },
  h2: {
    fontSize: 18,
    fontWeight: '800' as const,
    lineHeight: 24,
  },
  h3: {
    fontSize: 15,
    fontWeight: '700' as const,
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 18,
  },
  body: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  bodyBold: {
    fontSize: 13,
    fontWeight: '700' as const,
    lineHeight: 18,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 14,
  },
  button: {
    fontSize: 14,
    fontWeight: '700' as const,
    lineHeight: 18,
  },
  // Mono-influenced price tag style
  price: {
    fontFamily: 'monospace',
    fontWeight: '700' as const,
  }
};

export const BORDER_RADIUS = {
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  round: 9999,
};

export const SHADOWS = {
  light: {
    shadowColor: '#262421',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#262421',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  heavy: {
    shadowColor: '#262421',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 5,
  },
};

export const ANIMATION = {
  duration: {
    fast: 120,
    normal: 200,
    slow: 300,
  },
  easing: {
    bounce: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

export const THEME = {
  colors: COLORS,
  spacing: SPACING,
  typography: TYPOGRAPHY,
  borderRadius: BORDER_RADIUS,
  shadows: SHADOWS,
  animation: ANIMATION,
};

export default THEME;
