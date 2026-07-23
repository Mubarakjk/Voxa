export type LaughStyle = 'soft' | 'warm' | 'playful' | 'subtle' | 'none';
export type GreetingStyle = 'casual' | 'formal' | 'warm' | 'energetic' | 'minimal';
export type EnergyLevel = 'calm' | 'balanced' | 'upbeat' | 'high';
export type RelationshipStyle = 'friend' | 'mentor' | 'partner' | 'coach' | 'sibling';
export type ConversationFrequency = 'low' | 'normal' | 'high';

export type TraitLevel = 'low' | 'medium' | 'high';
export type CoachingStyle = 'gentle' | 'balanced' | 'direct';
export type ConversationLength = 'brief' | 'balanced' | 'detailed';
export type EmojiUsage = 'none' | 'light' | 'normal';
export type MemoryDepth = 'light' | 'normal' | 'deep';

export type CompanionStudioExtendedPrefs = {
  laughStyle: LaughStyle;
  greetingStyle: GreetingStyle;
  energyLevel: EnergyLevel;
  relationshipStyle: RelationshipStyle;
  conversationFrequency: ConversationFrequency;
  wakePhrase: string;
  nickname: string;
  favouriteTopics: string[];
  sleepSchedule: { wake: string; sleep: string };
  humour: TraitLevel;
  empathy: TraitLevel;
  directness: TraitLevel;
  honesty: TraitLevel;
  curiosity: TraitLevel;
  coachingStyle: CoachingStyle;
  conversationLength: ConversationLength;
  emojiUsage: EmojiUsage;
  memoryDepth: MemoryDepth;
  encouragement: TraitLevel;
};

export const LAUGH_STYLES: Array<{ id: LaughStyle; label: string; description: string }> = [
  { id: 'soft', label: 'Soft chuckle', description: 'Gentle and understated' },
  { id: 'warm', label: 'Warm laugh', description: 'Friendly and inviting' },
  { id: 'playful', label: 'Playful', description: 'Light and fun' },
  { id: 'subtle', label: 'Subtle', description: 'Barely there, natural' },
  { id: 'none', label: 'No laugh', description: 'Keep it straight' },
];

export const GREETING_STYLES: Array<{ id: GreetingStyle; label: string; example: string }> = [
  { id: 'casual', label: 'Casual', example: 'Hey! Good to see you.' },
  { id: 'formal', label: 'Formal', example: 'Good to speak with you today.' },
  { id: 'warm', label: 'Warm', example: 'Hi — I am really glad you are here.' },
  { id: 'energetic', label: 'Energetic', example: 'Hey! Ready to make today great?' },
  { id: 'minimal', label: 'Minimal', example: 'Hey.' },
];

export const ENERGY_LEVELS: Array<{ id: EnergyLevel; label: string }> = [
  { id: 'calm', label: 'Calm' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'upbeat', label: 'Upbeat' },
  { id: 'high', label: 'High energy' },
];

export const RELATIONSHIP_STYLES: Array<{ id: RelationshipStyle; label: string; description: string }> = [
  { id: 'friend', label: 'Best friend', description: 'Warm, loyal, easygoing' },
  { id: 'mentor', label: 'Mentor', description: 'Wise, guiding, supportive' },
  { id: 'partner', label: 'Partner', description: 'Deep, caring, attentive' },
  { id: 'coach', label: 'Coach', description: 'Motivating, direct, action-oriented' },
  { id: 'sibling', label: 'Sibling', description: 'Playful, honest, familiar' },
];

export const CONVERSATION_FREQUENCIES: Array<{ id: ConversationFrequency; label: string }> = [
  { id: 'low', label: 'When I reach out' },
  { id: 'normal', label: 'Balanced' },
  { id: 'high', label: 'Check in often' },
];

export function createDefaultStudioExtendedPrefs(): CompanionStudioExtendedPrefs {
  return {
    laughStyle: 'warm',
    greetingStyle: 'warm',
    energyLevel: 'balanced',
    relationshipStyle: 'friend',
    conversationFrequency: 'normal',
    wakePhrase: 'Hey Voxa',
    nickname: '',
    favouriteTopics: [],
    sleepSchedule: { wake: '07:00', sleep: '23:00' },
    humour: 'medium',
    empathy: 'high',
    directness: 'medium',
    honesty: 'high',
    curiosity: 'high',
    coachingStyle: 'balanced',
    conversationLength: 'balanced',
    emojiUsage: 'light',
    memoryDepth: 'normal',
    encouragement: 'high',
  };
}

export function buildStudioExtendedPromptBlock(prefs: CompanionStudioExtendedPrefs): string {
  const lines = [
    `Relationship style: ${prefs.relationshipStyle}.`,
    `Energy: ${prefs.energyLevel}. Greeting style: ${prefs.greetingStyle}. Laugh style: ${prefs.laughStyle}.`,
    `Conversation frequency preference: ${prefs.conversationFrequency}.`,
    `Humour: ${prefs.humour}. Empathy: ${prefs.empathy}. Directness: ${prefs.directness}. Honesty: ${prefs.honesty}.`,
    `Curiosity: ${prefs.curiosity}. Coaching: ${prefs.coachingStyle}. Length: ${prefs.conversationLength}.`,
    `Emoji usage: ${prefs.emojiUsage}. Memory depth: ${prefs.memoryDepth}. Encouragement: ${prefs.encouragement}.`,
  ];
  if (prefs.nickname) lines.push(`Call the user "${prefs.nickname}" sometimes.`);
  if (prefs.favouriteTopics.length) lines.push(`Favourite topics: ${prefs.favouriteTopics.join(', ')}.`);
  lines.push(`Active hours roughly ${prefs.sleepSchedule.wake}–${prefs.sleepSchedule.sleep}.`);
  return lines.join(' ');
}
