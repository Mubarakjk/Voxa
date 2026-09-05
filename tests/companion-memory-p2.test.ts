import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AI_GATEWAY_BUDGETS } from '../src/config/ai-gateway-budgets';
import { classifyTalkIntent, intentWantsMemories } from '../src/services/ai/companion-intent';
import { buildBoundedGatewayChatMessages } from '../src/services/ai/gateway-context-budget';
import { buildVoxaSystemPrompt } from '../src/services/ai/voxa-system-prompt';
import { buildContextualSuggestions } from '../src/services/chat/contextual-suggestions-service';
import { GenerateReplyInput } from '../src/services/contracts';
import { createDefaultCompanionIdentity } from '../src/constants/companion-identity';
import { createDefaultSubscription } from '../src/types/subscription';
import { Memory, Message, UserProfile } from '../src/types';
import { VOXA_SAFETY } from '../src/constants/safety';
import { extractMemoriesLocally } from '../src/services/memory/local-memory-extractor';
import {
  assessMemoryWrite,
  enrichCandidateDecision,
} from '../src/services/memory/memory-write-policy';
import {
  findSupersessionTargets,
  shouldReplaceInsteadOfMerge,
} from '../src/services/memory/memory-supersession';
import {
  TAG_EXPLICIT,
  TAG_INFERRED,
  TAG_SUPERSEDED,
  isSupersededMemory,
  memoryConfidenceKind,
} from '../src/services/memory/memory-taxonomy';
import {
  filterMemoriesForIntent,
  rankMemories,
  scoreMemoryRelevance,
} from '../src/services/memory/memory-relevance';
import { memoryAgingEngine } from '../src/services/personality/memory-aging-engine';
import { logMemoryRetrieveDiagnostic, logMemoryWriteDiagnostic } from '../src/services/memory/memory-diagnostics';
import { parseUserMemoryCommand } from '../src/services/memory/memory-user-commands';
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

function memory(
  title: string,
  content: string,
  overrides: Partial<Memory> = {},
): Memory {
  return {
    id: `m-${title}`,
    userId: 'user-1',
    category: 'preferences',
    title,
    content,
    mood: 'neutral',
    importance: 3,
    tags: [],
    source: 'conversation',
    useCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function gatewayInput(overrides: Partial<GenerateReplyInput> = {}): GenerateReplyInput {
  return {
    mode: 'friend',
    userMessage: "What's 17 × 8?",
    conversationHistory: [],
    userProfile: profile(),
    memories: [],
    goals: [],
    upcomingReminders: [],
    ...overrides,
  };
}

describe('companion memory P2', () => {
  it('1. transient text not remembered', () => {
    const decision = assessMemoryWrite('lol whatever');
    assert.equal(decision, null);
    assert.deepEqual(extractMemoriesLocally({
      userMessage: 'lol',
      voxaReply: 'haha',
      mode: 'friend',
      existingMemories: [],
    }), []);
  });

  it('2. explicit preference remembered', () => {
    const decision = assessMemoryWrite('I prefer short answers from you');
    assert.ok(decision?.shouldPersist);
    assert.equal(decision?.confidenceKind, 'explicit');
    assert.ok(decision!.importance >= 3);
  });

  it('3. explicit remember this remembered', () => {
    const decision = assessMemoryWrite('Remember that my dog is called Max');
    assert.ok(decision?.shouldPersist);
    assert.equal(decision?.importance, 4);
    assert.ok(decision?.tags.includes(TAG_EXPLICIT));
  });

  it('4. changed preference supersedes previous value', () => {
    const existing = [
      memory('Training routine', 'I normally train in the mornings', {
        category: 'fitness',
        tags: [TAG_EXPLICIT],
      }),
    ];
    const decision = assessMemoryWrite("I've switched to training after work now, not mornings");
    assert.ok(decision?.shouldPersist);
    const { target } = findSupersessionTargets(existing, decision!);
    assert.ok(target);
    assert.ok(shouldReplaceInsteadOfMerge(decision!, target!));
  });

  it('5. expired event excluded', () => {
    const expired = memory('Interview', 'My interview is tomorrow', {
      category: 'moments',
      expiresAt: '2020-01-01T00:00:00.000Z',
    });
    const active = memoryAgingEngine.filterActive([expired]);
    assert.equal(active.length, 0);
    const ranked = rankMemories([expired], { userMessage: 'interview', mode: 'friend' });
    assert.equal(ranked.length, 0);
  });

  it('6. unrelated memory excluded for factual question', () => {
    const food = memory('Favourite food', 'sushi', { category: 'favourites' });
    const scored = rankMemories([food], { userMessage: "What's 17 × 8?", mode: 'friend' });
    const filtered = filterMemoriesForIntent(scored, 'factual_question', "What's 17 × 8?");
    assert.equal(filtered.length, 0);
  });

  it('7. factual question receives no memories in prompt', () => {
    const prompt = buildVoxaSystemPrompt({
      userProfile: profile(),
      mode: 'friend',
      memories: [memory('Food', 'sushi', { category: 'favourites' })],
      talkIntent: 'factual_question',
    });
    assert.ok(!prompt.includes('Relevant memories'));
    assert.ok(!prompt.includes('sushi'));
  });

  it('8. relevant goal retrieved for planning', () => {
    const goalMem = memory('App goal', 'Finish my app this month', { category: 'goals', importance: 4 });
    const scored = rankMemories([goalMem], {
      userMessage: "I've got an hour free. What should I do?",
      mode: 'friend',
    });
    const filtered = filterMemoriesForIntent(scored, 'planning', "I've got an hour free");
    assert.ok(filtered.some((item) => item.content.includes('app')));
  });

  it('9. missing memory recall intent classified', () => {
    const result = classifyTalkIntent('What was the name of the restaurant I told you about?');
    assert.equal(result.intent, 'memory_recall');
  });

  it('10. recent context intent without permanent memory', () => {
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
        role: 'voxa',
        content: 'That is tight — what is the assignment?',
        createdAt: '2026-01-01T00:00:01.000Z',
      },
    ];
    const result = classifyTalkIntent('What should I do?', history);
    assert.equal(result.referencesRecentTurns, true);
  });

  it('11. memory recall intent wants memories', () => {
    assert.equal(intentWantsMemories('memory_recall'), true);
  });

  it('12. low-confidence inference is not presented as known', () => {
    const inferred = memory('Maybe gym', 'User might train evenings', { tags: [TAG_INFERRED], confidence: 0.4 });
    assert.equal(memoryConfidenceKind(inferred), 'inferred');
    const prompt = buildVoxaSystemPrompt({
      userProfile: profile(),
      mode: 'friend',
      memories: [inferred],
      talkIntent: 'planning',
    });
    assert.match(prompt, /inferred/i);
  });

  it('13. duplicate memories merge via supersession slot', () => {
    const existing = [memory('Training', 'Train after work', { category: 'fitness' })];
    const decision = assessMemoryWrite('I usually train after work');
    const { target } = findSupersessionTargets(existing, decision!);
    assert.ok(target);
  });

  it('14. stale memories lose ranking vs fresh explicit', () => {
    const stale = memory('Old routine', 'Morning training', {
      category: 'fitness',
      updatedAt: '2020-01-01T00:00:00.000Z',
      importance: 3,
    });
    const fresh = memory('New routine', 'Evening training after work', {
      category: 'fitness',
      updatedAt: '2026-08-01T00:00:00.000Z',
      importance: 4,
      tags: [TAG_EXPLICIT],
    });
    const staleScore = scoreMemoryRelevance(stale, {
      userMessage: 'When do I train?',
      mode: 'friend',
    });
    const freshScore = scoreMemoryRelevance(fresh, {
      userMessage: 'When do I train?',
      mode: 'friend',
    });
    assert.ok(freshScore > staleScore);
  });

  it('15. explicit memory outranks inferred', () => {
    const inferred = memory('Training guess', 'Maybe trains mornings', {
      category: 'fitness',
      tags: [TAG_INFERRED],
    });
    const explicit = memory('Training fact', 'Trains after work', {
      category: 'fitness',
      tags: [TAG_EXPLICIT],
    });
    const inferredScore = scoreMemoryRelevance(inferred, { userMessage: 'gym tonight', mode: 'friend' });
    const explicitScore = scoreMemoryRelevance(explicit, { userMessage: 'gym tonight', mode: 'friend' });
    assert.ok(explicitScore > inferredScore);
  });

  it('16. casual response does not use planning context modules heavily', () => {
    const intent = classifyTalkIntent("I'm bored").intent;
    assert.equal(intent, 'casual_conversation');
  });

  it('17. suggestions update after intent changes to bored', () => {
    const planning = buildContextualSuggestions({
      talkIntent: 'planning',
      userMessage: 'Help me plan my evening',
      voxaReply: 'Let us map it out.',
    });
    const bored = buildContextualSuggestions({
      talkIntent: 'casual_conversation',
      userMessage: "I'm bored",
      voxaReply: 'Alright, let us fix that.',
    });
    assert.ok(planning.some((item) => /focus/i.test(item.label)));
    assert.ok(!bored.some((item) => /focus session/i.test(item.label)));
  });

  it('18. bored suggestions exclude focus-session action', () => {
    const bored = buildContextualSuggestions({
      talkIntent: 'casual_conversation',
      userMessage: "I'm bored",
      voxaReply: 'Pick something fun.',
    });
    assert.ok(!bored.some((item) => /25-minute focus/i.test(item.prompt)));
  });

  it('19. planning suggestions can contain focus action', () => {
    const planning = buildContextualSuggestions({
      talkIntent: 'planning',
      userMessage: 'Plan my study block',
      voxaReply: 'Here is a simple plan.',
    });
    assert.ok(planning.some((item) => /focus session/i.test(item.prompt)));
  });

  it('20. diagnostics never include memory text', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    logMemoryRetrieveDiagnostic({
      intent: 'planning',
      candidates: 5,
      active: 4,
      selected: [memory('Secret', 'My private detail', { category: 'people' })],
    });
    logMemoryWriteDiagnostic({
      action: 'create',
      decision: assessMemoryWrite('Remember that my password is secret')!,
    });
    const logs = getFeatureLogs('memory').map((entry) => `${entry.feature} ${entry.detail ?? ''}`).join('\n');
    assert.ok(!logs.includes('private detail'));
    assert.ok(!logs.includes('password'));
    assert.ok(!logs.includes('Secret'));
    assert.match(logs, /selected=1/);
  });

  it('21. safety instructions remain before companion context', () => {
    const prompt = buildVoxaSystemPrompt({
      userProfile: profile(),
      mode: 'friend',
      memories: [memory('Routine', 'Evening gym', { category: 'fitness' })],
      talkIntent: 'planning',
      companionContextExtension: '## Extra\nMore context here',
    });
    const safetyIndex = prompt.indexOf('## Safety');
    const memoryIndex = prompt.indexOf('## Relevant memories');
    assert.ok(safetyIndex >= 0);
    assert.ok(memoryIndex > safetyIndex);
    assert.ok(prompt.includes(VOXA_SAFETY.notTherapist));
  });

  it('22. payload remains under existing P0 cap', () => {
    const bigMemories = Array.from({ length: 8 }, (_, index) =>
      memory(`Memory ${index}`, 'x'.repeat(400), { category: 'goals', importance: 5 }),
    );
    const built = buildBoundedGatewayChatMessages(
      gatewayInput({
        userMessage: 'Help me plan my week with lots of context please',
        memories: bigMemories,
        talkIntent: 'planning',
        companionContextExtension: 'y'.repeat(2_500),
        conversationHistory: Array.from({ length: 12 }, (_, index) => ({
          id: `h-${index}`,
          conversationId: 'c1',
          role: index % 2 === 0 ? 'user' : 'voxa',
          content: 'z'.repeat(500),
          createdAt: '2026-01-01T00:00:00.000Z',
        })) as Message[],
      }),
    );
    const total = built.messages.reduce((sum, item) => sum + item.content.length, 0);
    assert.ok(total <= AI_GATEWAY_BUDGETS.maxTotalPayloadChars);
  });

  it('23. current user message not duplicated in bounded builder', () => {
    const built = buildBoundedGatewayChatMessages(
      gatewayInput({ userMessage: 'Hello once' }),
    );
    const userMessages = built.messages.filter((item) => item.role === 'user' && item.content.includes('Hello once'));
    assert.equal(userMessages.length, 1);
  });

  it('24. gateway routing unchanged for production talk', () => {
    const provider = resolveTalkAIProvider({
      isRelease: true,
      hasOpenAIKey: false,
      gatewayConfigured: true,
    });
    assert.equal(provider, 'gateway');
  });

  it('25. superseded memories excluded from ranking', () => {
    const superseded = memory('Old', 'Morning gym', {
      category: 'fitness',
      tags: [TAG_SUPERSEDED],
    });
    assert.ok(isSupersededMemory(superseded));
    const ranked = rankMemories([superseded], { userMessage: 'gym', mode: 'friend' });
    assert.equal(ranked.length, 0);
  });

  it('26. enrichCandidateDecision skips low importance filler', () => {
    const decision = enrichCandidateDecision(
      {
        category: 'emotional',
        title: 'Emotional note',
        content: "I'm eating pizza right now",
        importance: 1,
        mood: 'neutral',
        tags: [],
      },
      "I'm eating pizza right now",
    );
    assert.equal(decision.shouldPersist, false);
  });

  it('27. forget command parses', () => {
    assert.deepEqual(parseUserMemoryCommand('Forget that'), { type: 'forget_last_relevant', hint: undefined });
  });

  it('28. event memory gets expiry on create enrichment', () => {
    const enriched = memoryAgingEngine.enrichOnCreate({
      userId: 'user-1',
      category: 'moments',
      title: 'Interview',
      content: 'My interview is tomorrow',
    });
    assert.ok(enriched.expiresAt);
  });
});
