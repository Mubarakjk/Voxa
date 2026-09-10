import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildCompanionGreeting } from '../src/services/companion/companion-presence-service';
import {
  areSimilarInsights,
  formatHomeHeroSubline,
  formatHomeHeroSublineFromRaw,
  splitCompoundInsights,
  stripInternalLabels,
} from '../src/utils/home-hero-copy';

describe('home hero copy', () => {
  it('removes duplicate memory/context from concatenated coach strings', () => {
    const raw =
      'Recent win: I normally train after work I still remember: "I normally train after work".';
    const parts = splitCompoundInsights(raw);
    assert.equal(parts.length, 1);
    assert.equal(parts[0], 'I normally train after work');

    const subline = formatHomeHeroSubline({ todayFocusRaw: raw, hour: 10 });
    assert.equal(subline, 'You normally train after work. Ready when you are.');
    assert.ok(!subline.includes('Recent win'));
    assert.ok(!subline.includes('I still remember'));
  });

  it('formats long content as a clean complete sentence', () => {
    const longFocus =
      'Hold space for rebuilding momentum after a demanding week at work while keeping evenings open for recovery and family time';
    const subline = formatHomeHeroSubline({ todayFocusRaw: longFocus, hour: 14 });
    assert.ok(subline.endsWith('.'));
    assert.ok(subline.length <= 120);
    assert.ok(!subline.includes('…'));
    assert.ok(!subline.includes('...'));
  });

  it('returns intentional fallback for empty state', () => {
    assert.equal(formatHomeHeroSubline({ hour: 9 }), 'What are we getting into today?');
    assert.equal(formatHomeHeroSubline({ todayFocusRaw: '', hour: 15 }), "I'm here whenever you want to talk.");
    assert.equal(formatHomeHeroSublineFromRaw(null, 21), 'How are you feeling tonight?');
  });

  it('never returns undefined/null or fake personal information', () => {
    const subline = formatHomeHeroSubline({});
    assert.ok(typeof subline === 'string');
    assert.ok(subline.trim().length > 0);
    assert.ok(!/undefined|null|demo|placeholder/i.test(subline));
  });

  it('keeps a normal short insight readable without over-wrapping', () => {
    const subline = formatHomeHeroSubline({
      activeGoalTitle: 'Run a 5K',
      todayFocusRaw: 'Move "Run a 5K" forward',
      hour: 11,
    });
    assert.equal(subline, 'Your focus today is Run a 5K.');
  });

  it('detects similar insights for deduplication', () => {
    assert.ok(
      areSimilarInsights('I normally train after work', 'I normally train after work I still remember'),
    );
    assert.ok(!areSimilarInsights('Morning meditation', 'Evening gym session'));
  });

  it('strips internal metadata labels', () => {
    assert.equal(stripInternalLabels('Recent win: Finished the proposal'), 'Finished the proposal');
    assert.equal(stripInternalLabels('I still remember: "Morning runs"'), 'Morning runs');
  });

  it('buildCompanionGreeting uses polished hero subline', () => {
    const greeting = buildCompanionGreeting({
      profile: { id: 'u1', displayName: 'Hello User' } as never,
      memories: [{ content: 'I normally train after work', tags: ['remember-this'] } as never],
      focusState: {
        focus: 'Recent win: I normally train after work I still remember: "I normally train after work".',
      } as never,
    });

    assert.equal(greeting.headline.includes('Hello'), true);
    assert.equal(greeting.subline, 'You normally train after work. Ready when you are.');
  });

  it('never greets with placeholder TEST / invalid display names', () => {
    const greeting = buildCompanionGreeting({
      profile: { id: 'u1', displayName: 'TEST' } as never,
      memories: [],
    });
    assert.ok(!/TEST/i.test(greeting.greeting));
    assert.ok(!/TEST/i.test(greeting.headline));
    assert.match(greeting.headline, /Welcome back|Good to see you|I'm here|Hey/i);
  });

  it('phase11 rhythm greets without invalid first names', async () => {
    const { buildDailyLifeRhythm } = await import('../src/services/phase11/daily-life-rhythm-service');
    const named = buildDailyLifeRhythm({
      firstName: 'Alex',
      todayFocus: 'Ship Home polish',
      routineNext: null,
      routineDone: 0,
      routineTotal: 0,
      hour: 9,
    });
    assert.match(named.greeting, /Alex/);
    const anon = buildDailyLifeRhythm({
      firstName: null,
      todayFocus: 'Ship Home polish',
      routineNext: null,
      routineDone: 0,
      routineTotal: 0,
      hour: 9,
    });
    assert.equal(anon.greeting, 'Good morning.');
    assert.ok(!/TEST|friend\./i.test(anon.greeting));
  });
});
