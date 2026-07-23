import * as FileSystem from 'expo-file-system/legacy';

import { getAudDApiToken } from '../../config/env';
import { MusicRecognitionResult } from '../../types';
import { recordAudDRequest } from '../voice/voice-debug-state';
import { setMusicAuddDetail, setMusicDebugStep, setMusicResponseStatus } from './music-debug-state';

export class AudDProvider {
  readonly id = 'audd';
  readonly label = 'AudD';

  isAvailable() {
    return Boolean(getAudDApiToken());
  }

  async recognizeFromAudio(audioUri: string): Promise<MusicRecognitionResult | null> {
    const token = getAudDApiToken();
    if (!token) {
      setMusicDebugStep('failed', 'AudD token missing');
      recordAudDRequest('token missing');
      throw new Error('AudD token missing. Add EXPO_PUBLIC_AUDD_API_TOKEN to your .env file.');
    }

    setMusicDebugStep('file_exists');
    const fileInfo = await FileSystem.getInfoAsync(audioUri);
    if (!fileInfo.exists) {
      setMusicDebugStep('failed', 'Audio file missing');
      recordAudDRequest('file missing');
      throw new Error('Audio file missing. Try identifying again.');
    }

    const extension = audioUri.split('.').pop()?.toLowerCase() ?? 'm4a';
    const mimeType =
      extension === 'mp3' ? 'audio/mpeg' : extension === 'wav' ? 'audio/wav' : 'audio/m4a';

    setMusicDebugStep('uploading');
    const body = new FormData();
    body.append('api_token', token);
    body.append('return', 'apple_music,spotify');
    body.append('file', {
      uri: audioUri,
      name: `sample.${extension}`,
      type: mimeType,
    } as unknown as Blob);

    console.log('[Voxa] Music: AudD multipart upload', { extension, mimeType });

    let response: Response;
    try {
      response = await fetch('https://api.audd.io/', { method: 'POST', body });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      setMusicDebugStep('failed', 'AudD request failed');
      recordAudDRequest(`network · ${message}`);
      throw new Error('AudD request failed. Check your internet connection.');
    }

    setMusicDebugStep('response_received');
    setMusicResponseStatus(String(response.status));

    if (!response.ok) {
      recordAudDRequest(`HTTP ${response.status}`);
      setMusicDebugStep('failed', `AudD HTTP ${response.status}`);
      throw new Error(`AudD request failed (HTTP ${response.status}). Try again in a moment.`);
    }

    let json: Record<string, unknown>;
    try {
      json = (await response.json()) as Record<string, unknown>;
    } catch {
      setMusicDebugStep('failed', 'Parse failed');
      recordAudDRequest('parse failed');
      throw new Error('Parse failed. AudD returned an unexpected response.');
    }

    const status = typeof json.status === 'string' ? json.status : 'unknown';
    recordAudDRequest(status);
    setMusicAuddDetail(status, resultSummary(json));

    if (status === 'error') {
      const errorCode = typeof json.error === 'object' && json.error && 'error_code' in json.error
        ? String((json.error as { error_code?: number }).error_code)
        : 'unknown';
      setMusicAuddDetail(errorCode, 'error');
      setMusicDebugStep('failed', `AudD error ${errorCode}`);
      throw new Error(`AudD error (${errorCode}). Check your connection and try again.`);
    }

    const result = json.result as Record<string, unknown> | null;
    if (!result?.title) {
      setMusicAuddDetail(status, 'no_match');
      setMusicDebugStep('failed', 'No song recognised');
      recordAudDRequest('no match');
      throw new Error('No song recognised. Play louder, move closer, and try again.');
    }

    setMusicDebugStep('parsed');
    recordAudDRequest(`ok · ${String(result.title)}`);

    const spotify = result.spotify as { external_urls?: { spotify?: string } } | undefined;
    const appleMusic = result.apple_music as { url?: string } | undefined;

    setMusicAuddDetail(status, String(result.title));

    return {
      title: String(result.title),
      artist: result.artist ? String(result.artist) : undefined,
      album: result.album ? String(result.album) : undefined,
      releaseYear: result.release_date ? Number(String(result.release_date).slice(0, 4)) : undefined,
      genre: result.genre ? String(result.genre) : undefined,
      confidence: 0.85,
      provider: this.id,
      streamingLinks: {
        spotify: spotify?.external_urls?.spotify,
        appleMusic: appleMusic?.url,
        youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${result.title} ${result.artist ?? ''}`)}`,
      },
    };
  }
}

function resultSummary(json: Record<string, unknown>): string {
  const result = json.result as Record<string, unknown> | null;
  if (!result) return 'empty';
  if (result.title) return String(result.title);
  return 'no_match';
}
