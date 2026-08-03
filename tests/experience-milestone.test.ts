import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildChallengeMePromptExtension,
  CHALLENGE_ME_STARTER,
} from '../src/services/chat/challenge-me-prompt';
import {
  PERSONALITY_STYLES,
  personalityStylePromptBlock,
} from '../src/constants/companion-identity';
import {
  buildTodayCheckInPromptBlock,
  DAILY_MOOD_CHIPS,
  memoryMoodToIntelligence,
} from '../src/utils/daily-mood';
import { COMMAND_BAR_ROUTES } from '../src/services/life-os/command-bar-service';
import { getTodayQuickActionStarter } from '../src/constants/today-quick-actions';

describe('experience milestone — daily mood', () => {
  it('exposes the seven check-in chips', () => {
    assert.equal(DAILY_MOOD_CHIPS.length, 7);
    assert.deepEqual(
      DAILY_MOOD_CHIPS.map((c) => c.id),
      ['great', 'good', 'okay', 'stressed', 'tired', 'motivated', 'custom'],
    );
  });

  it('maps memory moods into mood intelligence labels', () => {
    assert.equal(memoryMoodToIntelligence('motivated'), 'motivated');
    assert.equal(memoryMoodToIntelligence('warm'), 'happy');
    assert.equal(memoryMoodToIntelligence('stressed'), 'stressed');
  });

  it('builds a natural check-in prompt block', () => {
    const block = buildTodayCheckInPromptBlock({
      period: 'morning',
      moodLabel: 'Good',
      focus: 'Ship polish',
    });
    assert.match(block, /Today's check-in/);
    assert.match(block, /Feeling: Good/);
    assert.match(block, /Focus: Ship polish/);
  });
});

describe('experience milestone — challenge me', () => {
  it('includes respectful challenge guidance', () => {
    const block = buildChallengeMePromptExtension('business idea');
    assert.match(block, /Challenge Me mode/);
    assert.match(block, /Never argue for the sake of winning/);
    assert.match(block, /business idea/);
    assert.ok(CHALLENGE_ME_STARTER.length > 20);
  });
});

describe('experience milestone — personality + quick actions', () => {
  it('offers the expanded personality set', () => {
    const labels = PERSONALITY_STYLES.map((s) => s.label);
    for (const expected of [
      'Supportive',
      'Funny',
      'Calm',
      'Motivational',
      'Professional',
      'Curious',
      'Teacher',
      'Balanced',
    ]) {
      assert.ok(labels.includes(expected), `missing ${expected}`);
    }
    assert.match(personalityStylePromptBlock('teacher'), /Teacher/);
    assert.match(personalityStylePromptBlock('curious'), /Curious/);
  });

  it('resolves quick action starters', () => {
    assert.ok(getTodayQuickActionStarter('brainstorm')?.includes('brainstorm'));
    assert.ok(getTodayQuickActionStarter('challenge')?.toLowerCase().includes('challenge'));
  });

  it('registers check-in and debate in the command bar', () => {
    const routes = COMMAND_BAR_ROUTES.map((r) => r.route);
    assert.ok(routes.includes('DailyCheckIn'));
    assert.ok(routes.includes('DebateMode'));
    assert.ok(routes.includes('CoachingHub'));
  });
});
