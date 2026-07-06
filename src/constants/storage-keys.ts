export const STORAGE_KEYS = {
  userProfile: '@voxa/user_profile',
  memories: '@voxa/memories',
  conversations: '@voxa/conversations',
  messages: '@voxa/messages',
  reminders: '@voxa/reminders',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
