import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { classifyTalkIntent, intentWantsMemories } from '../src/services/ai/companion-intent';
import { buildCompanionStrategy } from '../src/services/ai/companion-strategy';
import { buildResponseQualityBlock } from '../src/services/ai/companion-response-quality';
import { selectContextModules } from '../src/services/ai/companion-context-router';
import { adaptiveIntelligenceService } from '../src/services/intelligence/adaptive-intelligence-service';
import {
  buildTurnIntelligencePlan,
  resolveAuthoritativeTalkMode,
  resolveMemoryPolicy,
  resolveRelationshipTone,
} from '../src/services/ai/turn-intelligence-plan';
import { talkIntentSkipsMemoryRetrieval } from '../src/services/chat/talk-critical-path';
import { adaptiveModeToCompanionMode } from '../src/types/phase3-intelligence';
import { createDefaultCompanionIdentity } from '../src/constants/companion-identity';
import { createDefaultSubscription } from '../src/types/subscription';
import { createDefaultCompanionControls } from '../src/types/relationship-personality';
import { CompanionModeId, UserProfile } from '../src/types';
import { talkPerf } from '../src/utils/talk-perf';

function profile(overrides: Partial<UserProfile['preferences']> = {}): UserProfile {
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
      companionControls: createDefaultCompanionControls(),
      ...overrides,
    },
    companion: { defaultMode: 'friend', lastUsedMode: 'friend' },
    companionIdentity: createDefaultCompanionIdentity(),
    subscription: createDefaultSubscription(),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function planFor(
  userMessage: string,
  selectedMode: CompanionModeId = 'friend',
  extras: {
    conversationCount?: number;
    daysTogether?: number;
    userProfile?: UserProfile;
  } = {},
) {
  const talkIntent = classifyTalkIntent(userMessage);
  const strategy = buildCompanionStrategy({
    talkIntent,
    userMessage,
    history: [],
    memories: [],
  });
  return buildTurnIntelligencePlan({
    userMessage,
    selectedMode,
    strategy,
    userProfile: extras.userProfile ?? profile(),
    relationship: {
      conversationCount: extras.conversationCount ?? 0,
      daysTogether: extras.daysTogether ?? 0,
    },
  });
}

describe('V1.1 Phase 1 turn intelligence', () => {
  it('A. factual: skip memory, no question, humour off', () => {
    const plan = planFor("What's 17 x 24?");
    assert.equal(plan.intent, 'factual_question');
    assert.equal(plan.stance, 'inform');
    assert.equal(plan.memoryPolicy, 'skip');
    assert.equal(plan.questionPolicy, 'none');
    assert.equal(plan.humour, 0);
    assert.equal(plan.humourSuppressed, true);
    assert.equal(plan.depth, 'micro');
    assert.equal(talkIntentSkipsMemoryRetrieval(plan.intent), true);
    assert.equal(intentWantsMemories(plan.intent), false);
    assert.match(plan.promptBlock, /Question policy is NONE/i);
    assert.match(plan.promptBlock, /last sentence must be a statement/i);
  });

  it('B. casual: micro/short and playful permitted', () => {
    const plan = planFor("yo 😭 you won't believe what happened");
    assert.ok(['casual_conversation', 'unknown'].includes(plan.intent));
    assert.ok(['micro', 'short'].includes(plan.depth));
    assert.ok(plan.humour >= 1);
    assert.equal(plan.humourSuppressed, false);
    assert.ok(['listen', 'support'].includes(plan.stance));
    assert.match(plan.promptBlock, /Humour: (1|2|3)/);
  });

  it('C. celebration: celebrate stance, not coaching', () => {
    const plan = planFor('I finally passed my driving test');
    assert.equal(plan.intent, 'celebration');
    assert.equal(plan.stance, 'celebrate');
    assert.ok(plan.humour >= 1);
    assert.equal(plan.humourSuppressed, false);
    assert.equal(plan.questionPolicy, 'none');
    assert.ok(['micro', 'short'].includes(plan.depth));
    assert.match(plan.promptBlock, /do not pivot into coaching/i);
    assert.match(plan.promptBlock, /Do not ask how they feel/i);
    assert.match(plan.promptBlock, /last sentence must be a statement/i);
    assert.ok(!/Stance: coach/i.test(plan.promptBlock));
  });

  it('D. planning: plan stance, normal or deep', () => {
    const plan = planFor('Help me organise everything I need to do today');
    assert.equal(plan.intent, 'planning');
    assert.equal(plan.stance, 'plan');
    assert.ok(['normal', 'deep'].includes(plan.depth));
    assert.equal(plan.memoryPolicy, 'recall');
  });

  it('E. listening: vent without coaching', () => {
    const plan = planFor("I don't want advice, I just need to vent");
    assert.equal(plan.stance, 'listen');
    assert.equal(plan.questionPolicy, 'none');
    assert.match(plan.promptBlock, /Do not coach/i);
    assert.match(plan.promptBlock, /I hear you/i);
    assert.match(plan.promptBlock, /I'm here if you want to vent/i);
  });

  it('F. challenge: be real / procrastinating', () => {
    const plan = planFor('Be real with me, am I procrastinating?');
    assert.equal(plan.stance, 'challenge');
    assert.match(plan.promptBlock, /be direct and honest/i);
    assert.match(plan.promptBlock, /Lead with a clear answer/i);
    assert.match(plan.promptBlock, /it sounds like/i);
  });

  it('G. serious grief: humour forced to 0', () => {
    const plan = planFor('My dad died yesterday and I cannot stop thinking about the funeral.');
    assert.equal(plan.humour, 0);
    assert.equal(plan.humourSuppressed, true);
    assert.match(plan.promptBlock, /Humour: none/i);
    assert.ok(!/strong banter/i.test(plan.promptBlock));
    assert.ok(!/playful is permitted/i.test(plan.promptBlock));
  });

  it('H. AdaptiveMode cannot override the selected chat mode', () => {
    const inferred = adaptiveModeToCompanionMode('sports_friend');
    assert.equal(resolveAuthoritativeTalkMode('coach'), 'coach');
    assert.equal(resolveAuthoritativeTalkMode('teacher'), 'teacher');
    assert.notEqual(resolveAuthoritativeTalkMode('coach'), inferred);

    const plan = planFor('We smashed the match today, that goal was insane', 'coach');
    assert.equal(plan.selectedMode, 'coach');
    assert.match(plan.promptBlock, /Selected mode: coach/i);
    assert.match(plan.promptBlock, /must not replace it/i);

    const adaptive = adaptiveIntelligenceService.toPromptExtension(
      {
        modeLabel: 'sports_friend',
        companionMode: 'friend',
        tone: 'enthusiastic sports buddy',
        lengthHint: 'brief',
        empathyLevel: 'medium',
        questionStyle: 'minimal',
        memoryEmphasis: false,
        relationshipCallback: false,
        guidance: ['Light humour is welcome if it fits the moment.'],
      },
      '',
    );
    assert.ok(!/Active mode:/i.test(adaptive));
    assert.match(adaptive, /do not override the user-selected chat mode/i);
    assert.ok(!/Light humour is welcome/i.test(adaptive));
  });

  it('I. factual fast path stays structurally skip-only', () => {
    const plan = planFor("What's 17 x 24?");
    assert.equal(plan.memoryPolicy, 'skip');
    assert.equal(talkIntentSkipsMemoryRetrieval(plan.intent), true);
    const modules = selectContextModules(plan.intent, "What's 17 x 24?");
    assert.deepEqual(modules, ['phase4_quality', 'phase9_plan']);
    assert.ok(!modules.includes('companion_core'));
    assert.ok(!modules.includes('phase11_dashboard'));
  });

  it('J. simple factual answers do not require a follow-up question', () => {
    const plan = planFor('How much is 15% of 200?');
    assert.equal(plan.questionPolicy, 'none');
    assert.equal(plan.stance, 'inform');
  });

  it('memoryPolicy matches existing skip/recall contracts', () => {
    assert.equal(resolveMemoryPolicy('factual_question'), 'skip');
    assert.equal(resolveMemoryPolicy('app_action_request'), 'skip');
    assert.equal(resolveMemoryPolicy('memory_recall'), 'recall');
    assert.equal(resolveMemoryPolicy('casual_conversation'), 'high_confidence_only');
  });

  it('relationship tone uses verified counts only', () => {
    assert.equal(resolveRelationshipTone({ conversationCount: 2, daysTogether: 3 }), 'new_user');
    assert.equal(resolveRelationshipTone({ conversationCount: 20, daysTogether: 30 }), 'familiar');
    assert.equal(resolveRelationshipTone({ conversationCount: 90, daysTogether: 10 }), 'long_term');
    const newUser = planFor('hey', 'friend', { conversationCount: 1, daysTogether: 1 });
    assert.equal(newUser.relationshipTone, 'new_user');
    assert.match(newUser.promptBlock, /getting-to-know-you/i);
    assert.match(newUser.promptBlock, /Never claim human emotions/i);
  });

  it('medical / emergency language suppresses humour even with a playful studio setting', () => {
    const playful = profile();
    playful.companionIdentity = { ...createDefaultCompanionIdentity(), personalityStyle: 'playful' };
    playful.preferences.companionControls = { ...createDefaultCompanionControls(), humour: 1 };
    const plan = planFor('I am in A&E with chest pain and they mentioned a heart attack.', 'friend', {
      userProfile: playful,
    });
    assert.equal(plan.humour, 0);
    assert.equal(plan.humourSuppressed, true);
  });

  it('turn-plan timing helper never logs message text', () => {
    const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;
    const lines: string[] = [];
    const originalLog = console.log;
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(' '));
    };
    try {
      talkPerf('turn-plan', 4);
      assert.equal(lines[0], '[TALK PERF] turn-plan: 4ms');
      assert.ok(!lines.join(' ').includes('password'));
    } finally {
      console.log = originalLog;
      (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
    }
  });

  it('1.1 celebration questionPolicy none is operational, not optional', () => {
    const plan = planFor('I finally passed my driving test');
    assert.equal(plan.questionPolicy, 'none');
    assert.match(plan.promptBlock, /unless a question is required for safety/i);
    assert.match(plan.promptBlock, /Do not ask how they feel/i);
    assert.match(plan.promptBlock, /Do not summarise the achievement/i);
    assert.ok(!/optionally add one useful line/i.test(plan.promptBlock));
  });

  it('1.1 Friend vs Coach vs Reflection voice actually differs', () => {
    const message = 'I finally passed my driving test';
    const friend = planFor(message, 'friend');
    const coach = planFor(message, 'coach');
    const listener = planFor(message, 'reflection');
    assert.match(friend.promptBlock, /Mode voice \(Friend\)/i);
    assert.match(coach.promptBlock, /Mode voice \(Coach\)/i);
    assert.match(listener.promptBlock, /Mode voice \(Calm Listener/i);
    assert.notEqual(friend.promptBlock, coach.promptBlock);
    assert.notEqual(friend.promptBlock, listener.promptBlock);
    assert.match(friend.promptBlock, /close friend/i);
    assert.match(coach.promptBlock, /Accountability/i);
    assert.match(listener.promptBlock, /soft and unhurried/i);
  });

  it('1.1 casual hook bans stock "I\'m all ears" default', () => {
    const plan = planFor("Yo you wont belive what just happened");
    assert.ok(['micro', 'short'].includes(plan.depth));
    assert.match(plan.promptBlock, /stock assistant language/i);
    assert.match(plan.promptBlock, /Mode voice \(Friend\)/i);
  });

  it('1.1 planning still allows a useful question when organising', () => {
    const plan = planFor("I've got bare stuff to do today help me organise it");
    assert.equal(plan.stance, 'plan');
    assert.equal(plan.questionPolicy, 'useful');
    assert.match(plan.promptBlock, /information is required/i);
  });

  it('1.1 keep-it-short override still binds', () => {
    const plan = planFor('Keep it short though');
    assert.ok(['micro', 'short'].includes(plan.depth));
  });

  it('1.1 quality block no longer invites a celebration closer question', () => {
    const plan = planFor('I finally passed my driving test');
    const quality = buildResponseQualityBlock('celebration', false, plan.state);
    assert.match(quality, /Do not end with a question on this turn/i);
    assert.match(quality, /I'm all ears/i);
    assert.ok(!/optionally add one useful line/i.test(quality));
  });
});
