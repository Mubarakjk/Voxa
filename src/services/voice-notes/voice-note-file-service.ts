import * as FileSystem from 'expo-file-system/legacy';

import { voiceNoteLog } from './voice-note-logger';

export type VoiceNoteFileValidation = {
  ok: boolean;
  uri?: string;
  durationMs: number;
  sizeBytes: number;
  mimeType: string;
  errorCode?: string;
};

const MIN_DURATION_MS = 1000;
const MIN_SIZE_BYTES = 1024;
const MIME = 'audio/m4a';

function extensionOk(uri: string): boolean {
  return uri.toLowerCase().endsWith('.m4a') || uri.toLowerCase().endsWith('.caf');
}

export async function validateVoiceNoteFile(input: {
  uri: string | null | undefined;
  durationMs: number;
}): Promise<VoiceNoteFileValidation> {
  const uri = input.uri ?? null;
  if (!uri) {
    return { ok: false, durationMs: input.durationMs, sizeBytes: 0, mimeType: MIME, errorCode: 'missing_uri' };
  }
  if (!extensionOk(uri)) {
    return { ok: false, uri, durationMs: input.durationMs, sizeBytes: 0, mimeType: MIME, errorCode: 'bad_extension' };
  }
  if (input.durationMs < MIN_DURATION_MS) {
    return { ok: false, uri, durationMs: input.durationMs, sizeBytes: 0, mimeType: MIME, errorCode: 'too_short' };
  }

  let sizeBytes = 0;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      return { ok: false, uri, durationMs: input.durationMs, sizeBytes: 0, mimeType: MIME, errorCode: 'file_missing' };
    }
    if ('size' in info && typeof info.size === 'number') {
      sizeBytes = info.size;
    }
  } catch {
    return { ok: false, uri, durationMs: input.durationMs, sizeBytes: 0, mimeType: MIME, errorCode: 'file_read_failed' };
  }

  if (sizeBytes <= MIN_SIZE_BYTES) {
    await deleteVoiceNoteFile(uri);
    return { ok: false, uri, durationMs: input.durationMs, sizeBytes, mimeType: MIME, errorCode: 'file_too_small' };
  }

  voiceNoteLog('FILE_VALID', `${input.durationMs}ms`);
  return { ok: true, uri, durationMs: input.durationMs, sizeBytes, mimeType: MIME };
}

export async function deleteVoiceNoteFile(uri: string) {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (err) {
    voiceNoteLog('ERROR', err instanceof Error ? err.message : 'delete_failed');
  }
}
