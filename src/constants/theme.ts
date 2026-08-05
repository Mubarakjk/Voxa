/** Semantic colour tokens — calm ink + teal brand (distinct from generic purple AI apps). */
export const colors = {
  /** Deep Ink — primary canvas */
  background: '#0B0F14',
  /** Midnight — deeper wells / evening */
  backgroundDeep: '#070A0E',
  surface: 'rgba(255, 255, 255, 0.06)',
  surfaceStrong: 'rgba(255, 255, 255, 0.10)',
  surfaceQuiet: 'rgba(255, 255, 255, 0.035)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  borderSubtle: 'rgba(255, 255, 255, 0.07)',
  /** Sea Glass Teal — brand accent */
  primary: '#2DD4BF',
  primarySoft: '#5EEAD4',
  /** Soft sky (secondary accent) */
  blue: '#38BDF8',
  glow: 'rgba(45, 212, 191, 0.28)',
  blueGlow: 'rgba(56, 189, 248, 0.22)',
  /** Success Emerald */
  safe: '#34D399',
  safeGlow: 'rgba(52, 211, 153, 0.18)',
  /** Warm Gold — warning / achievement */
  warning: '#FBBF24',
  /** Soft White */
  text: '#F4F7FA',
  textSecondary: '#B8C0CC',
  /** Muted Slate */
  textMuted: '#7A8494',
  chatUser: 'rgba(45, 212, 191, 0.18)',
  chatVoxa: 'rgba(255, 255, 255, 0.07)',
  tabBar: 'rgba(11, 15, 20, 0.96)',
  tabBarBorder: 'rgba(255, 255, 255, 0.07)',
  danger: '#F87171',
  overlay: 'rgba(7, 10, 14, 0.72)',
  /** Soft folder / accent chips */
  accentWarm: '#F0ABFC',
  accentSky: '#7DD3FC',
  accentGold: '#FCD34D',
  /** Aurora Purple — companion / memory accents */
  aurora: '#A78BFA',
  auroraGlow: 'rgba(167, 139, 250, 0.22)',
};

/** Named brand aliases for Signature Experience copy & docs. */
export const brandPalette = {
  deepInk: colors.background,
  midnight: colors.backgroundDeep,
  seaGlass: colors.primary,
  auroraPurple: colors.aurora,
  softWhite: colors.text,
  mutedSlate: colors.textMuted,
  successEmerald: colors.safe,
  warmGold: colors.warning,
} as const;

/** Semantic roles — use these instead of one-off hex values. */
export const semantic = {
  positive: colors.safe,
  warning: colors.warning,
  reflection: colors.blue,
  growth: colors.primarySoft,
  achievement: colors.accentGold,
  companion: colors.aurora,
  memory: colors.accentWarm,
  journey: colors.primary,
} as const;

/** Spacing scale: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 */
export const spacing = {
  xs: 4,
  sm: 8,
  md12: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  section: 24,
};

export const layout = {
  screenPadding: 20,
  cardGap: 12,
  tabBarHeight: 84,
  minTapTarget: 44,
  composerMinHeight: 52,
  iconSm: 18,
  iconMd: 22,
  iconLg: 28,
};

export const radius = {
  chip: 12,
  sm: 12,
  md: 16,
  lg: 20,
  hero: 24,
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
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  glow: {
    shadowColor: '#2DD4BF',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  aurora: {
    shadowColor: '#A78BFA',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
};

export const motion = {
  fast: 160,
  normal: 240,
  slow: 360,
};

export const typography = {
  hero: { fontSize: 44, fontWeight: '300' as const, letterSpacing: 3, lineHeight: 52 },
  screenTitle: { fontSize: 28, fontWeight: '600' as const, letterSpacing: -0.5, lineHeight: 34 },
  title: { fontSize: 26, fontWeight: '600' as const, letterSpacing: -0.4, lineHeight: 32 },
  sectionTitle: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.3, lineHeight: 26 },
  subtitle: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.2, lineHeight: 24 },
  cardTitle: { fontSize: 16, fontWeight: '600' as const, letterSpacing: -0.1, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  supporting: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  caption: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },
  buttonLabel: { fontSize: 16, fontWeight: '600' as const, letterSpacing: -0.1, lineHeight: 20 },
  stat: { fontSize: 28, fontWeight: '600' as const, letterSpacing: -0.5, lineHeight: 32 },
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
