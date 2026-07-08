import { hasSupabaseConfig, getDataSourceMode } from '../config/env';
import {
  CheckInStyle,
  UserProfile,
  VoicePersonality,
  mergePreferences,
} from '../types';
import {
  CompanionControlPreferences,
  MemoryLevel,
  createDefaultCompanionControls,
} from '../types/relationship-personality';

const VOICE_LABELS: Record<VoicePersonality, string> = {
  warm_calm: 'Warm & calm',
  energetic: 'Energetic',
  direct: 'Direct',
  gentle: 'Gentle',
};

const CHECKIN_LABELS: Record<CheckInStyle, string> = {
  off: 'Off',
  gentle: 'Gentle',
  proactive: 'Proactive',
};

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

function getTrialDaysLeft(profile: UserProfile): number | null {
  if (!profile.subscription?.trialActive || !profile.subscription.trialEnd) return null;
  return Math.max(
    0,
    Math.ceil((new Date(profile.subscription.trialEnd).getTime() - Date.now()) / 86400000),
  );
}

export function buildSettingsSections(profile: UserProfile) {
  const c = controls(profile);
  const trialDays = getTrialDaysLeft(profile);
  const planLabel = profile.subscription?.subscriptionPlan === 'pro' ? 'Pro' : 'Free';
  const trialLabel = trialDays !== null ? `Trial · ${trialDays}d left` : undefined;

  return [
    {
      title: 'Subscription',
      items: [
        {
          id: 'subscription-plan',
          label: 'Current plan',
          value: trialLabel ?? planLabel,
        },
        {
          id: 'subscription-trial',
          label: 'Days left in trial',
          value: trialDays !== null ? String(trialDays) : '—',
        },
        {
          id: 'subscription-usage',
          label: 'Usage',
          value: 'View',
        },
        {
          id: 'subscription-upgrade',
          label: 'Upgrade to Pro',
          value: profile.subscription?.subscriptionPlan === 'pro' ? 'Active' : 'Unlock',
        },
        {
          id: 'subscription-manage',
          label: 'Manage subscription',
          value: 'Coming soon',
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
          id: 'voice',
          label: 'Voice personality',
          value: VOICE_LABELS[profile.preferences.voicePersonality],
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
        {
          id: 'calls',
          label: 'Proactive voice calls',
          value: profile.preferences.proactiveVoiceCalls ? 'On' : 'Off',
        },
      ],
    },
    {
      title: 'Privacy',
      items: [
        {
          id: 'safe-word',
          label: 'Safe word',
          value: 'Configured',
        },
        {
          id: 'data',
          label: 'Data storage',
          value: getDataSourceMode() === 'supabase' ? 'Supabase cloud' : 'Local only',
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
        {
          id: 'sign-out',
          label: 'Sign out',
          value: hasSupabaseConfig() ? 'Account' : 'N/A',
        },
      ],
    },
    {
      title: 'Experience',
      items: [
        {
          id: 'haptics',
          label: 'Haptic feedback',
          value: profile.preferences.hapticsEnabled ? 'On' : 'Off',
        },
        {
          id: 'ambient',
          label: 'Ambient glow',
          value: profile.preferences.ambientGlowEnabled ? 'On' : 'Off',
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
