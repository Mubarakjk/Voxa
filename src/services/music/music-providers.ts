import * as FileSystem from 'expo-file-system/legacy';

import { getACRCloudConfig } from '../../config/env';
import { MusicRecognitionResult } from '../../types';
import { AudDProvider } from './audd-provider';

export interface IMusicRecognitionProvider {
  readonly id: string;
  readonly label: string;
  isAvailable(): boolean;
  recognizeFromAudio(audioUri: string): Promise<MusicRecognitionResult | null>;
}

async function readAudioBase64(uri: string): Promise<string | null> {
  try {
    return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  } catch {
    return null;
  }
}

export { AudDProvider };

export class ACRCloudProvider implements IMusicRecognitionProvider {
  readonly id = 'acrcloud';
  readonly label = 'ACRCloud';

  isAvailable() {
    return Boolean(getACRCloudConfig());
  }

  async recognizeFromAudio(audioUri: string): Promise<MusicRecognitionResult | null> {
    const config = getACRCloudConfig();
    if (!config) return null;

    const audioBase64 = await readAudioBase64(audioUri);
    if (!audioBase64) return null;

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await createACRSignature(config.accessKey, config.accessSecret, timestamp);
    if (!signature) return null;

    const body = new FormData();
    body.append('access_key', config.accessKey);
    body.append('sample_bytes', '0');
    body.append('timestamp', String(timestamp));
    body.append('signature', signature);
    body.append('data_type', 'audio');
    body.append('signature_version', '1');
    body.append('sample', {
      uri: audioUri,
      name: 'sample.m4a',
      type: 'audio/m4a',
    } as unknown as Blob);

    const response = await fetch(`https://${config.host}/v1/identify`, { method: 'POST', body });
    if (!response.ok) return null;

    const json = await response.json();
    const music = json?.metadata?.music?.[0];
    if (!music?.title) return null;

    return {
      title: music.title,
      artist: music.artists?.[0]?.name,
      album: music.album?.name,
      releaseYear: music.release_date ? Number(String(music.release_date).slice(0, 4)) : undefined,
      genre: music.genres?.[0]?.name,
      confidence: music.score ? music.score / 100 : 0.8,
      provider: this.id,
    };
  }
}

export class AppleMusicProvider implements IMusicRecognitionProvider {
  readonly id = 'apple_music';
  readonly label = 'Apple Music API';

  isAvailable() {
    return false;
  }

  async recognizeFromAudio(_audioUri: string): Promise<MusicRecognitionResult | null> {
    return null;
  }
}

async function createACRSignature(accessKey: string, accessSecret: string, timestamp: number): Promise<string | null> {
  try {
    if (typeof crypto === 'undefined' || !crypto.subtle) return null;
    const stringToSign = `POST\n/v1/identify\n${accessKey}\naudio\n1\n${timestamp}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(accessSecret);
    const messageData = encoder.encode(stringToSign);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign'],
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  } catch {
    return null;
  }
}

export function createMusicProviders(): IMusicRecognitionProvider[] {
  return [new AudDProvider(), new ACRCloudProvider(), new AppleMusicProvider()];
}
