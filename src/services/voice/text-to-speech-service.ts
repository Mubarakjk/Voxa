import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system/legacy';

import { hasOpenAIApiKey, getOpenAIApiKey } from '../../config/env';
import { VoicePersonality } from '../../types/user-profile';
import { VoiceSpeechConfig } from '../../types/voice-identity';
import { VOICE_PERSONALITY_PROFILES } from '../../types/voice-call';
import { audioSessionManager, createAudioPlayer } from '../audio/audio-session-manager';
import { setVoiceDebugState, ttsLog } from './voice-debug-state';

export interface ITextToSpeechService {
  speak(text: string, config: VoiceSpeechConfig | VoicePersonality): Promise<void>;
  stop(): Promise<void>;
  setMuted(muted: boolean): void;
  isSpeaking(): boolean;
}

const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';
const PLAYBACK_TIMEOUT_MS = 45_000;
/** iOS can delay expo-speech onStart after expo-audio session changes. */
const PLAYBACK_START_TIMEOUT_MS = 8_000;
const SESSION_SETTLE_MS = 120;

const LEGACY_SPEECH: Record<VoicePersonality, { pitch: number; rate: number; voice?: string }> = {
  warm_calm: { pitch: 0.95, rate: 0.9, voice: 'nova' },
  gentle: { pitch: 1.0, rate: 0.85, voice: 'shimmer' },
  energetic: { pitch: 1.08, rate: 1.08, voice: 'coral' },
  direct: { pitch: 1.0, rate: 1.05, voice: 'onyx' },
};

function resolveConfig(config: VoiceSpeechConfig | VoicePersonality): VoiceSpeechConfig {
  if (typeof config === 'string') {
    const profile = VOICE_PERSONALITY_PROFILES.find((item) => item.id === config);
    const legacy = LEGACY_SPEECH[config];
    return {
      openAiVoiceId: profile?.ttsVoiceId ?? legacy.voice ?? 'nova',
      expoPitch: profile?.expoPitch ?? legacy.pitch,
      expoRate: profile?.expoRate ?? legacy.rate,
      speedMultiplier: profile?.expoRate ?? legacy.rate,
    };
  }
  return config;
}

export class HybridTextToSpeechService implements ITextToSpeechService {
  private muted = false;
  private speaking = false;
  private cancelled = false;

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) void this.stop();
  }

  isSpeaking() {
    return this.speaking;
  }

  async speak(text: string, config: VoiceSpeechConfig | VoicePersonality): Promise<void> {
    const trimmed = text.trim();
    if (this.muted || !trimmed) return;

    this.cancelled = false;
    await this.stopPlaybackOnly();
    this.speaking = true;
    ttsLog('TTS START', trimmed.slice(0, 48));

    const speechConfig = resolveConfig(config);

    try {
      await audioSessionManager.prepareForPlayback('tts');

      if (hasOpenAIApiKey()) {
        try {
          await this.speakOpenAI(trimmed, speechConfig);
          return;
        } catch (err) {
          if (this.cancelled) return;
          const message = err instanceof Error ? err.message : 'OpenAI TTS failed';
          ttsLog('TTS STUCK FALLBACK', message);
          await audioSessionManager.unloadPlaybackSound();
          await this.speakExpo(trimmed, speechConfig);
          return;
        }
      }
      await this.speakExpo(trimmed, speechConfig);
    } catch (expoErr) {
      if (hasOpenAIApiKey()) {
        ttsLog('TTS FAILED BOTH PROVIDERS');
      }
      const message = expoErr instanceof Error ? expoErr.message : 'TTS failed';
      ttsLog('TTS ERROR', message);
      throw expoErr instanceof Error ? expoErr : new Error(message);
    } finally {
      this.speaking = false;
      await audioSessionManager.releaseLock('tts');
    }
  }

  async stop(): Promise<void> {
    this.cancelled = true;
    await this.stopPlaybackOnly();
    await audioSessionManager.releaseLock('tts');
    this.speaking = false;
  }

  private async stopPlaybackOnly() {
    Speech.stop();
    await audioSessionManager.unloadPlaybackSound();
  }

  private async speakExpo(text: string, config: VoiceSpeechConfig) {
    if (this.cancelled) return;
    ttsLog('TTS FALLBACK EXPO');
    ttsLog('TTS PROVIDER', 'expo-speech');
    setVoiceDebugState({ ttsProvider: 'expo-speech' });
    await audioSessionManager.setPlaybackMode();
    // Let the iOS audio session settle after expo-audio mode changes before Speech.speak.
    await new Promise((resolve) => setTimeout(resolve, SESSION_SETTLE_MS));
    if (this.cancelled) return;
    ttsLog('TTS AUDIO READY');

    let playbackStarted = false;
    let settled = false;

    await new Promise<void>((resolve, reject) => {
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(startTimer);
        clearInterval(speakingPoll);
        fn();
      };

      const startTimer = setTimeout(() => {
        if (!playbackStarted) {
          Speech.stop();
          finish(() => reject(new Error('expo-speech playback did not start within 8s')));
        }
      }, PLAYBACK_START_TIMEOUT_MS);

      // Some iOS builds never fire onStart after session churn; poll as a backup.
      const speakingPoll = setInterval(() => {
        void Speech.isSpeakingAsync().then((speaking) => {
          if (speaking && !playbackStarted) {
            playbackStarted = true;
            clearTimeout(startTimer);
            ttsLog('TTS PLAYBACK START', 'expo-speech (polled)');
          }
        });
      }, 250);

      Speech.speak(text, {
        pitch: config.expoPitch,
        rate: config.expoRate,
        onStart: () => {
          playbackStarted = true;
          clearTimeout(startTimer);
          ttsLog('TTS PLAYBACK START', 'expo-speech');
        },
        onDone: () => {
          ttsLog('TTS PLAYBACK END', 'expo-speech');
          finish(resolve);
        },
        onStopped: () => {
          ttsLog('TTS PLAYBACK END', 'expo-speech stopped');
          finish(resolve);
        },
        onError: () => {
          finish(() => reject(new Error('expo-speech playback failed')));
        },
      });
    });
  }

  private async speakOpenAI(text: string, config: VoiceSpeechConfig) {
    if (this.cancelled) return;
    const apiKey = getOpenAIApiKey();
    if (!apiKey) throw new Error('OpenAI API key missing');

    ttsLog('TTS PROVIDER', 'openai');
    setVoiceDebugState({ ttsProvider: 'OpenAI TTS' });

    const response = await fetch(OPENAI_TTS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: config.openAiVoiceId,
        input: text.slice(0, 4096),
        response_format: 'mp3',
        speed: Math.min(4, Math.max(0.25, config.speedMultiplier)),
      }),
    });

    if (this.cancelled) return;
    if (!response.ok) throw new Error(`OpenAI TTS HTTP ${response.status}`);

    const bytes = await response.arrayBuffer();
    if (!bytes.byteLength) throw new Error('OpenAI TTS returned empty audio');
    if (this.cancelled) return;

    ttsLog('TTS AUDIO READY', `${bytes.byteLength} bytes`);

    const base64 = arrayBufferToBase64(bytes);
    const uri = `${FileSystem.cacheDirectory}voxa-tts-${Date.now()}.mp3`;
    await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });

    await audioSessionManager.setPlaybackMode();
    await audioSessionManager.unloadPlaybackSound();

    const player = createAudioPlayer({ uri }, { updateInterval: 200 });
    audioSessionManager.registerPlaybackSound(player);

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      let playbackStarted = false;

      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearInterval(poll);
        clearTimeout(startTimeout);
        clearTimeout(playTimeout);
        fn();
      };

      const startTimeout = setTimeout(() => {
        if (!playbackStarted) {
          ttsLog('TTS STUCK FALLBACK', 'openai playback did not start within 3s');
          finish(() => reject(new Error('OpenAI TTS playback did not start within 3s')));
        }
      }, PLAYBACK_START_TIMEOUT_MS);

      const playTimeout = setTimeout(() => {
        finish(() => reject(new Error('OpenAI TTS playback timed out')));
      }, PLAYBACK_TIMEOUT_MS);

      const poll = setInterval(() => {
        if (this.cancelled) {
          finish(resolve);
          return;
        }
        const status = player.currentStatus;
        if (!status.isLoaded) return;
        if (status.playing && !playbackStarted) {
          playbackStarted = true;
          clearTimeout(startTimeout);
          ttsLog('TTS PLAYBACK START', 'openai');
        }
        if (status.didJustFinish) {
          ttsLog('TTS PLAYBACK END', 'openai');
          finish(resolve);
        }
      }, 100);

      try {
        player.play();
      } catch (err) {
        finish(() => reject(err instanceof Error ? err : new Error('OpenAI TTS play failed')));
      }
    });

    await audioSessionManager.unloadPlaybackSound();
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

let sharedTts: HybridTextToSpeechService | null = null;

export function getSharedTextToSpeechService(): ITextToSpeechService {
  if (!sharedTts) sharedTts = new HybridTextToSpeechService();
  return sharedTts;
}

export function createTextToSpeechService(): ITextToSpeechService {
  return getSharedTextToSpeechService();
}

export async function forceStopAllTts() {
  if (sharedTts) await sharedTts.stop();
}
