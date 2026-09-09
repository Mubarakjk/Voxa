import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AI_GATEWAY_BUDGETS } from '../src/config/ai-gateway-budgets';
import {
  buildGatewayChatMessagesWithDiagnostics,
  MAX_HISTORY_MESSAGES,
} from '../src/services/ai/chat-message-builder';
import {
  buildBoundedGatewayChatMessages,
  computeGatewayPayloadDiagnostics,
  stripEmbeddedPayloads,
  trimContextExtension,
  trimHistoryMessages,
} from '../src/services/ai/gateway-context-budget';
import { TalkAIError } from '../src/services/ai/talk-ai-errors';
import { buildTurnIntelligencePlan } from '../src/services/ai/turn-intelligence-plan';
import { buildVoxaSystemPrompt } from '../src/services/ai/voxa-system-prompt';
import { GenerateReplyInput } from '../src/services/contracts';
import { createDefaultCompanionIdentity } from '../src/constants/companion-identity';
import { createDefaultSubscription } from '../src/types/subscription';
import { Memory, Message, UserProfile } from '../src/types';

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-1',
    displayName: 'Alex',
    email: 'alex@example.com',
    timezone: 'UTC',
    onboardingComplete: true,
    preferences: {
      voicePersonality: 'warm_calm',
      memoryEnabled: true,
      checkInStyle: 'gentle',
      proactiveVoiceCalls: false,
      hapticsEnabled: true,
      ambientGlowEnabled: true,
      selectedVoiceOptionId: 'aurora',
    },
    companion: {
      defaultMode: 'friend',
      lastUsedMode: 'friend',
    },
    companionIdentity: createDefaultCompanionIdentity(),
    subscription: createDefaultSubscription(),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeMessage(index: number, role: Message['role'], content: string): Message {
  return {
    id: `msg-${index}`,
    conversationId: 'conv-1',
    role,
    content,
    mode: 'friend',
    createdAt: `2026-01-01T00:0${index % 10}:00.000Z`,
    status: 'sent',
  };
}

function makeMemory(index: number, content: string): Memory {
  return {
    id: `memory-${index}`,
    userId: 'user-1',
    category: 'moments',
    title: `Memory ${index}`,
    content,
    mood: 'warm',
    importance: 3,
    tags: [],
    source: 'conversation',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeInput(overrides: Partial<GenerateReplyInput> = {}): GenerateReplyInput {
  return {
    mode: 'friend',
    userMessage: 'Reply with exactly: gateway-ok',
    conversationHistory: [],
    userProfile: makeProfile(),
    memories: [],
    goals: [],
    upcomingReminders: [],
    ...overrides,
  };
}

describe('gateway context budget', () => {
  it('keeps a simple gateway smoke message under the client payload budget', () => {
    const { messages, diagnostics } = buildBoundedGatewayChatMessages(makeInput());
    const userMessage = messages.find((message) => message.role === 'user');

    assert.equal(userMessage?.content, 'Reply with exactly: gateway-ok');
    assert.equal(messages.filter((message) => message.role === 'system').length, 1);
    assert.ok(diagnostics.totalChars <= AI_GATEWAY_BUDGETS.maxTotalPayloadChars);
    assert.ok(diagnostics.requestBytes < 12_000);
    assert.ok(diagnostics.currentUserMessageChars < 64);
  });

  it('trims large conversation history while preserving recent turns', () => {
    const history = Array.from({ length: 30 }, (_, index) => {
      const role = index % 2 === 0 ? 'user' : 'voxa';
      return makeMessage(index, role, `History turn ${index}: ${'x'.repeat(400)}`);
    });

    const { messages } = buildBoundedGatewayChatMessages(
      makeInput({
        conversationHistory: history,
        userMessage: 'Latest user turn',
      }),
    );

    const historyMessages = messages.filter((message) => message.role !== 'system' && message.role !== 'user');
    assert.ok(historyMessages.length <= AI_GATEWAY_BUDGETS.maxHistoryMessages);
    assert.ok(historyMessages.at(-1)?.content.includes('History turn 29'));
    assert.ok(!historyMessages.some((message) => message.content.includes('History turn 0')));
  });

  it('bounds huge memory collections in the system prompt', () => {
    const memories = Array.from({ length: 40 }, (_, index) =>
      makeMemory(index, 'L'.repeat(2_000)),
    );

    const { messages, diagnostics } = buildBoundedGatewayChatMessages(
      makeInput({
        memories,
        companionContextExtension: 'X'.repeat(20_000),
      }),
    );

    const systemPrompt = messages.find((message) => message.role === 'system')?.content ?? '';
    assert.ok(systemPrompt.length <= AI_GATEWAY_BUDGETS.maxSystemPromptChars + AI_GATEWAY_BUDGETS.maxContextExtensionChars);
    assert.ok((systemPrompt.match(/Memory \d+/g) ?? []).length <= AI_GATEWAY_BUDGETS.maxMemoriesInPrompt);
    assert.ok(diagnostics.totalChars <= AI_GATEWAY_BUDGETS.maxTotalPayloadChars);
  });

  it('does not duplicate the current user message in history', () => {
    const history = [
      makeMessage(1, 'user', 'Earlier question'),
      makeMessage(2, 'voxa', 'Earlier answer'),
      makeMessage(3, 'user', 'Reply with exactly: gateway-ok'),
    ];

    const { messages } = buildBoundedGatewayChatMessages(
      makeInput({
        conversationHistory: history,
        userMessage: 'Reply with exactly: gateway-ok',
      }),
    );

    const userMessages = messages.filter((message) => message.role === 'user');
    assert.equal(
      userMessages.filter((message) => message.content === 'Reply with exactly: gateway-ok').length,
      1,
    );
    assert.ok(userMessages.some((message) => message.content === 'Earlier question'));
  });

  it('includes the system prompt only once', () => {
    const { messages } = buildBoundedGatewayChatMessages(
      makeInput({
        companionContextExtension: 'Phase context block',
      }),
    );

    assert.equal(messages.filter((message) => message.role === 'system').length, 1);
    const systemCount = messages.filter((message) =>
      message.content.includes('You are Voxa, a premium AI life companion'),
    ).length;
    assert.equal(systemCount, 1);
  });

  it('throws a controlled error for oversized individual user input', () => {
    assert.throws(
      () =>
        buildBoundedGatewayChatMessages(
          makeInput({
            userMessage: 'U'.repeat(AI_GATEWAY_BUDGETS.maxUserMessageChars + 1),
          }),
        ),
      (err: unknown) => err instanceof TalkAIError && err.code === 'message_too_large',
    );
  });

  it('strips embedded base64 payloads from text chat context', () => {
    const cleaned = stripEmbeddedPayloads(
      `hello data:image/png;base64,${'A'.repeat(500)} world`,
    );
    assert.ok(!cleaned.includes('data:image/png;base64'));
    assert.match(cleaned, /embedded attachment omitted/);
  });

  it('logs diagnostics without message contents or secrets', () => {
    const { diagnostics } = buildGatewayChatMessagesWithDiagnostics(
      makeInput({
        userMessage: 'secret-token-should-not-appear-in-metrics',
      }),
    );

    const serialized = JSON.stringify(diagnostics);
    assert.ok(serialized.includes('totalChars'));
    assert.ok(!serialized.includes('secret-token-should-not-appear-in-metrics'));
    assert.ok(!serialized.includes('Bearer'));
    assert.ok(!serialized.includes('sk-'));
  });

  it('retains newest history first when trimming by character budget', () => {
    const history = trimHistoryMessages([
      { role: 'user', content: 'old-' + 'a'.repeat(900) },
      { role: 'assistant', content: 'mid-' + 'b'.repeat(900) },
      { role: 'user', content: 'recent-' + 'c'.repeat(900) },
    ]);

    assert.equal(history.at(-1)?.content.startsWith('recent-'), true);
    assert.ok(
      history.reduce((sum, message) => sum + message.content.length, 0) <=
        AI_GATEWAY_BUDGETS.maxHistoryChars,
    );
  });

  it('trims oversized companion context extensions', () => {
    const trimmed = trimContextExtension('A'.repeat(10_000));
    assert.equal(trimmed.length, AI_GATEWAY_BUDGETS.maxContextExtensionChars);
  });

  it('exports history limit aligned with gateway budgets', () => {
    assert.equal(MAX_HISTORY_MESSAGES, AI_GATEWAY_BUDGETS.maxHistoryMessages);
  });

  it('keeps the turn intelligence block after Safety even when companion_core overflows', () => {
    const plan = buildTurnIntelligencePlan({
      userMessage: 'Yo you wont believe what just happened',
      selectedMode: 'friend',
    });
    const hugeCore = `## Companion core\n${'X'.repeat(4_000)}`;
    const { messages } = buildBoundedGatewayChatMessages(
      makeInput({
        userMessage: 'Yo you wont believe what just happened',
        companionContextExtension: hugeCore,
        turnIntelligenceBlock: plan.promptBlock,
      }),
    );
    const system = messages.find((message) => message.role === 'system')?.content ?? '';
    const safetyAt = system.indexOf('## Safety');
    const turnAt = system.indexOf('## Turn intelligence');
    const endAt = system.indexOf('## End turn intelligence');
    assert.ok(safetyAt >= 0);
    assert.ok(turnAt > safetyAt);
    assert.ok(endAt > turnAt);
    assert.match(system, /Question policy is NONE/i);
    assert.match(system, /Mode voice \(Friend\)/i);
  });

  it('does not keep a trailing turn plan if it is only in the truncatable extension', () => {
    const buried = `${'Y'.repeat(AI_GATEWAY_BUDGETS.maxContextExtensionChars)}\n## Turn intelligence buried`;
    const trimmed = trimContextExtension(buried);
    assert.ok(!trimmed.includes('## Turn intelligence buried'));
  });

  it('places the turn block immediately after Safety in the assembled system prompt', () => {
    const plan = buildTurnIntelligencePlan({
      userMessage: 'I finally passed my driving test',
      selectedMode: 'friend',
    });
    const prompt = buildVoxaSystemPrompt({
      userProfile: makeProfile(),
      mode: 'friend',
      memories: [],
      turnIntelligenceBlock: plan.promptBlock,
    });
    const safetyAt = prompt.indexOf('## Safety');
    const turnAt = prompt.indexOf('## Turn intelligence');
    const qualityAt = prompt.indexOf('## Response quality');
    assert.ok(safetyAt >= 0 && turnAt > safetyAt);
    assert.ok(qualityAt < 0 || qualityAt > turnAt);
  });

  it('computes aggregate diagnostics from bounded messages', () => {
    const messages = buildBoundedGatewayChatMessages(makeInput()).messages;
    const diagnostics = computeGatewayPayloadDiagnostics(messages, 120);
    assert.equal(diagnostics.messageCount, messages.length);
    assert.ok(diagnostics.systemPromptChars > 0);
    assert.equal(diagnostics.contextExtensionChars, 120);
  });
});
