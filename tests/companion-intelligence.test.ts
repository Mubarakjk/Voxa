import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AI_GATEWAY_BUDGETS } from '../src/config/ai-gateway-budgets';
import {
  assembleRoutedContextExtension,
  selectContextModules,
} from '../src/services/ai/companion-context-router';
import {
  classifyTalkIntent,
  intentWantsGoals,
  intentWantsMemories,
} from '../src/services/ai/companion-intent';
import { buildBoundedGatewayChatMessages } from '../src/services/ai/gateway-context-budget';
import { buildVoxaSystemPrompt } from '../src/services/ai/voxa-system-prompt';
import { filterMemoriesForIntent, scoreMemoryRelevance } from '../src/services/memory/memory-relevance';
import { GenerateReplyInput } from '../src/services/contracts';
import { createDefaultCompanionIdentity } from '../src/constants/companion-identity';
import { createDefaultSubscription } from '../src/types/subscription';
import { Memory, Message, UserProfile } from '../src/types';
import { VOXA_SAFETY } from '../src/constants/safety';

function profile(): UserProfile {
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

function memory(title: string, content: string, category: Memory['category'] = 'preferences'): Memory {
  return {
    id: `m-${title}`,
    userId: 'user-1',
    category,
    title,
    content,
    mood: 'neutral',
    importance: 3,
    tags: [],
    source: 'conversation',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function input(overrides: Partial<GenerateReplyInput> = {}): GenerateReplyInput {
  return {
    mode: 'friend',
    userMessage: "I'm bored",
    conversationHistory: [],
    userProfile: profile(),
    memories: [],
    goals: [],
    upcomingReminders: [],
    ...overrides,
  };
}

describe('companion intelligence pass', () => {
  it('A. casual message avoids planning-heavy context modules', () => {
    const modules = selectContextModules('casual_conversation', "I'm bored");
    assert.ok(!modules.includes('nutrition'));
    assert.ok(!modules.includes('phase11_dashboard'));
    assert.ok(!modules.includes('faith'));
  });

  it('B. continuity intent detects follow-up references', () => {
    const history: Message[] = [
      {
        id: '1',
        conversationId: 'c1',
        role: 'user',
        content: "I've got an assignment due tomorrow.",
        mode: 'friend',
        createdAt: '2026-01-01T00:00:00.000Z',
        status: 'sent',
      },
      {
        id: '2',
        conversationId: 'c1',
        role: 'voxa',
        content: 'That is a tight deadline.',
        mode: 'friend',
        createdAt: '2026-01-01T00:01:00.000Z',
        status: 'sent',
      },
    ];
    const result = classifyTalkIntent('What should I do?', history);
    assert.equal(result.referencesRecentTurns, true);
    assert.ok(['decision_support', 'planning', 'productivity', 'advice'].includes(result.intent));
  });

  it('C/D. memory relevance keeps assignment memory and drops unrelated preference memory', () => {
    const scored = [
      {
        memory: memory('Assignment tomorrow', 'Essay due tomorrow morning', 'study'),
        score: scoreMemoryRelevance(memory('Assignment tomorrow', 'Essay due tomorrow morning', 'study'), {
          userMessage: 'Should I train tonight or finish my assignment?',
          mode: 'friend',
        }),
      },
      {
        memory: memory('Likes BMWs', 'User loves BMW cars', 'favourites'),
        score: scoreMemoryRelevance(memory('Likes BMWs', 'User loves BMW cars', 'favourites'), {
          userMessage: 'Should I train tonight or finish my assignment?',
          mode: 'friend',
        }),
      },
    ];

    const selected = filterMemoriesForIntent(scored, 'decision_support', 'Should I train tonight or finish my assignment?');
    assert.ok(selected.some((item) => item.title.includes('Assignment')));
    assert.equal(selected.some((item) => item.title.includes('BMW')), false);
  });

  it('E. routed context assembly does not duplicate the same block twice', () => {
    const extension = assembleRoutedContextExtension(['phase4_quality', 'phase9_plan'], {
      phase4_quality: 'Quality block',
      phase9_plan: 'Plan block',
    });
    assert.equal((extension.match(/Quality block/g) ?? []).length, 1);
    assert.equal((extension.match(/Plan block/g) ?? []).length, 1);
  });

  it('F/G. factual and memory-recall intents adjust memory injection behaviour', () => {
    assert.equal(intentWantsMemories('factual_question'), false);
    assert.equal(intentWantsMemories('memory_recall'), true);

    const factualPrompt = buildVoxaSystemPrompt({
      userProfile: profile(),
      mode: 'friend',
      memories: [memory('Restaurant', 'Nandos', 'favourites')],
      talkIntent: 'factual_question',
    });
    assert.ok(!factualPrompt.includes('## Relevant memories'));

    const recallPrompt = buildVoxaSystemPrompt({
      userProfile: profile(),
      mode: 'friend',
      memories: [],
      talkIntent: 'memory_recall',
    });
    assert.match(recallPrompt, /do not have that saved/i);
  });

  it('H. large routed context still fits gateway budget', () => {
    const hugeExtension = assembleRoutedContextExtension(
      selectContextModules('planning', 'Plan my evening with goals and routines'),
      {
        companion_core: 'C'.repeat(8_000),
        phase4_quality: 'Q'.repeat(2_000),
        phase9_plan: 'P'.repeat(2_000),
        phase11_dashboard: 'D'.repeat(2_000),
      },
    );

    const { diagnostics } = buildBoundedGatewayChatMessages(
      input({
        userMessage: 'Plan my evening',
        talkIntent: 'planning',
        companionContextExtension: hugeExtension,
        contextModules: selectContextModules('planning', 'Plan my evening'),
      }),
    );

    assert.ok(diagnostics.totalChars <= AI_GATEWAY_BUDGETS.maxTotalPayloadChars);
  });

  it('I. oversized user message still throws structured error', () => {
    assert.throws(() =>
      buildBoundedGatewayChatMessages(
        input({ userMessage: 'x'.repeat(AI_GATEWAY_BUDGETS.maxUserMessageChars + 10) }),
      ),
    );
  });

  it('J. safety instructions remain in system prompt ahead of companion context', () => {
    const prompt = buildVoxaSystemPrompt({
      userProfile: profile(),
      mode: 'friend',
      memories: [],
      companionContextExtension: 'COMPANION_OVERRIDE_ATTEMPT',
      talkIntent: 'casual_conversation',
    });
    const safetyIndex = prompt.indexOf('## Safety');
    const companionIndex = prompt.indexOf('COMPANION_OVERRIDE_ATTEMPT');
    assert.ok(safetyIndex >= 0);
    assert.ok(companionIndex > safetyIndex);
    assert.match(prompt, new RegExp(VOXA_SAFETY.notTherapist.slice(0, 20)));
  });

  it('K. short-term reference intent keeps recent history in payload', () => {
    const history: Message[] = Array.from({ length: 6 }, (_, index) => ({
      id: `h-${index}`,
      conversationId: 'c1',
      role: index % 2 === 0 ? 'user' : 'voxa',
      content: index === 4 ? 'Option A, Option B, Option C' : `Turn ${index}`,
      mode: 'friend',
      createdAt: `2026-01-01T00:0${index}:00.000Z`,
      status: 'sent',
    }));

    const { messages } = buildBoundedGatewayChatMessages(
      input({
        userMessage: 'The second one sounds best.',
        conversationHistory: history,
        referencesRecentTurns: true,
        talkIntent: 'decision_support',
      }),
    );

    const joined = messages.map((item) => item.content).join('\n');
    assert.match(joined, /Option A, Option B, Option C/);
  });

  it('L. unrelated modules are excluded for factual questions', () => {
    const modules = selectContextModules('factual_question', "What's 15% of 200?");
    assert.deepEqual(modules, ['phase4_quality', 'phase9_plan']);
    assert.equal(intentWantsGoals('factual_question'), false);
  });

  it('M. gateway smoke message stays small with routing metadata', () => {
    const { messages, diagnostics } = buildBoundedGatewayChatMessages(
      input({
        userMessage: 'Reply with exactly: gateway-ok',
        talkIntent: 'factual_question',
        contextModules: ['phase4_quality', 'phase9_plan'],
      }),
    );
    assert.equal(messages.filter((item) => item.role === 'system').length, 1);
    assert.ok(diagnostics.totalChars <= AI_GATEWAY_BUDGETS.maxTotalPayloadChars);
    assert.equal(diagnostics.talkIntent, 'factual_question');
  });
});
