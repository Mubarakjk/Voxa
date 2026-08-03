/** Product-facing companion voice options — provider ids stay here, not in UI. */

export type VoiceOptionId =
  | 'aurora'
  | 'nova'
  | 'atlas'
  | 'sage'
  | 'echo'
  | 'luna'
  | 'orion'
  | 'sol';

export type VoiceOption = {
  id: VoiceOptionId;
  displayName: string;
  shortDescription: string;
  traits: string[];
  /** Speech provider used when online TTS is configured */
  provider: 'openai_tts';
  /** OpenAI TTS voice id */
  openAiVoiceId: string;
  /** On-device expo-speech pitch/rate fallback when OpenAI TTS is unavailable */
  expoPitch: number;
  expoRate: number;
  previewText: string;
  requiresPro: boolean;
  sortOrder: number;
  /** Supported language for TTS playback */
  language: 'en';
  /**
   * Honest tone note — not a claimed regional accent.
   * OpenAI TTS does not reliably support named regional accents.
   */
  toneNote: string;
};

export const DEFAULT_VOICE_OPTION_ID: VoiceOptionId = 'aurora';

export const VOICE_PREVIEW_LINE =
  "Hi, I'm Voxa. I'm here to listen, help you stay focused and grow alongside you.";

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'aurora',
    displayName: 'Aurora',
    shortDescription: 'Calm and warm',
    traits: ['supportive', 'steady'],
    provider: 'openai_tts',
    openAiVoiceId: 'nova',
    expoPitch: 0.98,
    expoRate: 0.9,
    previewText: VOICE_PREVIEW_LINE,
    requiresPro: false,
    sortOrder: 1,
    language: 'en',
    toneNote: 'Softer pace; maps to OpenAI nova',
  },
  {
    id: 'nova',
    displayName: 'Nova',
    shortDescription: 'Bright and friendly',
    traits: ['upbeat', 'clear'],
    provider: 'openai_tts',
    openAiVoiceId: 'shimmer',
    expoPitch: 1.04,
    expoRate: 0.98,
    previewText: VOICE_PREVIEW_LINE,
    requiresPro: false,
    sortOrder: 2,
    language: 'en',
    toneNote: 'Brighter delivery; maps to OpenAI shimmer',
  },
  {
    id: 'atlas',
    displayName: 'Atlas',
    shortDescription: 'Confident and grounded',
    traits: ['direct', 'steady'],
    provider: 'openai_tts',
    openAiVoiceId: 'onyx',
    expoPitch: 0.94,
    expoRate: 0.95,
    previewText: VOICE_PREVIEW_LINE,
    requiresPro: false,
    sortOrder: 3,
    language: 'en',
    toneNote: 'Lower, steadier tone; maps to OpenAI onyx',
  },
  {
    id: 'sage',
    displayName: 'Sage',
    shortDescription: 'Thoughtful and relaxed',
    traits: ['reflective', 'soft'],
    provider: 'openai_tts',
    openAiVoiceId: 'alloy',
    expoPitch: 1.0,
    expoRate: 0.88,
    previewText: VOICE_PREVIEW_LINE,
    requiresPro: false,
    sortOrder: 4,
    language: 'en',
    toneNote: 'Relaxed pace; maps to OpenAI alloy',
  },
  {
    id: 'echo',
    displayName: 'Echo',
    shortDescription: 'Energetic and playful',
    traits: ['lively', 'motivating'],
    provider: 'openai_tts',
    openAiVoiceId: 'coral',
    expoPitch: 1.08,
    expoRate: 1.05,
    previewText: VOICE_PREVIEW_LINE,
    requiresPro: true,
    sortOrder: 5,
    language: 'en',
    toneNote: 'Faster energy; maps to OpenAI coral',
  },
  {
    id: 'luna',
    displayName: 'Luna',
    shortDescription: 'Soft and reassuring',
    traits: ['gentle', 'caring'],
    provider: 'openai_tts',
    openAiVoiceId: 'sage',
    expoPitch: 1.02,
    expoRate: 0.86,
    previewText: VOICE_PREVIEW_LINE,
    requiresPro: true,
    sortOrder: 6,
    language: 'en',
    toneNote: 'Gentle pace; maps to OpenAI sage',
  },
  {
    id: 'orion',
    displayName: 'Orion',
    shortDescription: 'Clear and practical',
    traits: ['focused', 'precise'],
    provider: 'openai_tts',
    openAiVoiceId: 'echo',
    expoPitch: 0.97,
    expoRate: 1.0,
    previewText: VOICE_PREVIEW_LINE,
    requiresPro: true,
    sortOrder: 7,
    language: 'en',
    toneNote: 'Clear mid tone; maps to OpenAI echo',
  },
  {
    id: 'sol',
    displayName: 'Sol',
    shortDescription: 'Warm storyteller',
    traits: ['expressive', 'warm'],
    provider: 'openai_tts',
    openAiVoiceId: 'fable',
    expoPitch: 1.01,
    expoRate: 0.92,
    previewText: VOICE_PREVIEW_LINE,
    requiresPro: true,
    sortOrder: 8,
    language: 'en',
    toneNote: 'Expressive delivery; maps to OpenAI fable',
  },
];

export function getVoiceOption(id: string | undefined | null): VoiceOption {
  return VOICE_OPTIONS.find((v) => v.id === id) ?? VOICE_OPTIONS[0]!;
}

export function listVoiceOptions(includePro: boolean): VoiceOption[] {
  return VOICE_OPTIONS.filter((v) => includePro || !v.requiresPro).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

export function assertVoiceCatalogueIntegrity(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const providers = new Set<string>();
  for (const voice of VOICE_OPTIONS) {
    if (ids.has(voice.id)) errors.push(`Duplicate voice id: ${voice.id}`);
    ids.add(voice.id);
    if (providers.has(voice.openAiVoiceId)) {
      errors.push(`Duplicate OpenAI voice mapping: ${voice.openAiVoiceId}`);
    }
    providers.add(voice.openAiVoiceId);
    if (!voice.displayName.trim()) errors.push(`Missing display name for ${voice.id}`);
    if (!voice.previewText.trim()) errors.push(`Missing preview text for ${voice.id}`);
  }
  const freeCount = VOICE_OPTIONS.filter((v) => !v.requiresPro).length;
  if (freeCount < 4) errors.push(`Expected at least 4 free voices, found ${freeCount}`);
  return errors;
}
