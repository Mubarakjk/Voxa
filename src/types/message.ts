import { CompanionModeId } from './companion-mode';
import { EntityId, ISODateString } from './common';

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
};

export type CreateMessageInput = {
  conversationId: EntityId;
  role: MessageRole;
  content: string;
  mode: CompanionModeId;
  status?: MessageDeliveryStatus;
  metadata?: Message['metadata'];
};

export type ChatMessageView = {
  id: EntityId;
  role: 'user' | 'voxa';
  text: string;
  time: string;
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
  };
}
