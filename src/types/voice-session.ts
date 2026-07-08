import { CompanionModeId } from './companion-mode';
import { EntityId, ISODateString, Timestamps } from './common';

export type VoiceCallState = 'idle' | 'ringing' | 'active' | 'ended';

/**
 * Local voice / safe-call session record with transcript linkage.
 */
export type VoiceSession = Timestamps & {
  id: EntityId;
  userId: EntityId;
  conversationId: EntityId;
  mode: CompanionModeId;
  state: VoiceCallState;
  isSafeCall: boolean;
  startedAt?: ISODateString;
  endedAt?: ISODateString;
  durationSeconds: number;
  transcriptMessageIds: EntityId[];
  checkInIntervalMinutes?: number;
};

export type CreateVoiceSessionInput = {
  userId: EntityId;
  conversationId: EntityId;
  mode: CompanionModeId;
  isSafeCall?: boolean;
  checkInIntervalMinutes?: number;
};

export type UpdateVoiceSessionInput = Partial<
  Pick<
    VoiceSession,
    'state' | 'startedAt' | 'endedAt' | 'durationSeconds' | 'transcriptMessageIds' | 'checkInIntervalMinutes'
  >
>;
