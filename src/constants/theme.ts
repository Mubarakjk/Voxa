export const colors = {
  background: '#06060C',
  backgroundDeep: '#030308',
  surface: 'rgba(255, 255, 255, 0.05)',
  surfaceStrong: 'rgba(255, 255, 255, 0.08)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  primary: '#8B7CF6',
  primarySoft: '#A594F9',
  blue: '#6366F1',
  glow: 'rgba(139, 124, 246, 0.45)',
  blueGlow: 'rgba(99, 102, 241, 0.35)',
  safe: '#34D399',
  safeGlow: 'rgba(52, 211, 153, 0.2)',
  text: '#F5F5FA',
  textSecondary: '#B4B4C8',
  textMuted: '#787890',
  chatUser: 'rgba(99, 102, 241, 0.25)',
  chatVoxa: 'rgba(255, 255, 255, 0.06)',
  tabBar: 'rgba(10, 10, 18, 0.98)',
  tabBarBorder: 'rgba(255, 255, 255, 0.08)',
  danger: '#F87171',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  section: 28,
};

export const layout = {
  screenPadding: 20,
  cardGap: 12,
  tabBarHeight: 84,
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  full: 999,
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
