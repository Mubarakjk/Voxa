import { getVoiceOption } from '../../constants/voice-options';

/** OpenAI Realtime output voices commonly available on gpt-realtime. */
const REALTIME_VOICES = new Set([
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'sage',
  'shimmer',
  'verse',
  'marin',
  'cedar',
]);

/**
 * Map curated companion TTS voice ids to Realtime output voices.
 * Falls back to marin when unsupported.
 */
export function mapCompanionVoiceToRealtime(optionId?: string | null): string {
  const option = getVoiceOption(optionId || 'aurora');
  const tts = option.openAiVoiceId.toLowerCase();
  if (REALTIME_VOICES.has(tts)) return tts;
  if (tts === 'nova') return 'coral';
  if (tts === 'fable') return 'ballad';
  if (tts === 'onyx') return 'ash';
  return 'marin';
}
