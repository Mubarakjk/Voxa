import { CheckInStyle, UserProfile, VoicePersonality } from '../types';

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

function formatQuietHours(profile: UserProfile): string {
  if (profile.preferences.quietHoursStart && profile.preferences.quietHoursEnd) {
    return `${profile.preferences.quietHoursStart} – ${profile.preferences.quietHoursEnd}`;
  }
  return 'Off';
}

export function buildSettingsSections(profile: UserProfile) {
  return [
    {
      title: 'Companion',
      items: [
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
          value: 'Coming soon',
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
          value: 'Local only',
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
