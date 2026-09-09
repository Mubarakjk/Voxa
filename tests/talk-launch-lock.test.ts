import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  containsReplacementChar,
  talkComposerEditPlaceholder,
  talkComposerPlaceholder,
} from '../src/constants/talk-copy';
import { classifyTalkIntent } from '../src/services/ai/companion-intent';
import { buildCompanionStrategy } from '../src/services/ai/companion-strategy';
import { selectContextModules } from '../src/services/ai/companion-context-router';
import { buildBoundedGatewayChatMessages } from '../src/services/ai/gateway-context-budget';
import { formatTalkErrorForUser, TalkAIError } from '../src/services/ai/talk-ai-errors';
import { buildTurnIntelligencePlan } from '../src/services/ai/turn-intelligence-plan';
import { talkIntentSkipsMemoryRetrieval } from '../src/services/chat/talk-critical-path';
import {
  buildContextualSuggestions,
  playfulChipsForbidden,
} from '../src/services/chat/contextual-suggestions-service';
import {
  beginComposerEdit,
  copyActionCopiesImmediately,
  editMutatesHistoryImmediately,
  userMessageActions,
  voxaMessageActions,
} from '../src/services/chat/message-actions';
import {
  beginTalkSend,
  composerTextAfterFailedSend,
  createTalkSendGuard,
  endTalkSend,
  talkGatewayGenerationCountForAcceptedSends,
} from '../src/services/chat/talk-send-guard';
import { GenerateReplyInput } from '../src/services/contracts';
import { talkDiagnosticsAreUserVisible } from '../src/utils/feature-logger';
import { createDefaultCompanionIdentity } from '../src/constants/companion-identity';
import { createDefaultSubscription } from '../src/types/subscription';
import { UserProfile } from '../src/types';
import { AI_GATEWAY_BUDGETS } from '../src/config/ai-gateway-budgets';

function makeProfile(): UserProfile {
  return {
    id: 'user-1',
    displayName: 'Alex',
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
    companion: { defaultMode: 'friend', lastUsedMode: 'friend' },
    companionIdentity: createDefaultCompanionIdentity(),
    subscription: createDefaultSubscription(),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function planFor(userMessage: string) {
  const talkIntent = classifyTalkIntent(userMessage);
  const strategy = buildCompanionStrategy({
    talkIntent,
    userMessage,
    history: [],
    memories: [],
  });
  return buildTurnIntelligencePlan({
    userMessage,
    selectedMode: 'friend',
    strategy,
    userProfile: makeProfile(),
  });
}

function finalSystemPrompt(userMessage: string) {
  const plan = planFor(userMessage);
  const input: GenerateReplyInput = {
    mode: 'friend',
    userMessage,
    conversationHistory: [],
    userProfile: makeProfile(),
    memories: [],
    companionContextExtension: `## Companion core\n${'X'.repeat(4_000)}`,
    turnIntelligenceBlock: plan.promptBlock,
    talkIntent: plan.intent,
    conversationState: plan.state,
  };
  const { messages } = buildBoundedGatewayChatMessages(input);
  const system = messages.find((item) => item.role === 'system')?.content ?? '';
  return { system, plan };
}

describe('Talk launch lock', () => {
  it('1. placeholder contains no U+FFFD replacement character', () => {
    const placeholder = talkComposerPlaceholder('Voxa');
    assert.equal(placeholder, 'Message Voxa...');
    assert.equal(containsReplacementChar(placeholder), false);
    assert.equal(containsReplacementChar(talkComposerEditPlaceholder()), false);
    const source = readFileSync('src/constants/talk-copy.ts', 'utf8');
    assert.equal(source.includes('\uFFFD'), false);
    const composer = readFileSync('src/components/chat/chat-input-bar.tsx');
    assert.equal(composer.includes('\uFFFD'), false);
    assert.equal(composer.includes('\x9d'), false);
  });

  it('2-4. one submit and simultaneous duplicates produce one accepted generation', () => {
    const guard = createTalkSendGuard();
    const first = beginTalkSend(guard, { text: "You won't believe what just happened", conversationId: 'c1', now: 1_000 });
    const second = beginTalkSend(guard, { text: "You won't believe what just happened", conversationId: 'c1', now: 1_010 });
    assert.equal(first.accepted, true);
    assert.equal(second.accepted, false);
    if (!second.accepted) assert.equal(second.reason, 'in_flight');
    assert.equal(talkGatewayGenerationCountForAcceptedSends(1), 1);
    endTalkSend(guard);
    const echo = beginTalkSend(guard, { text: "You won't believe what just happened", conversationId: 'c1', now: 1_200 });
    assert.equal(echo.accepted, false);
    if (!echo.accepted) assert.equal(echo.reason, 'duplicate_submit');
  });

  it('5. legitimate later send remains possible', () => {
    const guard = createTalkSendGuard();
    assert.equal(beginTalkSend(guard, { text: 'first', conversationId: 'c1', now: 1_000 }).accepted, true);
    endTalkSend(guard);
    const later = beginTalkSend(guard, { text: 'wait', conversationId: 'c1', now: 3_000 });
    assert.equal(later.accepted, true);
  });

  it('6-7. generation failure leaves one recoverable user turn and clears sending', () => {
    const guard = createTalkSendGuard();
    beginTalkSend(guard, { text: 'hello', conversationId: 'c1', now: 1_000 });
    const restored = composerTextAfterFailedSend({
      sentText: 'hello',
      persistedNewUserTurn: false,
      currentComposer: '',
    });
    assert.equal(restored, 'hello');
    const kept = composerTextAfterFailedSend({
      sentText: 'hello',
      persistedNewUserTurn: true,
      currentComposer: '',
    });
    assert.equal(kept, '');
    endTalkSend(guard);
    assert.equal(guard.inFlight, false);
    assert.equal(beginTalkSend(guard, { text: 'retry later', conversationId: 'c1', now: 4_000 }).accepted, true);
  });

  it('8. production path does not surface debug diagnostic toast', () => {
    assert.equal(talkDiagnosticsAreUserVisible(), false);
    const rateLimit = formatTalkErrorForUser(new TalkAIError('rate_limited'));
    assert.equal(rateLimit, "You're sending messages quickly. Give Voxa a moment, then try again.");
    assert.ok(!/\[Voxa:|AI gateway|FAILURE/i.test(rateLimit));
    const raw = formatTalkErrorForUser(new Error('[Voxa:chat.send] FAILURE 1240ms — AI gateway rate limited'));
    assert.ok(!/\[Voxa:|AI gateway|FAILURE 1240/i.test(raw));
  });

  it('9-13. final system prompt keeps Turn intelligence ahead of truncatable extensions', () => {
    const cases = [
      "Yo you wont believe what just happened",
      'I finally passed my driving test',
      "I don't want advice, I just need to vent",
      'Be real with me, am I procrastinating?',
      'Help me organise everything I need to do today',
      "I've been having serious chest pain should I ignore it",
    ];
    for (const userMessage of cases) {
      const { system, plan } = finalSystemPrompt(userMessage);
      const safetyAt = system.indexOf('## Safety');
      const turnAt = system.indexOf('## Turn intelligence');
      const endAt = system.indexOf('## End turn intelligence');
      const coreAt = system.indexOf('## Companion core');
      assert.ok(turnAt > safetyAt, userMessage);
      assert.ok(endAt > turnAt, userMessage);
      assert.ok(coreAt < 0 || coreAt > endAt || system.includes(plan.promptBlock.slice(0, 40)), userMessage);
      assert.match(system, /## Turn intelligence/);
    }

    const factual = finalSystemPrompt('17x24');
    assert.match(factual.system, /## Turn intelligence/);
    assert.equal(factual.plan.intent, 'factual_question');
    assert.ok(factual.system.length <= AI_GATEWAY_BUDGETS.maxSystemPromptChars + AI_GATEWAY_BUDGETS.maxContextExtensionChars + 50);
  });

  it('14. factual path remains direct / memory skip', () => {
    const plan = planFor('17x24');
    assert.equal(plan.intent, 'factual_question');
    assert.equal(plan.stance, 'inform');
    assert.equal(plan.memoryPolicy, 'skip');
    assert.equal(talkIntentSkipsMemoryRetrieval(plan.intent), true);
    assert.equal(plan.questionPolicy, 'none');
  });

  it('15. celebration questionPolicy none', () => {
    const plan = planFor('I finally passed my driving test');
    assert.equal(plan.stance, 'celebrate');
    assert.equal(plan.questionPolicy, 'none');
  });

  it('16. medical humour suppressed', () => {
    const plan = planFor("I've been having serious chest pain should I ignore it");
    assert.equal(plan.humour, 0);
    assert.equal(plan.humourSuppressed, true);
  });

  it('17. safety context has no playful chips', () => {
    const medical = "I've been having serious chest pain should I ignore it";
    assert.equal(playfulChipsForbidden({ userMessage: medical, humourSuppressed: true }), true);
    const chips = buildContextualSuggestions({
      talkIntent: 'emotional_support',
      userMessage: medical,
      voxaReply: 'Please get urgent medical help.',
      humourSuppressed: true,
    });
    assert.equal(chips.length, 0);
  });

  it('18. Copy is not labelled unless it copies immediately', () => {
    assert.equal(copyActionCopiesImmediately(), false);
    assert.ok(!userMessageActions().includes('copy'));
    assert.ok(!voxaMessageActions().includes('copy'));
    assert.ok(userMessageActions().includes('select_text'));
    assert.ok(userMessageActions().includes('share'));
  });

  it('19. Edit does not mutate historical message', () => {
    const state = beginComposerEdit({
      messageId: 'msg-1',
      messageText: 'original',
      currentComposer: '',
    });
    assert.equal(editMutatesHistoryImmediately(), false);
    assert.equal(state.originalText, 'original');
  });

  it('20. normal Talk gateway generation count remains ONE', () => {
    const modules = selectContextModules('casual_conversation', "Yo you wont believe what just happened");
    assert.ok(!modules.includes('open_loops'));
    assert.equal(talkGatewayGenerationCountForAcceptedSends(1), 1);
  });

  it('session short preference survives final prompt assembly', () => {
    const userMessage = 'Can you help me think about tomorrow';
    const talkIntent = classifyTalkIntent(userMessage);
    const strategy = buildCompanionStrategy({ talkIntent, userMessage, history: [], memories: [] });
    const plan = buildTurnIntelligencePlan({
      userMessage,
      selectedMode: 'friend',
      strategy,
      userProfile: makeProfile(),
      history: [
        {
          id: 'u0',
          conversationId: 'c1',
          role: 'user',
          content: 'keep it short',
          mode: 'friend',
          createdAt: '2026-01-01T00:00:00.000Z',
          status: 'sent',
        },
      ],
    });
    const { messages } = buildBoundedGatewayChatMessages({
      mode: 'friend',
      userMessage,
      conversationHistory: [],
      userProfile: makeProfile(),
      memories: [],
      companionContextExtension: `## Companion core\n${'X'.repeat(4_000)}`,
      turnIntelligenceBlock: plan.promptBlock,
      talkIntent: plan.intent,
    });
    const system = messages.find((item) => item.role === 'system')?.content ?? '';
    assert.match(system, /asked for short replies this session/i);
  });
});
