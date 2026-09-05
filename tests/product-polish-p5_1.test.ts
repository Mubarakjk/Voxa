import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { classifyTalkIntent } from '../src/services/ai/companion-intent';
import { buildCompanionStrategy } from '../src/services/ai/companion-strategy';
import { buildContextualSuggestions, resolveTurnSuggestionPrompts } from '../src/services/chat/contextual-suggestions-service';
import { containsLegalPlaceholderCopy, PRIVACY_POLICY_SECTIONS } from '../src/constants/legal-content';

describe('P5.1 release pre-flight', () => {
  it('classifies habit recall questions as memory_recall, not decision_support', () => {
    const recent = [
      {
        id: '1',
        conversationId: 'c1',
        role: 'user' as const,
        content: 'I have an assignment due tomorrow',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const result = classifyTalkIntent('When do I normally train?', recent);
    assert.equal(result.intent, 'memory_recall');
  });

  it('memory recall does not produce decision suggestion chips', () => {
    const chips = buildContextualSuggestions({
      talkIntent: 'memory_recall',
      userMessage: 'When do I normally train?',
      voxaReply: 'You normally train after work.',
      strategy: buildCompanionStrategy({
        talkIntent: classifyTalkIntent('When do I normally train?'),
        userMessage: 'When do I normally train?',
        history: [],
      }).state,
    });
    assert.ok(!chips.some((chip) => /pick one for me|compare them|biggest downside/i.test(chip.label)));
  });

  it('bored casual strategy blocks productivity pivot and ends without required questions', () => {
    const strategy = buildCompanionStrategy({
      talkIntent: classifyTalkIntent("I'm bored"),
      userMessage: "I'm bored",
      history: [],
    });
    assert.equal(strategy.state.intent, 'casual_conversation');
    assert.equal(strategy.state.questionPolicy, 'none');
    assert.match(strategy.promptBlock, /Do NOT pivot to goals/i);
    assert.match(strategy.promptBlock, /reply like a close friend/i);
  });

  it('bored suggestions stay playful, not focus-session', () => {
    const chips = buildContextualSuggestions({
      talkIntent: 'casual_conversation',
      userMessage: "I'm bored",
      voxaReply: 'Say less — want something random?',
      strategy: buildCompanionStrategy({
        talkIntent: classifyTalkIntent("I'm bored"),
        userMessage: "I'm bored",
        history: [],
      }).state,
    });
    assert.ok(chips.some((chip) => /random|play|talk/i.test(chip.label)));
    assert.ok(!chips.some((chip) => /focus session/i.test(chip.label)));
  });

  it('empty contextual chips are not replaced by fallback coach prompts', () => {
    const prompts = resolveTurnSuggestionPrompts({
      contextual: [],
      fallback: ['Hold me accountable gently', 'Break that into steps'],
    });
    assert.deepEqual(prompts, []);
  });

  it('in-app legal copy has no developer placeholder instructions', () => {
    const combined = PRIVACY_POLICY_SECTIONS.map((s) => `${s.title} ${s.body}`).join('\n');
    assert.equal(containsLegalPlaceholderCopy(combined), false);
  });
});
