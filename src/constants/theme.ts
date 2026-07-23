/** Semantic colour tokens — prefer these over ad-hoc hex in screens. */
export const colors = {
  background: '#06060C',
  backgroundDeep: '#030308',
  surface: 'rgba(255, 255, 255, 0.07)',
  surfaceStrong: 'rgba(255, 255, 255, 0.11)',
  surfaceQuiet: 'rgba(255, 255, 255, 0.04)',
  glassBorder: 'rgba(255, 255, 255, 0.14)',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  primary: '#8B7CF6',
  primarySoft: '#A594F9',
  blue: '#6366F1',
  glow: 'rgba(139, 124, 246, 0.45)',
  blueGlow: 'rgba(99, 102, 241, 0.35)',
  safe: '#34D399',
  safeGlow: 'rgba(52, 211, 153, 0.2)',
  warning: '#FBBF24',
  text: '#FAFAFF',
  textSecondary: '#C8C8DC',
  textMuted: '#9494AC',
  chatUser: 'rgba(99, 102, 241, 0.28)',
  chatVoxa: 'rgba(255, 255, 255, 0.08)',
  tabBar: 'rgba(10, 10, 18, 0.98)',
  tabBarBorder: 'rgba(255, 255, 255, 0.08)',
  danger: '#F87171',
  overlay: 'rgba(3, 3, 8, 0.72)',
};

/** Spacing scale: 4 · 8 · 12 · 16 · 20 · 24 · 32 */
export const spacing = {
  xs: 4,
  sm: 8,
  md12: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  section: 24,
};

export const layout = {
  screenPadding: 20,
  cardGap: 12,
  tabBarHeight: 84,
  minTapTarget: 44,
  iconSm: 18,
  iconMd: 22,
  iconLg: 28,
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  full: 999,
};

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
};

export const motion = {
  fast: 160,
  normal: 240,
  slow: 360,
};

export const typography = {
  hero: { fontSize: 44, fontWeight: '300' as const, letterSpacing: 4, lineHeight: 52 },
  title: { fontSize: 26, fontWeight: '600' as const, letterSpacing: -0.4, lineHeight: 32 },
  subtitle: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.2, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },
  label: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    lineHeight: 14,
  },
};

export const surfaces = {
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
  },
  cardQuiet: {
    backgroundColor: colors.surfaceQuiet,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
};
