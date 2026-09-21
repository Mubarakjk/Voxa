/**
 * Shared TTS abuse / voice allowlist for the tts-gateway Edge Function.
 * Keep in sync with src/services/voice/tts-contract.ts and VOICE_OPTIONS openAiVoiceIds.
 */

export const ALLOWED_OPENAI_TTS_VOICES = [
  'nova',
  'shimmer',
  'onyx',
  'alloy',
  'coral',
  'sage',
  'echo',
  'fable',
] as const;

export type AllowedOpenAiTtsVoice = (typeof ALLOWED_OPENAI_TTS_VOICES)[number];

/** Fixed OpenAI TTS model — clients cannot select another. */
export const TTS_OPENAI_MODEL = 'tts-1';

export const TTS_ABUSE_LIMITS = {
  maxTextChars: 2_000,
  /** Soft daily cap per authenticated user (usage_events metric = tts_requests). */
  dailyRequestLimit: 60,
  maxIdempotencyKeyLength: 128,
  /** Clamp OpenAI speed parameter. */
  minSpeed: 0.25,
  maxSpeed: 4,
  defaultSpeed: 1,
} as const;

export const TTS_USAGE_METRIC = 'tts_requests';

export function resolveAllowedTtsVoice(raw: unknown): AllowedOpenAiTtsVoice | null {
  if (typeof raw !== 'string') return null;
  const voice = raw.trim().toLowerCase();
  return (ALLOWED_OPENAI_TTS_VOICES as readonly string[]).includes(voice)
    ? (voice as AllowedOpenAiTtsVoice)
    : null;
}

export function validateTtsText(raw: unknown):
  | { ok: true; text: string }
  | { ok: false; code: string; message: string } {
  if (typeof raw !== 'string') {
    return { ok: false, code: 'invalid_text', message: 'Text is required.' };
  }
  const text = raw.trim();
  if (!text) {
    return { ok: false, code: 'invalid_text', message: 'Text is required.' };
  }
  if (text.length > TTS_ABUSE_LIMITS.maxTextChars) {
    return {
      ok: false,
      code: 'text_too_long',
      message: `Text exceeds ${TTS_ABUSE_LIMITS.maxTextChars} characters.`,
    };
  }
  return { ok: true, text };
}

export function resolveTtsSpeed(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return TTS_ABUSE_LIMITS.defaultSpeed;
  }
  return Math.min(TTS_ABUSE_LIMITS.maxSpeed, Math.max(TTS_ABUSE_LIMITS.minSpeed, raw));
}
