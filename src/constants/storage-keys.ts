export const STORAGE_KEYS = {
  userProfile: '@voxa/user_profile',
  memories: '@voxa/memories',
  conversations: '@voxa/conversations',
  messages: '@voxa/messages',
  reminders: '@voxa/reminders',
  goals: '@voxa/goals',
  voiceSessions: '@voxa/voice_sessions',
  voiceTranscripts: '@voxa/voice_transcripts',
  trustedContacts: '@voxa/trusted_contacts',
  companionIntelligence: '@voxa/companion_intelligence',
  usageTracking: '@voxa/usage_tracking',
  musicHistory: '@voxa/music_history',
  musicFavorites: '@voxa/music_favorites',
  musicPlaylists: '@voxa/music_playlists',
  routineBlocks: '@voxa/routine_blocks',
  routineCompletions: '@voxa/routine_completions',
  companionStudioPrefs: '@voxa/companion_studio_prefs',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
