import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { classifyTalkIntent } from '../src/services/ai/companion-intent';
import { buildCompanionStrategy } from '../src/services/ai/companion-strategy';
import { selectContextModules } from '../src/services/ai/companion-context-router';
import {
  buildTurnIntelligencePlan,
  inferSessionStyleSignals,
  TURN_INTELLIGENCE_END,
} from '../src/services/ai/turn-intelligence-plan';
import {
  buildContextualSuggestions,
  playfulChipsForbidden,
  resolveTurnSuggestionPrompts,
} from '../src/services/chat/contextual-suggestions-service';
import {
  beginComposerEdit,
  cancelComposerEdit,
  editMutatesHistoryImmediately,
  emptyEditMaySend,
  messageActionsForRole,
  regenerateIsSafeForV1,
  sharePayloadForMessage,
  shouldCloseMessageActionMenu,
  speakActionReusesExistingSpeechPath,
  userMessageActions,
  voxaMessageActions,
} from '../src/services/chat/message-actions';
import { createDefaultCompanionIdentity } from '../src/constants/companion-identity';
import { createDefaultSubscription } from '../src/types/subscription';
import { createDefaultCompanionControls } from '../src/types/relationship-personality';
import { CompanionModeId, Message, UserProfile } from '../src/types';

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
      companionControls: createDefaultCompanionControls(),
    },
    companion: { defaultMode: 'friend', lastUsedMode: 'friend' },
    companionIdentity: createDefaultCompanionIdentity(),
    subscription: createDefaultSubscription(),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function userTurn(content: string, id = 'u1'): Message {
  return {
    id,
    conversationId: 'c1',
    role: 'user',
    content,
    mode: 'friend',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'sent',
  };
}

function planFor(userMessage: string, selectedMode: CompanionModeId = 'friend', history: Message[] = []) {
  const talkIntent = classifyTalkIntent(userMessage);
  const strategy = buildCompanionStrategy({
    talkIntent,
    userMessage,
    history,
    memories: [],
  });
  return buildTurnIntelligencePlan({
    userMessage,
    selectedMode,
    strategy,
    userProfile: profile(),
    history,
  });
}

describe('Talk excellence pass', () => {
  it('A. Friend casual expression instructions are conversational, not support-script', () => {
    const plan = planFor("Yo you wont believe what just happened");
    assert.match(plan.promptBlock, /Mode voice \(Friend\)/i);
    assert.match(plan.promptBlock, /fragments/i);
    assert.match(plan.promptBlock, /not an assistant/i);
    assert.match(plan.promptBlock, /Complete prose is not required/i);
    assert.match(plan.promptBlock, /Do not copy typos/i);
    assert.ok(plan.promptBlock.includes(TURN_INTELLIGENCE_END));
  });

  it('B. Celebration is a micro reaction with no follow-up question', () => {
    const plan = planFor('I finally passed my driving test');
    assert.equal(plan.stance, 'celebrate');
    assert.equal(plan.questionPolicy, 'none');
    assert.ok(['micro', 'short'].includes(plan.depth));
    assert.match(plan.promptBlock, /REACT/i);
    assert.match(plan.promptBlock, /Do not summarise the achievement/i);
    assert.match(plan.promptBlock, /last sentence must be a statement/i);
    assert.match(plan.promptBlock, /what happened/i);
  });

  it('C. Factual remains concise', () => {
    const plan = planFor('17x24');
    assert.equal(plan.intent, 'factual_question');
    assert.equal(plan.stance, 'inform');
    assert.equal(plan.depth, 'micro');
    assert.equal(plan.questionPolicy, 'none');
    assert.equal(plan.humourSuppressed, true);
    assert.match(plan.promptBlock, /answer directly/i);
  });

  it('D. Listen stance avoids forced coaching', () => {
    const plan = planFor("I don't want advice, I just need to vent");
    assert.equal(plan.stance, 'listen');
    assert.match(plan.promptBlock, /Do not coach/i);
    assert.match(plan.promptBlock, /rejected advice/i);
  });

  it('E. Challenge answers first', () => {
    const plan = planFor('Be real with me, am I procrastinating?');
    assert.equal(plan.stance, 'challenge');
    assert.match(plan.promptBlock, /Lead with a clear answer/i);
    assert.match(plan.promptBlock, /asked for directness/i);
  });

  it('F. Serious medical humour stays suppressed', () => {
    const plan = planFor("I've been having serious chest pain should I ignore it");
    assert.equal(plan.humour, 0);
    assert.equal(plan.humourSuppressed, true);
    assert.match(plan.promptBlock, /Humour: none/i);
    assert.match(plan.promptBlock, /This turn is serious/i);
  });

  it('G. Explicit short preference persists for the session', () => {
    const history = [userTurn('keep it short')];
    const plan = planFor('Can you help me think about tomorrow', 'friend', history);
    assert.equal(plan.sessionStyle.askedShort, true);
    assert.ok(['micro', 'short'].includes(plan.depth));
    assert.match(plan.promptBlock, /asked for short replies this session/i);
  });

  it('H. Modes actually differ without becoming different characters', () => {
    const message = 'Help me plan my evening';
    const friend = planFor(message, 'friend');
    const coach = planFor(message, 'coach');
    const listener = planFor(message, 'reflection');
    const teacher = planFor(message, 'teacher');
    const assistant = planFor(message, 'assistant');
    assert.match(friend.promptBlock, /Mode voice \(Friend\)/i);
    assert.match(coach.promptBlock, /Mode voice \(Coach\)/i);
    assert.match(listener.promptBlock, /Calm Listener/i);
    assert.match(teacher.promptBlock, /Mode voice \(Teacher\)/i);
    assert.match(assistant.promptBlock, /Mode voice \(Assistant\)/i);
    assert.notEqual(friend.promptBlock, coach.promptBlock);
    assert.notEqual(teacher.promptBlock, assistant.promptBlock);
    assert.match(coach.promptBlock, /same Voxa/i);
  });

  it('I. No extra generation or network stage is introduced', () => {
    const started = Date.now();
    const plan = planFor("Yo you wont believe what just happened");
    const elapsed = Date.now() - started;
    assert.ok(elapsed < 80, `local plan took ${elapsed}ms`);
    const modules = selectContextModules(plan.intent, "Yo you wont believe what just happened");
    assert.ok(!modules.includes('open_loops'));
    assert.equal(typeof plan.promptBlock, 'string');
  });

  it('J. User message actions are Edit, Select text, Share', () => {
    assert.deepEqual(userMessageActions(), ['edit', 'select_text', 'share']);
    assert.deepEqual(messageActionsForRole('user'), ['edit', 'select_text', 'share']);
    assert.ok(!userMessageActions().includes('copy'));
  });

  it('K. Voxa message actions are Select text, Speak, Share — no regenerate', () => {
    assert.deepEqual(voxaMessageActions(), ['select_text', 'speak', 'share']);
    assert.equal(regenerateIsSafeForV1(), false);
    assert.ok(!voxaMessageActions().includes('edit'));
    assert.ok(!voxaMessageActions().includes('copy'));
  });

  it('L. Edit does not immediately mutate history', () => {
    const state = beginComposerEdit({
      messageId: 'msg-1',
      messageText: 'original user line',
      currentComposer: 'draft in progress',
    });
    assert.equal(editMutatesHistoryImmediately(), false);
    assert.equal(state.originalText, 'original user line');
    assert.equal(state.draftBeforeEdit, 'draft in progress');
    assert.equal(cancelComposerEdit(state).composer, 'draft in progress');
    assert.equal(emptyEditMaySend('   '), false);
    assert.equal(emptyEditMaySend('changed text'), true);
  });

  it('M. Share uses the exact message text', () => {
    const text = '17 times 24 is 408.';
    assert.deepEqual(sharePayloadForMessage(text), { message: text });
  });

  it('N. Speak reuses the existing speech path', () => {
    assert.equal(speakActionReusesExistingSpeechPath(), true);
  });

  it('O. Contextual chips respect stance', () => {
    const celebrate = buildContextualSuggestions({
      talkIntent: 'celebration',
      userMessage: 'I finally passed my driving test',
      voxaReply: 'Huge.',
      stance: 'celebrate',
    });
    assert.deepEqual(celebrate, []);

    const planning = buildContextualSuggestions({
      talkIntent: 'planning',
      userMessage: 'Help me organise today',
      voxaReply: 'Here is a sequence.',
      stance: 'plan',
    });
    assert.ok(planning.some((chip) => /Make me a plan/i.test(chip.label)));
    assert.ok(planning.some((chip) => /Prioritise/i.test(chip.label)));
    assert.ok(planning.some((chip) => /steps/i.test(chip.label)));
    assert.ok(!planning.some((chip) => /laugh/i.test(chip.label)));

    const casual = buildContextualSuggestions({
      talkIntent: 'casual_conversation',
      userMessage: "Yo you wont believe what just happened",
      voxaReply: 'Wait what.',
      stance: 'listen',
    });
    assert.deepEqual(casual, []);
    assert.ok(!casual.some((chip) => /Tell me more|Make me laugh|Change the topic/i.test(chip.label)));
  });

  it('P. Safety context cannot surface playful chips', () => {
    const medical = "I've been having serious chest pain should I ignore it";
    assert.equal(playfulChipsForbidden({ userMessage: medical, humourSuppressed: true }), true);
    const chips = buildContextualSuggestions({
      talkIntent: 'emotional_support',
      userMessage: medical,
      voxaReply: 'Please get urgent medical help now.',
      stance: 'support',
      humourSuppressed: true,
    });
    assert.equal(chips.length, 0);
    assert.ok(!chips.some((chip) => /laugh|random|play/i.test(chip.label)));
    assert.deepEqual(
      resolveTurnSuggestionPrompts({
        contextual: chips,
        fallback: ['Make me laugh', 'Tell me more'],
      }),
      [],
    );
  });

  it('Q. Menu dismisses on outside tap or action, not merely on scroll', () => {
    assert.equal(shouldCloseMessageActionMenu('outside_press'), true);
    assert.equal(shouldCloseMessageActionMenu('action_selected'), true);
    assert.equal(shouldCloseMessageActionMenu('scroll_begin'), false);
  });

  it('session tiny-casual signals ask for fragments, not paragraphs', () => {
    const history = [userTurn('yo'), userTurn('lol wait')];
    const signals = inferSessionStyleSignals('nah', history);
    assert.equal(signals.recentTinyCasual, true);
    const plan = planFor('nah', 'friend', history);
    assert.match(plan.promptBlock, /tiny casual messages/i);
  });

  it('memory expression is natural when recall is allowed', () => {
    const plan = planFor('I might go boxing later');
    assert.notEqual(plan.memoryPolicy, 'skip');
    assert.match(plan.promptBlock, /you previously told me/i);
    assert.match(plan.promptBlock, /Never fabricate a callback/i);
  });

  it('listen vent chips stay empty', () => {
    const chips = buildContextualSuggestions({
      talkIntent: 'emotional_support',
      userMessage: "I don't want advice, I just need to vent",
      voxaReply: 'Okay. I am here.',
      stance: 'listen',
    });
    assert.deepEqual(chips, []);
  });
});
