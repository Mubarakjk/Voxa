/**
 * Client-side TTS contract — mirror of supabase/functions/_shared/tts-guard.ts.
 * Used by the app and unit tests (Deno edge imports cannot share this package path).
 */

import { VOICE_OPTIONS, VoiceOptionId } from '../../constants/voice-options';

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

export const TTS_OPENAI_MODEL = 'tts-1';

export const TTS_ABUSE_LIMITS = {
  maxTextChars: 2_000,
  dailyRequestLimit: 60,
  maxIdempotencyKeyLength: 128,
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

/** Expected OpenAI voice for each product VoiceOptionId (must match VOICE_OPTIONS). */
export function openAiVoiceIdForOption(id: VoiceOptionId): string {
  const option = VOICE_OPTIONS.find((item) => item.id === id);
  if (!option) throw new Error(`Unknown voice option: ${id}`);
  return option.openAiVoiceId;
}

export function allCatalogueOpenAiVoicesAreAllowlisted(): boolean {
  return VOICE_OPTIONS.every((option) => resolveAllowedTtsVoice(option.openAiVoiceId) !== null);
}

/** Cap Talk speech text before sending to the gateway (matches server). */
export function clipTextForTtsGateway(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= TTS_ABUSE_LIMITS.maxTextChars) return trimmed;
  return trimmed.slice(0, TTS_ABUSE_LIMITS.maxTextChars);
}
