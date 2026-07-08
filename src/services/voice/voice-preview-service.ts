import { createTextToSpeechService, ITextToSpeechService } from './text-to-speech-service';
import { resolveVoiceIdentity, resolveVoiceSpeechConfig } from './voice-identity-resolver';
import { VOICE_PREVIEW_SCRIPT } from '../../types/voice-identity';
import { UserProfile } from '../../types';

let previewTts: ITextToSpeechService | null = null;

function getPreviewTts() {
  if (!previewTts) previewTts = createTextToSpeechService();
  return previewTts;
}

export async function previewVoxaVoice(profile: UserProfile): Promise<void> {
  const identity = resolveVoiceIdentity(profile);
  const config = resolveVoiceSpeechConfig(identity, profile.preferences.voicePersonality);
  const tts = getPreviewTts();
  await tts.stop();
  await tts.speak(VOICE_PREVIEW_SCRIPT, config);
}

export async function stopVoicePreview(): Promise<void> {
  await getPreviewTts().stop();
}

export function isVoicePreviewSpeaking(): boolean {
  return getPreviewTts().isSpeaking();
}
