export type TalkSendRejectReason = 'in_flight' | 'duplicate_submit';

export type TalkSendGuard = {
  inFlight: boolean;
  lastFingerprint: string | null;
  lastAcceptedAt: number;
  lastText: string;
};

const DUPLICATE_WINDOW_MS = 1500;

export function createTalkSendGuard(): TalkSendGuard {
  return {
    inFlight: false,
    lastFingerprint: null,
    lastAcceptedAt: 0,
    lastText: '',
  };
}

export function talkSendFingerprint(text: string, conversationId: string): string {
  return `${conversationId}::${text.trim()}`;
}

export function beginTalkSend(
  guard: TalkSendGuard,
  input: { text: string; conversationId: string; now?: number },
): { accepted: true } | { accepted: false; reason: TalkSendRejectReason } {
  if (guard.inFlight) {
    return { accepted: false, reason: 'in_flight' };
  }
  const now = input.now ?? Date.now();
  const fingerprint = talkSendFingerprint(input.text, input.conversationId);
  if (
    fingerprint === guard.lastFingerprint &&
    now - guard.lastAcceptedAt < DUPLICATE_WINDOW_MS
  ) {
    return { accepted: false, reason: 'duplicate_submit' };
  }
  guard.inFlight = true;
  guard.lastFingerprint = fingerprint;
  guard.lastAcceptedAt = now;
  guard.lastText = input.text.trim();
  return { accepted: true };
}

export function endTalkSend(guard: TalkSendGuard): void {
  guard.inFlight = false;
}

export function composerTextAfterFailedSend(input: {
  sentText: string;
  persistedNewUserTurn: boolean;
  currentComposer: string;
}): string {
  if (input.persistedNewUserTurn) return input.currentComposer;
  return input.currentComposer.trim() ? input.currentComposer : input.sentText;
}

export function talkGatewayGenerationCountForAcceptedSends(acceptedCount: number): number {
  return acceptedCount;
}
