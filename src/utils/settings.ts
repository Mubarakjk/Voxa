import { hasSupabaseConfig, getDataSourceMode } from '../config/env';
import { getVoiceOption } from '../constants/voice-options';
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
import { NUTRITION_MODE_LABELS, NutritionMode } from '../types/nutrition';
import { isFeatureVisible } from '../config/feature-status';
import { isFreeLaunchMode } from '../config/launch-mode';
import { isScheduledCallsEnabled } from '../config/scheduled-calls';
import { LEGAL_URLS } from '../constants/legal-urls';

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
  nutritionMode: NutritionMode = 'off',
  appVersion = '1.0.0',
) {
  if (isFreeLaunchMode()) {
    return buildFreeLaunchSettingsSections(profile, appVersion, weatherLocationLabel, nutritionMode);
  }
  const c = controls(profile);
  const planLabel = formatPlanLabel(planStatus);
  const renewalLabel = formatRenewalLabel(planStatus);
  const isPro = Boolean(planStatus?.isPro);

  const subscriptionItems: SettingsItem[] = [
    {
      id: 'subscription-plan',
      label: 'Current plan',
      value: planLabel,
    },
  ];

  if (isPro) {
    subscriptionItems.push({
      id: 'subscription-renewal',
      label: planStatus?.isTrialActive ? 'Trial ends' : 'Renewal / expiry',
      value: renewalLabel,
      displayOnly: true,
    });
    subscriptionItems.push({
      id: 'subscription-manage',
      label: 'Manage subscription',
      value: 'App Store / Play',
    });
  } else {
    subscriptionItems.push({
      id: 'subscription-upgrade',
      label: 'Upgrade to Voxa Pro',
      value: 'View plans',
    });
    subscriptionItems.push({
      id: 'subscription-compare',
      label: 'Free vs Pro',
      value: 'Compare',
    });
  }

  subscriptionItems.push({
    id: 'subscription-restore',
    label: 'Restore purchases',
    value: 'Restore',
  });

  if (isPro) {
    subscriptionItems.push({
      id: 'subscription-compare',
      label: 'Free vs Pro',
      value: 'Compare',
    });
  }

  const personalisationItems: SettingsItem[] = [
    {
      id: 'weather-location',
      label: 'Weather location',
      value: weatherLocationLabel,
    },
    {
      id: 'news-digest',
      label: 'Your Digest',
      value: 'Personal notes',
    },
  ];

  if (isFeatureVisible('calorieTracking')) {
    personalisationItems.push({
      id: 'calorie-tracking',
      label: 'Calories & nutrition',
      value: NUTRITION_MODE_LABELS[nutritionMode],
    });
  }

  personalisationItems.push({
    id: 'theme',
    label: 'Appearance',
    value: THEME_LABELS[profile.preferences.theme ?? 'dark'],
  });

  return [
    {
      title: 'Subscription',
      items: subscriptionItems,
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
          label: 'Companion voice',
          value: getVoiceOption(profile.preferences.selectedVoiceOptionId).displayName,
        },
        ...(isFeatureVisible('notes')
          ? [
              {
                id: 'notes',
                label: 'Notes',
                value: 'Ideas & checklists',
              },
            ]
          : []),
        {
          id: 'voxa-speaks',
          label: 'Voxa speaks replies',
          value: profile.preferences.voxaSpeaksReplies === false ? 'Off' : 'On',
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
      items: personalisationItems,
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
        ...(isScheduledCallsEnabled()
          ? [
              {
                id: 'scheduled-calls',
                label: 'Scheduled companion calls',
                value: 'Manage',
              },
            ]
          : []),
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
          id: 'privacy-policy',
          label: 'Privacy Policy',
          value: 'View',
        },
        {
          id: 'relationship-insights',
          label: 'Relationship insights',
          value:
            (profile.preferences.companionControls?.showRelationshipInsights ?? true)
              ? 'Shown'
              : 'Hidden',
        },
        {
          id: 'terms',
          label: 'Terms of Service',
          value: 'View',
        },
        {
          id: 'export-data',
          label: 'Export data',
          value: 'JSON',
        },
        {
          id: 'delete-account',
          label: 'Delete account',
          value: hasSupabaseConfig() ? 'Request deletion' : 'Reset local',
        },
        {
          id: 'app-version',
          label: 'App version',
          value: '1.0.0',
          displayOnly: true,
        },
      ],
    },
  ];
}

/** V1 free launch — no subscription UI. */
export function buildFreeLaunchSettingsSections(
  profile: UserProfile,
  appVersion: string,
  weatherLocationLabel = 'Not set',
  nutritionMode: NutritionMode = 'off',
) {
  const c = controls(profile);

  return [
    {
      title: 'Companion',
      items: [
        { id: 'companion-customise', label: 'Companion Studio', value: profile.companionIdentity?.voxaName ?? 'Voxa' },
        { id: 'voice', label: 'Companion voice', value: getVoiceOption(profile.preferences.selectedVoiceOptionId).displayName },
        ...(isFeatureVisible('notes')
          ? [{ id: 'notes', label: 'Notes', value: 'Ideas & checklists' }]
          : []),
        { id: 'voxa-speaks', label: 'Voxa speaks replies', value: profile.preferences.voxaSpeaksReplies === false ? 'Off' : 'On' },
        { id: 'memory', label: 'Memory', value: profile.preferences.memoryEnabled ? 'On' : 'Off' },
        { id: 'memory-level', label: 'Memory depth', value: MEMORY_LEVEL_LABELS[c.memoryLevel] },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { id: 'theme', label: 'Appearance', value: THEME_LABELS[profile.preferences.theme ?? 'dark'] },
        { id: 'checkins', label: 'Check-in style', value: CHECKIN_LABELS[profile.preferences.checkInStyle] },
        { id: 'notifications', label: 'Push notifications', value: profile.preferences.morningGreetingEnabled ? 'On' : 'Off' },
        { id: 'quiet-hours', label: 'Quiet hours', value: formatQuietHours(profile) },
        { id: 'weather-location', label: 'Weather location', value: weatherLocationLabel },
        { id: 'news-digest', label: 'Your Digest', value: 'Personal notes' },
        ...(isFeatureVisible('calorieTracking')
          ? [{
              id: 'calorie-tracking',
              label: 'Calories & nutrition',
              value: NUTRITION_MODE_LABELS[nutritionMode],
            }]
          : []),
      ],
    },
    {
      title: 'Privacy & data',
      items: [
        { id: 'data', label: 'Data storage', value: getDataSourceMode() === 'supabase' ? 'Cloud sync' : 'Local only', displayOnly: true },
        { id: 'privacy-policy', label: 'Privacy', value: 'View' },
        { id: 'terms', label: 'Terms', value: 'View' },
        { id: 'export-data', label: 'Export data', value: 'JSON' },
        { id: 'delete-account', label: 'Delete account', value: hasSupabaseConfig() ? 'Request deletion' : 'Reset local' },
      ],
    },
    {
      title: 'Support',
      items: [{ id: 'contact-support', label: 'Contact support', value: LEGAL_URLS.supportEmail }],
    },
    {
      title: 'About',
      items: [
        { id: 'app-version', label: 'Voxa version', value: appVersion, displayOnly: true },
        { id: 'about-voxa', label: 'About Voxa', value: 'Learn more' },
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
    case 'relationship-insights':
      return {
        companionControls: {
          ...current,
          showRelationshipInsights: !(current.showRelationshipInsights !== false),
        },
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