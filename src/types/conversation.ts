import { CompanionModeId } from './companion-mode';
import { EntityId, ISODateString, Timestamps } from './common';

export type ConversationChannel = 'chat' | 'voice' | 'safe_call';

export type ConversationStatus = 'active' | 'archived';

/**
 * A thread of interaction between the user and Voxa in a specific companion mode.
 */
export type Conversation = Timestamps & {
  id: EntityId;
  userId: EntityId;
  mode: CompanionModeId;
  channel: ConversationChannel;
  title?: string;
  status: ConversationStatus;
  lastMessageAt?: ISODateString;
  summary?: string;
};

export type CreateConversationInput = {
  userId: EntityId;
  mode: CompanionModeId;
  channel: ConversationChannel;
  title?: string;
};

export type UpdateConversationInput = Partial<
  Pick<Conversation, 'title' | 'status' | 'lastMessageAt' | 'summary'>
>;
