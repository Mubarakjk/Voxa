import { createTextToSpeechService, ITextToSpeechService } from './text-to-speech-service';
import { resolveVoiceIdentity, resolveVoiceSpeechConfig } from './voice-identity-resolver';
import { VOICE_PREVIEW_SCRIPT } from '../../types/voice-identity';
import { UserProfile } from '../../types';

let previewTts: ITextToSpeechService | null = null;
let previewGeneration = 0;

function getPreviewTts() {
  if (!previewTts) previewTts = createTextToSpeechService();
  return previewTts;
}

export async function previewVoxaVoice(profile: UserProfile): Promise<void> {
  const identity = resolveVoiceIdentity(profile);
  // When the user has a Studio voice identity, honour it — don't let legacy
  // personality TTS ids silently override gender/accent/speed choices.
  const hasCustomIdentity = Boolean(profile.companionIdentity?.voiceIdentity);
  const config = resolveVoiceSpeechConfig(
    identity,
    hasCustomIdentity ? undefined : profile.preferences.voicePersonality,
  );
  const tts = getPreviewTts();
  const generation = ++previewGeneration;
  await tts.stop();
  if (generation !== previewGeneration) return;
  try {
    await tts.speak(VOICE_PREVIEW_SCRIPT, config);
  } catch (err) {
    if (generation !== previewGeneration) return;
    const message = err instanceof Error ? err.message : 'Voice preview failed';
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[Voxa] Voice preview failed:', message);
    }
    throw err instanceof Error ? err : new Error(message);
  }
}

export async function stopVoicePreview(): Promise<void> {
  previewGeneration += 1;
  await getPreviewTts().stop();
}

export function isVoicePreviewSpeaking(): boolean {
  return getPreviewTts().isSpeaking();
}
