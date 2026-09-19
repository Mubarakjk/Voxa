import * as FileSystem from 'expo-file-system/legacy';

import { TalkAIError } from './talk-ai-errors';

/**
 * Convert a local image URI to a base64 data URL for OpenAI vision.
 * Does not accept remote http(s) URLs — the Edge Function must not fetch arbitrary URLs.
 */
export async function uriToVisionDataUrl(uri: string): Promise<string> {
  const trimmed = uri.trim();
  if (!trimmed) {
    throw new TalkAIError('image_too_large', 'Missing image');
  }
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    throw new TalkAIError('image_too_large', 'Remote image URLs are not allowed');
  }

  const mimeType = mimeTypeFromUri(trimmed);
  const base64 = await FileSystem.readAsStringAsync(trimmed, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:${mimeType};base64,${base64}`;
}

function mimeTypeFromUri(uri: string): string {
  const path = uri.split('?')[0]?.toLowerCase() ?? '';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.gif')) return 'image/gif';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/jpeg';
}
