import { formatPrice, PRICING_CONFIG } from '../constants/pricing';
import { hasSupabaseConfig, getDataSourceMode } from '../config/env';
import {
  CheckInStyle,
  UserProfile,
  mergePreferences,
} from '../types';
import {
  CompanionControlPreferences,
  MemoryLevel,
  createDefaultCompanionControls,
} from '../types/relationship-personality';
import { PlanStatus } from '../types/subscription';

const CHECKIN_STYLES: CheckInStyle[] = ['off', 'gentle', 'proactive'];

const CHECKIN_LABELS: Record<CheckInStyle, string> = {
  off: 'Off',
  gentle: 'Gentle',
  proactive: 'Proactive',
};

const QUIET_HOUR_PRESETS: Array<{ label: string; start?: string; end?: string }> = [
  { label: 'Off' },
  { label: '22:00 – 07:00', start: '22:00', end: '07:00' },
  { label: '23:00 – 08:00', start: '23:00', end: '08:00' },
  { label: '21:00 – 06:00', start: '21:00', end: '06:00' },
];

const THEME_LABELS = {
  dark: 'Dark',
  system: 'System',
} as const;

const MEMORY_LEVEL_LABELS: Record<MemoryLevel, string> = {
  minimal: 'Minimal',
  balanced: 'Balanced',
  deep: 'Deep',
};

function formatQuietHours(profile: UserProfile): string {
  if (profile.preferences.quietHoursStart && profile.preferences.quietHoursEnd) {
    return `${profile.preferences.quietHoursStart} – ${profile.preferences.quietHoursEnd}`;
  }
  return 'Off';
}

function levelLabel(value: number) {
  if (value >= 0.67) return 'High';
  if (value <= 0.33) return 'Low';
  return 'Medium';
}

function controls(profile: UserProfile): CompanionControlPreferences {
  return profile.preferences.companionControls ?? createDefaultCompanionControls();
}

function formatPlanLabel(planStatus?: PlanStatus): string {
  if (!planStatus) return 'Free';
  if (planStatus.isTrialActive) return `Pro trial · ${planStatus.trialDaysLeft}d left`;
  if (planStatus.isPro) {
    const period = planStatus.billingPeriod === 'annual' ? 'Annual' : 'Monthly';
    return `Pro · ${period}`;
  }
  return 'Free';
}

function formatRenewalLabel(planStatus?: PlanStatus): string {
  if (!planStatus?.renewalDate) return '—';
  const date = new Date(planStatus.renewalDate);
  if (Number.isNaN(date.getTime())) return '—';
  if (planStatus.billingIssue) return `Billing issue · renews ${date.toLocaleDateString()}`;
  return planStatus.isTrialActive ? `Trial ends ${date.toLocaleDateString()}` : `Renews ${date.toLocaleDateString()}`;
}

export type SettingsItem = {
  id: string;
  label: string;
  value?: string;
  displayOnly?: boolean;
};

export function buildSettingsSections(
  profile: UserProfile,
  planStatus?: PlanStatus,
  weatherLocationLabel = 'Not set',
) {
  const c = controls(profile);
  const planLabel = formatPlanLabel(planStatus);
  const renewalLabel = formatRenewalLabel(planStatus);

  return [
    {
      title: 'Subscription',
      items: [
        {
          id: 'subscription-plan',
          label: 'Current plan',
          value: planLabel,
        },
        {
          id: 'subscription-renewal',
          label: planStatus?.isTrialActive ? 'Trial ends' : 'Renewal / expiry',
          value: renewalLabel,
          displayOnly: true,
        },
        {
          id: 'subscription-usage',
          label: 'Usage',
          value: 'View',
        },
        {
          id: 'subscription-upgrade',
          label: planStatus?.isPro ? 'Pro benefits' : 'Upgrade to Pro',
          value: planStatus?.isPro ? 'Active' : formatPrice(PRICING_CONFIG.prices.monthly) + '/mo',
        },
        {
          id: 'subscription-manage',
          label: 'Manage subscription',
          value: planStatus?.isPro ? 'App Store / Play' : '—',
        },
        {
          id: 'subscription-restore',
          label: 'Restore purchases',
          value: 'Restore',
        },
      ],
    },
    {
      title: 'Companion',
      items: [
        {
          id: 'companion-customise',
          label: 'Companion Studio',
          value: profile.companionIdentity?.voxaName ?? 'Voxa',
        },
        {
          id: 'features',
          label: 'Explore Voxa',
          value: 'Features',
        },
        {
          id: 'life-os',
          label: 'Life OS',
          value: 'Planning & reflection',
        },
        {
          id: 'voice',
          label: 'Voice & accent',
          value: 'Companion Studio',
        },
        {
          id: 'memory',
          label: 'Memory',
          value: profile.preferences.memoryEnabled ? 'On' : 'Off',
        },
        {
          id: 'memory-level',
          label: 'Memory depth',
          value: MEMORY_LEVEL_LABELS[c.memoryLevel],
        },
        {
          id: 'proactivity',
          label: 'Proactivity',
          value: levelLabel(c.proactivity),
        },
        {
          id: 'humour',
          label: 'Humour',
          value: levelLabel(c.humour),
        },
        {
          id: 'emoji',
          label: 'Emoji usage',
          value: levelLabel(c.emojiUsage),
        },
        {
          id: 'depth',
          label: 'Conversation depth',
          value: levelLabel(c.conversationDepth),
        },
        {
          id: 'warmth',
          label: 'Voice warmth',
          value: levelLabel(c.voiceWarmth),
        },
        {
          id: 'coach-strictness',
          label: 'Coach strictness',
          value: levelLabel(c.coachStrictness),
        },
        {
          id: 'friendliness',
          label: 'Friendliness',
          value: levelLabel(c.friendliness),
        },
        {
          id: 'music',
          label: 'Music recognition',
          value: 'Preview',
        },
        {
          id: 'memory-debug',
          label: 'View saved memories',
          value: 'Debug',
        },
      ],
    },
    {
      title: 'Personalisation',
      items: [
        {
          id: 'weather-location',
          label: 'Weather location',
          value: weatherLocationLabel,
        },
        {
          id: 'news-digest',
          label: 'Daily digest',
          value: 'Your updates',
        },
        {
          id: 'theme',
          label: 'Appearance',
          value: THEME_LABELS[profile.preferences.theme ?? 'dark'],
        },
      ],
    },
    {
      title: 'Notifications & check-ins',
      items: [
        {
          id: 'checkins',
          label: 'Check-in style',
          value: CHECKIN_LABELS[profile.preferences.checkInStyle],
        },
        {
          id: 'notifications',
          label: 'Push notifications',
          value: profile.preferences.morningGreetingEnabled ? 'On' : 'Off',
        },
        {
          id: 'quiet-hours',
          label: 'Quiet hours',
          value: formatQuietHours(profile),
        },
      ],
    },
    {
      title: 'Privacy & data',
      items: [
        {
          id: 'data',
          label: 'Data storage',
          value: getDataSourceMode() === 'supabase' ? 'Supabase cloud' : 'Local only',
          displayOnly: true,
        },
        {
          id: 'export-data',
          label: 'Export data',
          value: 'JSON',
        },
        {
          id: 'delete-account',
          label: 'Delete account',
          value: hasSupabaseConfig() ? 'Cloud' : 'Local',
        },
      ],
    },
  ];
}

const MEMORY_LEVELS: MemoryLevel[] = ['minimal', 'balanced', 'deep'];

function cycleLevel(current: number) {
  if (current <= 0.33) return 0.5;
  if (current <= 0.5) return 0.85;
  return 0.15;
}

export function cycleCheckInStyle(profile: UserProfile): Partial<UserProfile['preferences']> {
  const index = CHECKIN_STYLES.indexOf(profile.preferences.checkInStyle);
  const next = CHECKIN_STYLES[(index + 1) % CHECKIN_STYLES.length];
  return { checkInStyle: next };
}

export function cycleQuietHours(profile: UserProfile): Partial<UserProfile['preferences']> {
  const current = formatQuietHours(profile);
  const index = QUIET_HOUR_PRESETS.findIndex((preset) => preset.label === current);
  const next = QUIET_HOUR_PRESETS[(Math.max(0, index) + 1) % QUIET_HOUR_PRESETS.length];
  return {
    quietHoursStart: next.start,
    quietHoursEnd: next.end,
  };
}

export function cycleTheme(profile: UserProfile): Partial<UserProfile['preferences']> {
  const current = profile.preferences.theme ?? 'dark';
  return { theme: current === 'dark' ? 'system' : 'dark' };
}

export function cycleCompanionControl(
  profile: UserProfile,
  itemId: string,
): Partial<UserProfile['preferences']> | null {
  const current = controls(profile);

  switch (itemId) {
    case 'memory-level': {
      const index = MEMORY_LEVELS.indexOf(current.memoryLevel);
      const next = MEMORY_LEVELS[(index + 1) % MEMORY_LEVELS.length];
      return {
        companionControls: { ...current, memoryLevel: next },
      };
    }
    case 'humour':
      return { companionControls: { ...current, humour: cycleLevel(current.humour) } };
    case 'proactivity':
      return { companionControls: { ...current, proactivity: cycleLevel(current.proactivity) } };
    case 'emoji':
      return { companionControls: { ...current, emojiUsage: cycleLevel(current.emojiUsage) } };
    case 'depth':
      return {
        companionControls: { ...current, conversationDepth: cycleLevel(current.conversationDepth) },
      };
    case 'warmth':
      return { companionControls: { ...current, voiceWarmth: cycleLevel(current.voiceWarmth) } };
    case 'coach-strictness':
      return {
        companionControls: { ...current, coachStrictness: cycleLevel(current.coachStrictness) },
      };
    case 'friendliness':
      return {
        companionControls: { ...current, friendliness: cycleLevel(current.friendliness) },
      };
    default:
      return null;
  }
}

export function applyCompanionControlPatch(
  profile: UserProfile,
  patch: Partial<UserProfile['preferences']>,
) {
  return mergePreferences(profile.preferences, patch);
}