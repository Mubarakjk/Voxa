import { AI_GATEWAY_BUDGETS } from '../../config/ai-gateway-budgets';
import { Goal, Memory, Message, Reminder } from '../../types';
import { GenerateReplyInput } from '../contracts';
import { TalkIntent } from './companion-intent';
import { logFeature } from '../../utils/feature-logger';
import { buildVoxaSystemPrompt } from './voxa-system-prompt';
import { TalkAIError } from './talk-ai-errors';
import { TURN_INTELLIGENCE_END } from './turn-intelligence-plan';

export type GatewayChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type GatewayPayloadDiagnostics = {
  requestBytes: number;
  messageCount: number;
  systemPromptChars: number;
  contextExtensionChars: number;
  historyChars: number;
  currentUserMessageChars: number;
  totalChars: number;
  memoryCount?: number;
  contextModules?: string;
  talkIntent?: TalkIntent;
};

const BASE64_DATA_URL = /data:[a-z0-9/+.-]+;base64,[a-z0-9+/=\s]+/gi;

export function truncateText(text: string, maxChars: number, suffix = '…'): string {
  if (maxChars <= 0) return '';
  if (text.length <= maxChars) return text;
  if (maxChars <= suffix.length) return text.slice(0, maxChars);
  return `${text.slice(0, maxChars - suffix.length).trimEnd()}${suffix}`;
}

export function stripEmbeddedPayloads(text: string): string {
  const stripped = text.replace(BASE64_DATA_URL, '[embedded attachment omitted]');
  if (stripped.length > AI_GATEWAY_BUDGETS.maxUserMessageChars * 2) {
    return truncateText(stripped, AI_GATEWAY_BUDGETS.maxUserMessageChars * 2);
  }
  return stripped;
}

export function trimMemoriesForPrompt(memories: Memory[]): Memory[] {
  return memories.slice(0, AI_GATEWAY_BUDGETS.maxMemoriesInPrompt).map((memory) => {
    const title = truncateText(memory.title, 80);
    const remaining = Math.max(40, AI_GATEWAY_BUDGETS.maxMemoryEntryChars - title.length - 4);
    const content = truncateText(memory.content, remaining);
    return { ...memory, title, content };
  });
}

export function trimGoalsForPrompt(goals: Goal[]): Goal[] {
  return goals
    .filter((goal) => goal.status === 'active')
    .slice(0, AI_GATEWAY_BUDGETS.maxGoalsInPrompt)
    .map((goal) => ({
      ...goal,
      title: truncateText(goal.title, AI_GATEWAY_BUDGETS.maxGoalTitleChars),
    }));
}

export function trimRemindersForPrompt(reminders: Reminder[]): Reminder[] {
  return reminders.slice(0, AI_GATEWAY_BUDGETS.maxRemindersInPrompt);
}

export function trimContextExtension(extension?: string): string {
  const normalized = (extension ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!normalized) return '';
  return truncateText(normalized, AI_GATEWAY_BUDGETS.maxContextExtensionChars);
}

/** Length of identity + safety + the authoritative turn block. Never cut this prefix. */
export function systemPromptProtectedPrefixLength(system: string): number {
  const end = system.indexOf(TURN_INTELLIGENCE_END);
  if (end < 0) return 0;
  return end + TURN_INTELLIGENCE_END.length;
}

export function truncateSystemPromptPreservingTurnPlan(system: string, maxChars: number): string {
  const protectedLen = systemPromptProtectedPrefixLength(system);
  if (system.length <= maxChars) return system;
  if (protectedLen > 0 && maxChars < protectedLen) {
    return system.slice(0, protectedLen);
  }
  return truncateText(system, maxChars);
}

export function mapConversationHistory(history: Message[]): GatewayChatMessage[] {
  return history
    .filter((item) => item.role !== 'system')
    .slice(-AI_GATEWAY_BUDGETS.maxHistoryMessages)
    .map((item) => ({
      role: item.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: stripEmbeddedPayloads(item.content),
    }));
}

export function trimHistoryMessages(history: GatewayChatMessage[]): GatewayChatMessage[] {
  const retained: GatewayChatMessage[] = [];
  let usedChars = 0;

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const message = history[index];
    const content = truncateText(message.content, Math.min(message.content.length, 1_200));
    const nextChars = usedChars + content.length;
    if (retained.length >= AI_GATEWAY_BUDGETS.maxHistoryMessages) break;
    if (retained.length > 0 && nextChars > AI_GATEWAY_BUDGETS.maxHistoryChars) break;
    retained.unshift({ ...message, content });
    usedChars = nextChars;
  }

  return retained;
}

function buildUserTurn(input: GenerateReplyInput): string {
  let userText = stripEmbeddedPayloads(input.userMessage.trim());

  if (input.imageAnalysisSummary && !userText.includes('[Photo]')) {
    const summary = truncateText(input.imageAnalysisSummary, 400);
    userText = [userText, `[Photo context: ${summary}]`].filter(Boolean).join('\n');
  } else if (input.imageUrlForVision && !userText.includes('[Photo]')) {
    userText = [userText, '[Photo attached — describe using any summary you already have.]']
      .filter(Boolean)
      .join('\n');
  }

  return userText;
}

function enforceTotalPayloadBudget(messages: GatewayChatMessage[]): GatewayChatMessage[] {
  let totalChars = messages.reduce((sum, message) => sum + message.content.length, 0);
  if (totalChars <= AI_GATEWAY_BUDGETS.maxTotalPayloadChars) return messages;

  const trimmed = messages.map((message) => ({ ...message }));
  const systemIndex = trimmed.findIndex((message) => message.role === 'system');

  while (totalChars > AI_GATEWAY_BUDGETS.maxTotalPayloadChars) {
    let reduced = false;

    for (let index = 1; index < trimmed.length - 1; index += 1) {
      if (totalChars <= AI_GATEWAY_BUDGETS.maxTotalPayloadChars) break;
      const message = trimmed[index];
      if (message.content.length <= 120) continue;
      const nextLength = Math.max(120, Math.floor(message.content.length * 0.85));
      if (nextLength >= message.content.length) continue;
      totalChars -= message.content.length - nextLength;
      message.content = truncateText(message.content, nextLength);
      reduced = true;
    }

    if (totalChars <= AI_GATEWAY_BUDGETS.maxTotalPayloadChars) break;

    if (systemIndex >= 0) {
      const system = trimmed[systemIndex];
      const protectedLen = systemPromptProtectedPrefixLength(system.content);
      const floor = Math.max(1_500, protectedLen);
      const nextLength = Math.max(floor, Math.floor(system.content.length * 0.9));
      if (nextLength < system.content.length) {
        const next = truncateSystemPromptPreservingTurnPlan(system.content, nextLength);
        totalChars -= system.content.length - next.length;
        system.content = next;
        reduced = true;
      }
    }

    if (!reduced) break;
  }

  return trimmed;
}

export function computeGatewayPayloadDiagnostics(
  messages: GatewayChatMessage[],
  contextExtensionChars = 0,
): GatewayPayloadDiagnostics {
  const systemMessage = messages.find((message) => message.role === 'system');
  const historyMessages = messages.filter((message) => message.role !== 'system');
  const currentUserMessage = [...historyMessages].reverse().find((message) => message.role === 'user');
  const priorHistory = currentUserMessage
    ? historyMessages.filter((message) => message !== currentUserMessage)
    : historyMessages;

  const diagnostics: GatewayPayloadDiagnostics = {
    requestBytes: new TextEncoder().encode(JSON.stringify({ messages })).length,
    messageCount: messages.length,
    systemPromptChars: systemMessage?.content.length ?? 0,
    contextExtensionChars,
    historyChars: priorHistory.reduce((sum, message) => sum + message.content.length, 0),
    currentUserMessageChars: currentUserMessage?.content.length ?? 0,
    totalChars: messages.reduce((sum, message) => sum + message.content.length, 0),
  };

  return diagnostics;
}

export function logGatewayPayloadDiagnostics(diagnostics: GatewayPayloadDiagnostics): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;

  logFeature(
    'chat.gateway.payload',
    'start',
    [
      `bytes=${diagnostics.requestBytes}`,
      `messages=${diagnostics.messageCount}`,
      `memories=${diagnostics.memoryCount ?? 0}`,
      `intent=${diagnostics.talkIntent ?? 'unknown'}`,
      `modules=${diagnostics.contextModules ?? 'none'}`,
      `system=${diagnostics.systemPromptChars}`,
      `context=${diagnostics.contextExtensionChars}`,
      `history=${diagnostics.historyChars}`,
      `user=${diagnostics.currentUserMessageChars}`,
      `total=${diagnostics.totalChars}`,
    ].join(' '),
  );
}

export function buildBoundedGatewayChatMessages(input: GenerateReplyInput): {
  messages: GatewayChatMessage[];
  diagnostics: GatewayPayloadDiagnostics;
} {
  const userText = buildUserTurn(input);
  if (userText.length > AI_GATEWAY_BUDGETS.maxUserMessageChars) {
    throw new TalkAIError('message_too_large');
  }

  const contextExtension = trimContextExtension(input.companionContextExtension);
  const memories = trimMemoriesForPrompt(input.memories);
  const goals = trimGoalsForPrompt(input.goals ?? []);
  const upcomingReminders = trimRemindersForPrompt(input.upcomingReminders ?? []);

  const systemPrompt = truncateSystemPromptPreservingTurnPlan(
    buildVoxaSystemPrompt({
      userProfile: input.userProfile,
      mode: input.mode,
      memories,
      goals,
      upcomingReminders,
      currentTime: input.currentTime ?? new Date().toISOString(),
      companionContextExtension: contextExtension,
      turnIntelligenceBlock: input.turnIntelligenceBlock,
      talkIntent: input.talkIntent,
      referencesRecentTurns: input.referencesRecentTurns,
      conversationState: input.conversationState,
      userMessage: input.userMessage,
    }),
    AI_GATEWAY_BUDGETS.maxSystemPromptChars + AI_GATEWAY_BUDGETS.maxContextExtensionChars,
  );

  let history = mapConversationHistory(input.conversationHistory);
  if (history.length > 0 && history[history.length - 1].role === 'user') {
    history.pop();
  }
  history = trimHistoryMessages(history);

  let messages = enforceTotalPayloadBudget([
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userText },
  ]);

  const diagnostics = computeGatewayPayloadDiagnostics(messages, contextExtension.length);
  diagnostics.memoryCount = memories.length;
  diagnostics.talkIntent = input.talkIntent;
  diagnostics.contextModules = input.contextModules?.join(',') ?? 'none';
  logGatewayPayloadDiagnostics(diagnostics);

  return { messages, diagnostics };
}
