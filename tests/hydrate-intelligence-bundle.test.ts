import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hydrateIntelligenceBundle } from '../src/services/personality/relationship-personality-service';
import { buildFriendRelationshipProfile } from '../src/services/wow/friend-relationship-engine';
import { createDefaultIntelligenceBundle } from '../src/types/companion-intelligence';

describe('hydrateIntelligenceBundle array contracts', () => {
  it('normalizes corrupted non-array list fields that would break spreads', () => {
    const startedAt = new Date().toISOString();
    const defaults = createDefaultIntelligenceBundle('user-1', 'Alex', startedAt);

    const corrupted = {
      ...defaults,
      profile: {
        ...defaults.profile,
        // Persisted object instead of string[] — Hermes: "iterator method is not callable" on spread
        recentAchievements: { '0': 'won a race' } as unknown as string[],
        currentChallenges: 'stress' as unknown as string[],
        relationships: { mom: { name: 'Mom' } } as unknown as typeof defaults.profile.relationships,
        importantDates: null as unknown as typeof defaults.profile.importantDates,
      },
      relationship: {
        ...defaults.relationship,
        milestones: {
          first: { id: 'm1', label: 'First chat' },
        } as unknown as typeof defaults.relationship.milestones,
      },
      lifeTimeline: { events: [] } as unknown as typeof defaults.lifeTimeline,
      insideJokes: 'not-an-array' as unknown as typeof defaults.insideJokes,
      weeklyReflections: undefined,
    };

    // Without hydration, spreading recentAchievements throws.
    assert.throws(() => {
      void [...(corrupted.profile.recentAchievements as unknown as Iterable<string>)];
    });

    const hydrated = hydrateIntelligenceBundle('user-1', 'Alex', corrupted);

    assert.equal(Array.isArray(hydrated.profile.recentAchievements), true);
    assert.deepEqual(hydrated.profile.recentAchievements, []);
    assert.equal(Array.isArray(hydrated.profile.currentChallenges), true);
    assert.equal(Array.isArray(hydrated.profile.relationships), true);
    assert.equal(Array.isArray(hydrated.profile.importantDates), true);
    assert.equal(Array.isArray(hydrated.relationship.milestones), true);
    assert.equal(Array.isArray(hydrated.lifeTimeline), true);
    assert.equal(Array.isArray(hydrated.insideJokes), true);
    assert.equal(Array.isArray(hydrated.weeklyReflections), true);

    assert.doesNotThrow(() =>
      buildFriendRelationshipProfile({
        profile: { id: 'user-1', displayName: 'Alex' } as never,
        bundle: hydrated,
        memories: [],
        goals: [],
        voiceSessions: [],
      }),
    );
  });

  it('preserves valid array fields', () => {
    const startedAt = new Date().toISOString();
    const defaults = createDefaultIntelligenceBundle('user-1', 'Alex', startedAt);
    const withData = {
      ...defaults,
      profile: {
        ...defaults.profile,
        recentAchievements: ['finished marathon'],
        currentChallenges: ['sleep'],
      },
    };

    const hydrated = hydrateIntelligenceBundle('user-1', 'Alex', withData);
    assert.deepEqual(hydrated.profile.recentAchievements, ['finished marathon']);
    assert.deepEqual(hydrated.profile.currentChallenges, ['sleep']);
  });
});
