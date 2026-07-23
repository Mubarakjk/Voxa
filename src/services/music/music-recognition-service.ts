import * as FileSystem from 'expo-file-system/legacy';

import { hasAudDApiToken } from '../../config/env';
import { STORAGE_KEYS } from '../../constants/storage-keys';
import { CreateRecognizedSongInput, MusicRecognitionResult, RecognizedSong, createUuid } from '../../types';
import { requestMicrophonePermission } from '../attachments/attachment-permissions';
import { audioSessionManager } from '../audio/audio-session-manager';
import { IStorageService } from '../contracts';
import {
  ACRCloudProvider,
  AppleMusicProvider,
  AudDProvider,
  IMusicRecognitionProvider,
} from './music-providers';
import {
  recordFailedMusicAttempt,
  resetMusicDebug,
  setMusicDebugStep,
  setMusicRecordingMeta,
} from './music-debug-state';

const RECOGNITION_DURATION_MS = 14_000;

export interface IMusicRecognitionService {
  recognizeFromAudio(audioUri: string): Promise<MusicRecognitionResult | null>;
  recognizeFromQuery(query: string): Promise<MusicRecognitionResult | null>;
  recordAndRecognize(): Promise<MusicRecognitionResult | null>;
  listHistory(userId: string): Promise<RecognizedSong[]>;
  saveToHistory(input: CreateRecognizedSongInput): Promise<RecognizedSong>;
  getActiveProvider(): string;
  getAvailableProviders(): string[];
  isConfigured(): boolean;
}

export class HybridMusicRecognitionService implements IMusicRecognitionService {
  private readonly providers: IMusicRecognitionProvider[];

  constructor(private readonly storage?: IStorageService) {
    this.providers = [new AudDProvider(), new ACRCloudProvider(), new AppleMusicProvider()];
  }

  isConfigured(): boolean {
    return this.providers.some((provider) => provider.isAvailable());
  }

  getAvailableProviders(): string[] {
    return this.providers.filter((p) => p.isAvailable()).map((p) => p.label);
  }

  getActiveProvider(): string {
    const active = this.providers.find((p) => p.isAvailable());
    return active?.label ?? 'none';
  }

  async recognizeFromAudio(audioUri: string): Promise<MusicRecognitionResult | null> {
    let lastError: Error | null = null;
    for (const provider of this.providers) {
      if (!provider.isAvailable()) continue;
      try {
        const result = await provider.recognizeFromAudio(audioUri);
        if (result) return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Recognition failed');
        console.warn(`[Voxa] Music provider ${provider.id} failed.`, err);
      }
    }
    if (lastError) throw lastError;
    return null;
  }

  async recognizeFromQuery(query: string): Promise<MusicRecognitionResult | null> {
    const trimmed = query.trim();
    if (!trimmed) return null;
    return {
      title: trimmed,
      artist: 'Unknown artist',
      confidence: 0,
      provider: 'query',
    };
  }

  async recordAndRecognize(): Promise<MusicRecognitionResult | null> {
    resetMusicDebug();

    if (audioSessionManager.voiceCallActive) {
      setMusicDebugStep('failed', 'Voice call active');
      throw new Error('Finish your voice call before identifying music.');
    }

    if (!hasAudDApiToken()) {
      setMusicDebugStep('failed', 'AudD token missing');
      throw new Error('AudD token missing. Add EXPO_PUBLIC_AUDD_API_TOKEN to your .env file.');
    }

    if (!this.isConfigured()) {
      setMusicDebugStep('failed', 'No music provider configured');
      throw new Error('Music recognition is not configured.');
    }

    setMusicDebugStep('permission_check');
    const permitted = await requestMicrophonePermission();
    if (!permitted) {
      setMusicDebugStep('failed', 'Mic permission denied');
      throw new Error('Microphone permission denied. Enable mic access in Settings.');
    }

    let uri: string | null = null;
    try {
      const locked = await audioSessionManager.acquireLock('music');
      if (!locked) {
        setMusicDebugStep('failed', 'Audio busy');
        throw new Error('Audio is busy. End your voice call or wait for recording to finish.');
      }

      setMusicDebugStep('recording_started');
      uri = await audioSessionManager.recordSample('music', RECOGNITION_DURATION_MS);
      setMusicDebugStep('recording_saved');

      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) {
        setMusicDebugStep('failed', 'Audio file missing');
        throw new Error('Audio file missing after recording.');
      }

      const fileSizeBytes = info.size ?? 0;
      setMusicRecordingMeta(fileSizeBytes, RECOGNITION_DURATION_MS);
      setMusicDebugStep('file_exists', `${fileSizeBytes} bytes · ${Math.round(RECOGNITION_DURATION_MS / 1000)}s`);

      if (fileSizeBytes < 8000) {
        recordFailedMusicAttempt({
          fileSizeBytes,
          durationMs: RECOGNITION_DURATION_MS,
          auddStatus: 'local',
          auddCode: 'small_file',
          message: 'Recording too small',
        });
        throw new Error('Recording too small — play the song louder or hold your phone closer.');
      }

      return await this.recognizeFromAudio(uri);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Music recording failed.';
      setMusicDebugStep('failed', message);
      throw err instanceof Error ? err : new Error(message);
    } finally {
      if (uri) {
        try {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        } catch {
          // ignore
        }
      }
      await audioSessionManager.releaseLock('music');
      try {
        await audioSessionManager.setPlaybackMode();
      } catch {
        // ignore
      }
    }
  }

  async listHistory(userId: string): Promise<RecognizedSong[]> {
    if (!this.storage) return [];
    const all = (await this.storage.getItem<RecognizedSong[]>(STORAGE_KEYS.musicHistory)) ?? [];
    return all.filter((item) => item.userId === userId);
  }

  async saveToHistory(input: CreateRecognizedSongInput): Promise<RecognizedSong> {
    const timestamp = new Date().toISOString();
    const song: RecognizedSong = {
      id: createUuid(),
      userId: input.userId,
      title: input.title,
      artist: input.artist,
      album: input.album,
      recognizedAt: timestamp,
      source: input.source ?? 'manual',
      confidence: input.confidence,
      mood: input.mood,
      notes: input.notes,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (this.storage) {
      const all = (await this.storage.getItem<RecognizedSong[]>(STORAGE_KEYS.musicHistory)) ?? [];
      await this.storage.setItem(STORAGE_KEYS.musicHistory, [song, ...all].slice(0, 50));
    }

    setMusicDebugStep('saved_history');
    return song;
  }
}

let musicService: HybridMusicRecognitionService | null = null;

export function createMusicRecognitionService(storage?: IStorageService): IMusicRecognitionService {
  if (!musicService || storage) {
    musicService = new HybridMusicRecognitionService(storage);
  }
  return musicService;
}

export function getMusicRecognitionService(): IMusicRecognitionService {
  if (!musicService) musicService = new HybridMusicRecognitionService();
  return musicService;
}

export function parseMusicIntent(message: string): string | null {
  const lower = message.toLowerCase();
  if (/what song is this|identify this song|what am i listening to|recognize this song|shazam/.test(lower)) {
    return message.replace(/what song is this\??/i, '').trim() || 'Current track';
  }
  if (/tell me about this artist|who is this artist|about this artist/.test(lower)) {
    return 'artist_info';
  }
  return null;
}

export function isAudDConfigured(): boolean {
  return hasAudDApiToken();
}
