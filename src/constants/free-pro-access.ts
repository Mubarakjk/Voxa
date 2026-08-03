/**
 * Canonical Free / Voxa Pro access configuration for release.
 * Single source of truth for marketing copy and what Free must keep.
 * Numeric limits live in `pricing.ts` (FREE_PLAN_LIMITS / PRO_PLAN_LIMITS).
 */

export const FREE_CORE_EXPERIENCES = [
  'Onboarding',
  'Home',
  'Text conversations (daily fair-use allowance)',
  'Basic memory',
  'Daily check-in',
  'Routines and goals (limited)',
  'Basic Notes',
  'Journey',
  'Basic Saved Moments',
  'Balanced companion personality',
  'Standard companion voices',
  'Spoken reply playback (TTS)',
  'Challenge Me (reasonable limits)',
  'Life Book preview',
  'Basic relationship progress',
  'Settings, privacy, deletion, restore',
] as const;

/** Only features that are implemented and gated today — never advertise calls. */
export const PRO_IMPLEMENTED_BENEFITS = [
  'Higher fair-use conversation allowance',
  'Advanced memory depth and pinned memories',
  'Companion insights and Weekly Letter',
  'Full Life Book and Life OS tools',
  'Premium companion voices',
  'Expanded personality customisation',
  'Advanced Note AI actions',
  'Deeper weekly and monthly reports',
] as const;

export const PAYWALL_COPY = {
  title: 'Go deeper with Voxa Pro',
  subtitle: 'More memory, deeper insights and more room to grow with your companion.',
  subscribeLabel: 'Subscribe',
  continueFreeLabel: 'Continue Free',
  restoreLabel: 'Restore Purchases',
  termsLabel: 'Terms of Use',
  privacyLabel: 'Privacy Policy',
  annualBestValueLabel: 'Best value',
} as const;

/** Non-user-initiated paywall cooldown (6 hours). */
export const PAYWALL_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export const LIMIT_REACHED_COPY = {
  title: 'Limit reached',
  footer:
    'You can keep using core Voxa features. Upgrade only if you want more room today.',
  notNow: 'Not now',
  upgrade: 'Upgrade to Voxa Pro',
} as const;

/** Sources that should respect the 6-hour contextual paywall cooldown. */
export const CONTEXTUAL_PAYWALL_SOURCES = new Set([
  'chat-limit',
  'note-ai',
  'premium-voice',
  'voice-limit',
  'safe-call-limit',
  'life-book',
  'memory-limit',
  'usage-limit',
]);
