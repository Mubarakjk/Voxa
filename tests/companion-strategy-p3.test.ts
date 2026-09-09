import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AI_GATEWAY_BUDGETS } from '../src/config/ai-gateway-budgets';
import { VOXA_SAFETY } from '../src/constants/safety';
import { classifyTalkIntent } from '../src/services/ai/companion-intent';
import { buildResponseQualityBlock } from '../src/services/ai/companion-response-quality';
import {
  buildCompanionStrategy,
  extractListedOptions,
  isExplicitConversationalPreferenceMessage,
  logCompanionStrategyDiagnostic,
  resolveReferenceFromHistory,
} from '../src/services/ai/companion-strategy';
import { buildBoundedGatewayChatMessages } from '../src/services/ai/gateway-context-budget';
import { buildVoxaSystemPrompt } from '../src/services/ai/voxa-system-prompt';
import { buildContextualSuggestions } from '../src/services/chat/contextual-suggestions-service';
import { GenerateReplyInput } from '../src/services/contracts';
import { createDefaultCompanionIdentity } from '../src/constants/companion-identity';
import { createDefaultSubscription } from '../src/types/subscription';
import { Memory, Message, UserProfile } from '../src/types';
import { assessMemoryWrite } from '../src/services/memory/memory-write-policy';
import { filterMemoriesForIntent, rankMemories } from '../src/services/memory/memory-relevance';
import { planResponse, scoreResponseQuality, polishResponse } from '../src/services/phase9/response-planner-service';
import { getFeatureLogs } from '../src/utils/feature-logger';
import { resolveTalkAIProvider } from '../src/config/ai-routing';

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

function memory(title: string, content: string, overrides: Partial<Memory> = {}): Memory {
  return {
    id: `m-${title}`,
    userId: 'user-1',
    category: 'preferences',
    title,
    content,
    mood: 'neutral',
    importance: 4,
    tags: ['explicit', 'conversational_preference'],
    source: 'conversation',
    useCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function strategyFor(userMessage: string, history: Message[] = []) {
  const talkIntent = classifyTalkIntent(userMessage, history);
  return buildCompanionStrategy({
    talkIntent,
    userMessage,
    history,
    memories: [],
    recentVoxaReplies: history.filter((item) => item.role === 'voxa').slice(-2).map((item) => item.content),
  });
}

describe('companion strategy P3', () => {
  it('1. factual question → micro depth, no question, no memories in prompt', () => {
    const strategy = strategyFor("What's 17 x 8?");
    assert.equal(strategy.state.intent, 'factual_question');
    assert.equal(strategy.state.depth, 'micro');
    assert.equal(strategy.state.questionPolicy, 'none');

    const prompt = buildVoxaSystemPrompt({
      userProfile: profile(),
      mode: 'friend',
      memories: [memory('Food', 'sushi')],
      talkIntent: 'factual_question',
      conversationState: strategy.state,
    });
    assert.ok(!prompt.includes('sushi'));
    assert.match(prompt, /Do not end with a question/i);
  });

  it('2. bored → casual, no productivity pivot, no focus chips', () => {
    const strategy = strategyFor("I'm bored");
    assert.equal(strategy.state.intent, 'casual_conversation');
    assert.match(strategy.promptBlock, /Do NOT pivot to goals/i);

    const chips = buildContextualSuggestions({
      talkIntent: strategy.state.intent,
      userMessage: "I'm bored",
      voxaReply: 'Alright.',
      strategy: strategy.state,
    });
    assert.ok(!chips.some((chip) => /focus session/i.test(chip.prompt)));
  });

  it('3. playful high-energy casual message', () => {
    const strategy = strategyFor("lol bro that's crazy 😂");
    assert.equal(strategy.state.tone, 'playful');
    assert.equal(strategy.state.energy, 'high');
    assert.equal(strategy.state.depth, 'short');
  });

  it('4. celebration excited without excessive depth', () => {
    const strategy = strategyFor('I finally got the job!!');
    assert.equal(strategy.state.intent, 'celebration');
    assert.equal(strategy.state.tone, 'excited');
    assert.ok(['short', 'micro', 'normal'].includes(strategy.state.depth));
  });

  it('5. multi-turn decision with recommendation mode', () => {
    const history: Message[] = [
      {
        id: '1',
        conversationId: 'c1',
        role: 'user',
        content: "I've got an assignment due tomorrow.",
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: '2',
        conversationId: 'c1',
        role: 'user',
        content: 'I wanted to go gym tonight.',
        createdAt: '2026-01-01T00:00:01.000Z',
      },
    ];
    const strategy = strategyFor('What should I do?', history);
    assert.equal(strategy.state.decisionMode, true);
    assert.equal(strategy.state.followUp, true);
    assert.match(strategy.promptBlock, /recommendation FIRST/i);
  });

  it('6. second option reference resolution from recent list', () => {
    const history: Message[] = [
      {
        id: '1',
        conversationId: 'c1',
        role: 'voxa',
        content: '1. Pasta\n2. Stir fry\n3. Tacos',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const options = extractListedOptions(history[0].content);
    assert.deepEqual(options, ['Pasta', 'Stir fry', 'Tacos']);

    const hint = resolveReferenceFromHistory('The second one.', history);
    assert.ok(hint?.includes('Stir fry'));
  });

  it('7. just pick one → decision mode without clarification demand', () => {
    const history: Message[] = [
      {
        id: '1',
        conversationId: 'c1',
        role: 'voxa',
        content: 'You could do A or B tonight.',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const strategy = strategyFor('just pick one', history);
    assert.equal(strategy.state.decisionMode, true);
    assert.equal(strategy.state.questionPolicy, 'none');
  });

  it('8. normal frustration is not crisis mode', () => {
    const strategy = strategyFor("I'm annoyed I messed that up.");
    assert.equal(strategy.state.tone, 'frustrated');
    assert.equal(strategy.state.intent, 'emotional_support');
    assert.match(strategy.promptBlock, /Not therapy, not crisis mode/i);
    assert.ok(!strategy.promptBlock.includes('emergency services'));
  });

  it('9. durable conversational preference eligible for memory write', () => {
    const decision = assessMemoryWrite('Keep your replies short from now on.');
    assert.ok(decision?.shouldPersist);
    assert.ok(decision?.tags.includes('conversational_preference'));
    assert.ok(isExplicitConversationalPreferenceMessage('Keep your replies short from now on.'));
  });

  it('10. current detail request overrides stored concise preference', () => {
    const strategy = buildCompanionStrategy({
      talkIntent: classifyTalkIntent('Explain this properly and in detail.'),
      userMessage: 'Explain this properly and in detail.',
      history: [],
      memories: [memory('Style', 'Keep replies short')],
      stylePrefs: { prefersShort: true, prefersBullets: false, prefersDeep: false, prefersHumour: false, prefersExamples: false, prefersStepByStep: false, updatedAt: '2026-01-01T00:00:00.000Z' },
    });
    assert.equal(strategy.state.depth, 'deep');
    assert.equal(strategy.currentOverridesStoredStyle, true);
    assert.match(strategy.promptBlock, /overrides stored style/i);
  });

  it('11. capital of Japan factual gets zero personal memories', () => {
    const food = memory('Food', 'sushi', { category: 'favourites', tags: [] });
    const scored = rankMemories([food], { userMessage: 'What is the capital of Japan?', mode: 'friend' });
    const filtered = filterMemoriesForIntent(scored, 'factual_question', 'What is the capital of Japan?');
    assert.equal(filtered.length, 0);
  });

  it('12. recent assistant questions reduce question policy', () => {
    const strategy = buildCompanionStrategy({
      talkIntent: classifyTalkIntent('yeah'),
      userMessage: 'yeah',
      history: [],
      recentVoxaReplies: ['Want to try that?', 'Should we do it tonight?'],
    });
    assert.equal(strategy.state.questionPolicy, 'none');
  });

  it('13. planning then bored switches strategy and chips immediately', () => {
    const planning = buildContextualSuggestions({
      talkIntent: 'planning',
      userMessage: 'Plan my evening',
      voxaReply: 'Here is a plan.',
      strategy: strategyFor('Plan my evening').state,
    });
    const bored = buildContextualSuggestions({
      talkIntent: 'casual_conversation',
      userMessage: "I'm bored",
      voxaReply: 'Alright.',
      strategy: strategyFor("I'm bored").state,
    });
    assert.ok(planning.some((chip) => /plan|prioritise|steps/i.test(chip.prompt)));
    assert.ok(!bored.some((chip) => /focus session/i.test(chip.prompt)));
  });

  it('14. memory correction supersedes via write policy', () => {
    const hate = assessMemoryWrite('I hate coffee.');
    const like = assessMemoryWrite("Actually I've started liking coffee.");
    assert.ok(hate?.shouldPersist);
    assert.ok(like?.shouldPersist);
    assert.equal(like?.confidenceKind, 'explicit');
  });

  it('15. missing restaurant memory recall intent', () => {
    assert.equal(
      classifyTalkIntent('What was that restaurant I told you about?').intent,
      'memory_recall',
    );
  });

  it('16. safety block still precedes companion strategy context', () => {
    const strategy = strategyFor('Help me plan tomorrow');
    const prompt = buildVoxaSystemPrompt({
      userProfile: profile(),
      mode: 'friend',
      memories: [],
      talkIntent: strategy.state.intent,
      conversationState: strategy.state,
      companionContextExtension: strategy.promptBlock,
    });
    assert.ok(prompt.indexOf('## Safety') < prompt.indexOf('## Active mode'));
    assert.ok(prompt.includes(VOXA_SAFETY.notTherapist));
  });

  it('17. mild bad day frustration is not emergency response guidance', () => {
    const strategy = strategyFor('This day is shit.');
    assert.equal(strategy.state.tone, 'frustrated');
    const quality = buildResponseQualityBlock('emotional_support', false, strategy.state);
    assert.match(quality, /Not crisis mode/i);
  });

  it('18. payload stress test stays under P0 cap', () => {
    const built = buildBoundedGatewayChatMessages({
      mode: 'friend',
      userMessage: 'Help me think through a big week',
      conversationHistory: Array.from({ length: 12 }, (_, index) => ({
        id: `h-${index}`,
        conversationId: 'c1',
        role: index % 2 === 0 ? 'user' : 'voxa',
        content: 'z'.repeat(500),
        createdAt: '2026-01-01T00:00:00.000Z',
      })) as Message[],
      userProfile: profile(),
      memories: Array.from({ length: 8 }, (_, index) =>
        memory(`M${index}`, 'x'.repeat(400), { category: 'goals' }),
      ),
      goals: [],
      upcomingReminders: [],
      talkIntent: 'planning',
      companionContextExtension: 'y'.repeat(2_500),
    } satisfies GenerateReplyInput);
    const total = built.messages.reduce((sum, item) => sum + item.content.length, 0);
    assert.ok(total <= AI_GATEWAY_BUDGETS.maxTotalPayloadChars);
  });

  it('19. repetition check flags repeated opener patterns', () => {
    const strategy = buildCompanionStrategy({
      talkIntent: classifyTalkIntent('ok'),
      userMessage: 'ok',
      history: [],
      recentVoxaReplies: ['That makes sense — here is the next step.', 'That makes sense — try this instead.'],
    });
    const plan = planResponse({
      userMessage: 'ok',
      memories: [],
      goals: [],
      strategy,
      recentVoxaReplies: strategy.recentOpenerPatterns,
    });
    const quality = scoreResponseQuality(
      'That makes sense — sure thing.',
      plan,
      ['That makes sense — here is the next step.', 'That makes sense — try this instead.'],
      strategy,
    );
    assert.ok(quality.issues.includes('repetitive_opener'));
  });

  it('20. strategy diagnostics never log private content', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    const strategy = buildCompanionStrategy({
      talkIntent: classifyTalkIntent('secret message about my password'),
      userMessage: 'secret message about my password',
      history: [],
      memories: [memory('Secret', 'My private detail')],
    });
    logCompanionStrategyDiagnostic({
      strategy,
      contextModules: ['phase9_plan'],
      memoryCount: 1,
      totalPayloadChars: 1200,
    });
    const logs = getFeatureLogs('companion.strategy').map((entry) => entry.detail ?? '').join('\n');
    assert.ok(!logs.includes('password'));
    assert.ok(!logs.includes('private detail'));
    assert.match(logs, /intent=/);
  });

  it('21. polish removes unnecessary trailing question when flagged', () => {
    const polished = polishResponse('Do the assignment first. What do you think?', ['unnecessary_question']);
    assert.ok(!/\?\s*$/.test(polished));
  });

  it('22. production talk still resolves to gateway provider', () => {
    assert.equal(
      resolveTalkAIProvider({ isRelease: true, hasOpenAIKey: false, gatewayConfigured: true }),
      'gateway',
    );
  });
});
