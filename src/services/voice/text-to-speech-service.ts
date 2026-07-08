import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

import { hasOpenAIApiKey, getOpenAIApiKey } from '../../config/env';
import { VoicePersonality } from '../../types/user-profile';
import { VoiceSpeechConfig } from '../../types/voice-identity';
import { VOICE_PERSONALITY_PROFILES } from '../../types/voice-call';

export interface ITextToSpeechService {
  speak(text: string, config: VoiceSpeechConfig | VoicePersonality): Promise<void>;
  stop(): Promise<void>;
  setMuted(muted: boolean): void;
  isSpeaking(): boolean;
}

const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';

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
  private sound: Audio.Sound | null = null;
  private speakGeneration = 0;

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) void this.stop();
  }

  isSpeaking() {
    return this.speaking;
  }

  async speak(text: string, config: VoiceSpeechConfig | VoicePersonality): Promise<void> {
    if (this.muted || !text.trim()) return;

    const generation = ++this.speakGeneration;
    await this.stop();
    this.speaking = true;

    const speechConfig = resolveConfig(config);

    try {
      if (hasOpenAIApiKey()) {
        await this.speakOpenAI(text, speechConfig, generation);
      } else {
        await this.speakExpo(text, speechConfig, generation);
      }
    } finally {
      if (generation === this.speakGeneration) {
        this.speaking = false;
      }
    }
  }

  async stop(): Promise<void> {
    this.speakGeneration += 1;
    Speech.stop();
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch {
        // ignore unload errors
      }
      this.sound = null;
    }
    this.speaking = false;
  }

  private async speakExpo(text: string, config: VoiceSpeechConfig, generation: number) {
    await new Promise<void>((resolve, reject) => {
      Speech.speak(text, {
        pitch: config.expoPitch,
        rate: config.expoRate,
        onDone: () => resolve(),
        onStopped: () => resolve(),
        onError: () => reject(new Error('Speech playback failed')),
      });
    });
    if (generation !== this.speakGeneration) {
      throw new Error('Speech interrupted');
    }
  }

  private async speakOpenAI(text: string, config: VoiceSpeechConfig, generation: number) {
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      await this.speakExpo(text, config, generation);
      return;
    }

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

    if (!response.ok || generation !== this.speakGeneration) {
      if (generation === this.speakGeneration) {
        console.warn('[Voxa] OpenAI TTS failed, using device speech.');
        await this.speakExpo(text, config, generation);
      }
      return;
    }

    const bytes = await response.arrayBuffer();
    if (generation !== this.speakGeneration) return;

    const base64 = arrayBufferToBase64(bytes);
    const uri = `${FileSystem.cacheDirectory}voxa-tts-${Date.now()}.mp3`;
    await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });

    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
    const { sound } = await Audio.Sound.createAsync({ uri });
    this.sound = sound;

    await new Promise<void>((resolve) => {
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) resolve();
      });
      void sound.playAsync();
    });
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

export function createTextToSpeechService(): ITextToSpeechService {
  return new HybridTextToSpeechService();
}
