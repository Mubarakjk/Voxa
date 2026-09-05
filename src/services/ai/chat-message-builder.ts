import { GenerateReplyInput } from '../contracts';
import {
  buildBoundedGatewayChatMessages,
  GatewayChatMessage,
  GatewayPayloadDiagnostics,
} from './gateway-context-budget';

export type { GatewayChatMessage, GatewayPayloadDiagnostics };

/** @deprecated Use AI_GATEWAY_BUDGETS.maxHistoryMessages */
export const MAX_HISTORY_MESSAGES = 10;

/** Text-only messages for the Supabase ai-gateway (no vision multipart). */
export function buildGatewayChatMessages(input: GenerateReplyInput): GatewayChatMessage[] {
  return buildBoundedGatewayChatMessages(input).messages;
}

export function buildGatewayChatMessagesWithDiagnostics(input: GenerateReplyInput): {
  messages: GatewayChatMessage[];
  diagnostics: GatewayPayloadDiagnostics;
} {
  return buildBoundedGatewayChatMessages(input);
}
