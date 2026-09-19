import { GenerateReplyInput } from '../contracts';
import {
  buildBoundedGatewayChatMessages,
  GatewayChatMessage,
  GatewayPayloadDiagnostics,
} from './gateway-context-budget';

export type { GatewayChatMessage, GatewayPayloadDiagnostics };

/** @deprecated Use AI_GATEWAY_BUDGETS.maxHistoryMessages */
export const MAX_HISTORY_MESSAGES = 10;

/** Messages for the Supabase ai-gateway (text or current-turn vision multipart). */
export function buildGatewayChatMessages(input: GenerateReplyInput): GatewayChatMessage[] {
  return buildBoundedGatewayChatMessages(input).messages;
}

export function buildGatewayChatMessagesWithDiagnostics(input: GenerateReplyInput): {
  messages: GatewayChatMessage[];
  diagnostics: GatewayPayloadDiagnostics;
} {
  return buildBoundedGatewayChatMessages(input);
}
