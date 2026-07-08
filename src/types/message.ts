import { CompanionModeId } from './companion-mode';
import { EntityId, ISODateString } from './common';
import { MessageAttachment, PendingAttachmentInput } from './message-attachment';

export type { MessageAttachment, PendingAttachmentInput } from './message-attachment';
export { attachmentDisplayLabel } from './message-attachment';

export type MessageRole = 'user' | 'voxa' | 'system';

export type MessageDeliveryStatus = 'sent' | 'pending' | 'failed';

/**
 * A single utterance within a conversation.
 * UI may map `content` to chat bubbles and voice transcripts alike.
 */
export type Message = {
  id: EntityId;
  conversationId: EntityId;
  role: MessageRole;
  content: string;
  mode: CompanionModeId;
  createdAt: ISODateString;
  status: MessageDeliveryStatus;
  /** Optional metadata for voice timing, reminders referenced, etc. */
  metadata?: Record<string, string | number | boolean>;
  attachments?: MessageAttachment[];
};

export type UpdateMessageInput = {
  content?: string;
  status?: MessageDeliveryStatus;
  metadata?: Message['metadata'];
  attachments?: MessageAttachment[];
};

export type CreateMessageInput = {
  conversationId: EntityId;
  role: MessageRole;
  content: string;
  mode: CompanionModeId;
  status?: MessageDeliveryStatus;
  metadata?: Message['metadata'];
  attachments?: MessageAttachment[];
};

export type ChatMessageView = {
  id: EntityId;
  role: 'user' | 'voxa';
  text: string;
  time: string;
  status?: MessageDeliveryStatus;
  attachments?: MessageAttachment[];
};

export function toChatMessageView(message: Message): ChatMessageView {
  if (message.role === 'system') {
    throw new Error('System messages are not shown in chat UI views.');
  }

  return {
    id: message.id,
    role: message.role,
    text: message.content,
    time: new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    status: message.status,
    attachments: message.attachments,
  };
}
