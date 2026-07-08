import { EntityId, ISODateString } from './common';

export type MessageAttachmentType = 'image' | 'video' | 'audio' | 'file';

export type MessageAttachmentUploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

export type MessageAttachment = {
  id: EntityId;
  type: MessageAttachmentType;
  localUri?: string;
  remoteUrl?: string;
  durationSeconds?: number;
  mimeType?: string;
  fileName?: string;
  sizeBytes?: number;
  thumbnailUri?: string;
  transcription?: string;
  analysisSummary?: string;
  uploadStatus?: MessageAttachmentUploadStatus;
  createdAt: ISODateString;
};

/** Draft from picker/recorder before message is created. */
export type PendingAttachmentInput = {
  type: MessageAttachmentType;
  localUri: string;
  mimeType?: string;
  fileName?: string;
  sizeBytes?: number;
  durationSeconds?: number;
  thumbnailUri?: string;
};

export function attachmentDisplayLabel(attachment: MessageAttachment): string {
  switch (attachment.type) {
    case 'audio':
      return attachment.transcription?.slice(0, 80) ?? 'Voice note';
    case 'image':
      return attachment.analysisSummary?.slice(0, 80) ?? 'Photo';
    case 'video':
      return attachment.fileName ?? 'Video';
    default:
      return attachment.fileName ?? 'Attachment';
  }
}
