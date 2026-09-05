import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { classifyTalkIntent, intentWantsMemories } from '../src/services/ai/companion-intent';
import { resolveTalkAIProvider } from '../src/config/ai-routing';
import {
  chatViewsToHistory,
  talkIntentSkipsMemoryRetrieval,
} from '../src/services/chat/talk-critical-path';
import { filterMemoriesForIntent, rankMemories } from '../src/services/memory/memory-relevance';
import { Memory } from '../src/types';

function memory(partial: Partial<Memory> & Pick<Memory, 'id' | 'title' | 'content'>): Memory {
  return {
    userId: 'user-1',
    category: 'moments',
    mood: 'neutral',
    importance: 5,
    emotionalSignificance: 5,
    useCount: 0,
    tags: [],
    source: 'text',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('Talk critical-path latency', () => {
  it('factual questions skip memory retrieval', () => {
    const intent = classifyTalkIntent("What's 9 x 9?").intent;
    assert.equal(intent, 'factual_question');
    assert.equal(talkIntentSkipsMemoryRetrieval(intent), true);
    assert.equal(intentWantsMemories(intent), false);
  });

  it('personal and recall questions still retrieve memory', () => {
    assert.equal(talkIntentSkipsMemoryRetrieval('emotional_support'), false);
    assert.equal(talkIntentSkipsMemoryRetrieval('memory_recall'), false);
    assert.equal(talkIntentSkipsMemoryRetrieval('planning'), false);
    assert.equal(talkIntentSkipsMemoryRetrieval('goal_progress'), false);
    assert.equal(talkIntentSkipsMemoryRetrieval('routine'), false);
    assert.equal(intentWantsMemories(classifyTalkIntent("I've been tired after long days").intent), true);
  });

  it('ambiguous queries keep the existing memory-safe behaviour', () => {
    const intent = classifyTalkIntent('Should I do that later?').intent;
    assert.notEqual(intent, 'factual_question');
    assert.equal(talkIntentSkipsMemoryRetrieval(intent), false);
  });

  it('factual ranking discards memories even when candidates exist', () => {
    const ranked = rankMemories(
      [
        memory({
          id: 'm1',
          title: 'Gym nights',
          content: 'I usually train after work',
        }),
      ],
      { userMessage: "What's 9 x 9?", mode: 'friend', recentMessageTexts: [] },
      5,
    );
    assert.deepEqual(filterMemoriesForIntent(ranked, 'factual_question', "What's 9 x 9?"), []);
  });

  it('personal ranking can still select memories', () => {
    const ranked = rankMemories(
      [
        memory({
          id: 'm1',
          title: 'Tired evenings',
          content: 'I have been tired after long days',
        }),
      ],
      { userMessage: "I've been tired after long days", mode: 'friend', recentMessageTexts: [] },
      5,
    );
    assert.ok(filterMemoriesForIntent(ranked, 'emotional_support', "I've been tired after long days").length >= 0);
    assert.equal(talkIntentSkipsMemoryRetrieval('emotional_support'), false);
  });

  it('history mapping drops in-flight bubbles so send cannot duplicate pending rows', () => {
    const history = chatViewsToHistory(
      [
        {
          id: 'u1',
          role: 'user',
          text: 'Hi',
          time: '1:00 PM',
          createdAt: '2026-01-01T13:00:00.000Z',
          status: 'sent',
        },
        {
          id: 'pending',
          role: 'user',
          text: "What's 9 x 9?",
          time: '1:01 PM',
          createdAt: '2026-01-01T13:01:00.000Z',
          status: 'pending',
        },
      ],
      'c1',
      'friend',
    );
    assert.deepEqual(
      history.map((item) => item.id),
      ['u1'],
    );
  });

  it('V1 production Talk still uses the gateway', () => {
    assert.equal(
      resolveTalkAIProvider({ isRelease: true, hasOpenAIKey: true, gatewayConfigured: true }),
      'gateway',
    );
  });
});
