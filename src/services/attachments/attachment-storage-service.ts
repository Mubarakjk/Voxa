import * as FileSystem from 'expo-file-system/legacy';

import { hasSupabaseConfig } from '../../config/env';
import { MessageAttachment, createId, nowIso } from '../../types';
import { getSupabaseClient } from '../supabase/client';

const BUCKET = 'chat-attachments';

export type UploadProgress = {
  attachmentId: string;
  progress: number;
  status: MessageAttachment['uploadStatus'];
};

let lastUploadStatus = 'No uploads yet';

export function getLastAttachmentUploadStatus() {
  return lastUploadStatus;
}

export function recordUploadStatus(status: string) {
  lastUploadStatus = status;
}

export async function getStorageBucketStatus(): Promise<string> {
  if (!hasSupabaseConfig()) return 'Local only';
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.storage.getBucket(BUCKET);
    if (error) return `Unavailable · ${error.message}`;
    return data ? 'Ready' : 'Not found';
  } catch (err) {
    return err instanceof Error ? err.message : 'Unknown';
  }
}

export class AttachmentStorageService {
  async uploadAttachment(input: {
    userId: string;
    conversationId: string;
    messageId: string;
    attachment: MessageAttachment;
    onProgress?: (progress: number) => void;
  }): Promise<MessageAttachment> {
    const uri = input.attachment.localUri;
    if (!uri) {
      return { ...input.attachment, uploadStatus: 'failed' };
    }

    if (!hasSupabaseConfig()) {
      recordUploadStatus(`Local · ${input.attachment.type} · ${new Date().toLocaleTimeString()}`);
      return { ...input.attachment, uploadStatus: 'uploaded' };
    }

    try {
      input.onProgress?.(0.1);
      const fileName = input.attachment.fileName ?? `${input.attachment.id}.${extensionForMime(input.attachment.mimeType, input.attachment.type)}`;
      const path = `${input.userId}/${input.conversationId}/${input.messageId}/${fileName}`;

      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const bytes = base64ToUint8Array(base64);

      input.onProgress?.(0.5);
      const client = getSupabaseClient();
      const { error } = await client.storage.from(BUCKET).upload(path, bytes, {
        contentType: input.attachment.mimeType ?? 'application/octet-stream',
        upsert: true,
      });

      if (error) throw error;

      const { data: signed } = await client.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
      input.onProgress?.(1);
      recordUploadStatus(`Uploaded · ${path} · ${new Date().toLocaleTimeString()}`);

      return {
        ...input.attachment,
        remoteUrl: signed?.signedUrl ?? path,
        uploadStatus: 'uploaded',
      };
    } catch (err) {
      console.warn('[Voxa] Attachment upload failed — keeping local URI.', err);
      recordUploadStatus(`Failed · ${err instanceof Error ? err.message : 'error'} · ${new Date().toLocaleTimeString()}`);
      return { ...input.attachment, uploadStatus: 'failed' };
    }
  }

  buildAttachment(partial: Omit<MessageAttachment, 'id' | 'createdAt' | 'uploadStatus'>): MessageAttachment {
    return {
      id: createId('att'),
      createdAt: nowIso(),
      uploadStatus: 'pending',
      ...partial,
    };
  }
}

function extensionForMime(mimeType: string | undefined, type: MessageAttachment['type']) {
  if (mimeType?.includes('jpeg')) return 'jpg';
  if (mimeType?.includes('png')) return 'png';
  if (mimeType?.includes('mp4')) return 'mp4';
  if (mimeType?.includes('m4a') || mimeType?.includes('mp4')) return 'm4a';
  if (type === 'image') return 'jpg';
  if (type === 'video') return 'mp4';
  if (type === 'audio') return 'm4a';
  return 'bin';
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export const attachmentStorageService = new AttachmentStorageService();
