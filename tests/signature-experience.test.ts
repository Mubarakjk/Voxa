import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildCompanionInsights } from '../src/services/companion/companion-insights-service';
import { buildLifeBookVolume } from '../src/services/life-os/life-book-volume-service';
import { brandPalette, semantic } from '../src/constants/theme';
import { buildChallengeMePromptExtension } from '../src/services/chat/challenge-me-prompt';
import { Goal, Memory, UserProfile } from '../src/types';

function memory(partial: Partial<Memory> & Pick<Memory, 'id' | 'title' | 'content' | 'category'>): Memory {
  return {
    userId: 'u1',
    importance: 3,
    confidence: 0.8,
    tags: [],
    source: 'manual',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  } as Memory;
}

describe('signature experience — insights never invent', () => {
  it('returns empty when there is no evidence', () => {
    const insights = buildCompanionInsights({
      memories: [],
      goals: [],
      moodHistory: [],
      growth: null,
      checkInsCompleted: 0,
    });
    assert.equal(insights.length, 0);
  });

  it('cites coding goal completion from real goals only', () => {
    const goals = [
      { id: '1', userId: 'u1', title: 'Ship coding polish', status: 'completed', progress: 100, category: 'work' },
      { id: '2', userId: 'u1', title: 'Refactor coding helpers', status: 'active', progress: 40, category: 'work' },
    ] as Goal[];
    const insights = buildCompanionInsights({
      memories: [],
      goals,
      moodHistory: [],
      growth: null,
      checkInsCompleted: 0,
    });
    const coding = insights.find((i) => i.id === 'coding-goal-progress');
    assert.ok(coding);
    assert.match(coding!.evidence, /coding/i);
    assert.match(coding!.text, /50%/);
  });

  it('builds planning insight only with multiple planning memories', () => {
    const memories = [
      memory({ id: 'a', title: 'Plan', content: 'I plan before I act', category: 'habits' }),
      memory({ id: 'b', title: 'Prep', content: 'Always prepare the night before', category: 'habits' }),
    ];
    const insights = buildCompanionInsights({
      memories,
      goals: [],
      moodHistory: [],
      growth: null,
      checkInsCompleted: 0,
    });
    assert.ok(insights.some((i) => i.id === 'planning-before-acting'));
  });
});

describe('signature experience — life book volume', () => {
  it('marks empty chapters without inventing paragraphs', () => {
    const volume = buildLifeBookVolume({
      profile: { id: 'u1', displayName: 'Alex', mainReason: undefined } as UserProfile,
      memories: [],
      goals: [],
    });
    const about = volume.find((c) => c.id === 'about_me');
    assert.ok(about);
    assert.equal(about!.hasContent, false);
    assert.equal(about!.paragraphs.length, 0);
  });

  it('fills About Me from real mainReason', () => {
    const volume = buildLifeBookVolume({
      profile: { id: 'u1', displayName: 'Alex', mainReason: 'Stay consistent' } as UserProfile,
      memories: [],
      goals: [],
    });
    const about = volume.find((c) => c.id === 'about_me');
    assert.equal(about!.hasContent, true);
    assert.match(about!.paragraphs[0], /Stay consistent/);
  });
});

describe('signature experience — palette + challenge', () => {
  it('exposes brand + semantic colours', () => {
    assert.equal(brandPalette.seaGlass, '#2DD4BF');
    assert.equal(semantic.companion, brandPalette.auroraPurple);
    assert.equal(semantic.achievement, '#FCD34D');
  });

  it('lists expanded challenge domains', () => {
    const block = buildChallengeMePromptExtension();
    assert.match(block, /football/);
    assert.match(block, /finance/);
    assert.match(block, /Always explain/);
  });
});
