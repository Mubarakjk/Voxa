import assert from 'node:assert/strict';
import { describe, it, after, before } from 'node:test';

import {
  areAllFeaturesUnlocked,
  isBillingDormant,
  isFreeLaunchMode,
  isPaywallEnabled,
} from '../src/config/launch-mode';
import { getUnlockedPlanStatus } from '../src/constants/free-launch-plan-status';
import { FeatureGateService } from '../src/services/billing/feature-gate-service';
import { listNoteAIActions, isProNoteAction } from '../src/services/notes/notes-ai-service';
import { ModelRoutingService } from '../src/services/billing/model-routing-service';

const ORIGINAL = process.env.EXPO_PUBLIC_FREE_LAUNCH_MODE;

describe('free launch mode', () => {
  after(() => {
    if (ORIGINAL === undefined) delete process.env.EXPO_PUBLIC_FREE_LAUNCH_MODE;
    else process.env.EXPO_PUBLIC_FREE_LAUNCH_MODE = ORIGINAL;
  });

  before(() => {
    delete process.env.EXPO_PUBLIC_FREE_LAUNCH_MODE;
  });

  it('defaults to fully unlocked free launch', () => {
    delete process.env.EXPO_PUBLIC_FREE_LAUNCH_MODE;
    assert.equal(isFreeLaunchMode(), true);
    assert.equal(isBillingDormant(), true);
    assert.equal(isPaywallEnabled(), false);
    assert.equal(areAllFeaturesUnlocked(), true);
  });

  it('can be disabled for future billing re-enable', () => {
    process.env.EXPO_PUBLIC_FREE_LAUNCH_MODE = 'false';
    assert.equal(isFreeLaunchMode(), false);
    assert.equal(isPaywallEnabled(), true);
    assert.equal(areAllFeaturesUnlocked(), false);
    delete process.env.EXPO_PUBLIC_FREE_LAUNCH_MODE;
  });

  it('returns unlocked plan status with pro limits', () => {
    delete process.env.EXPO_PUBLIC_FREE_LAUNCH_MODE;
    const status = getUnlockedPlanStatus();
    assert.equal(status.isPro, true);
    assert.equal(status.effectivePlan, 'pro');

    const gate = new FeatureGateService();
    const ai = gate.canAccessFeature('ai_chat', status);
    assert.equal(ai.allowed, true);
    const limits = gate.resolveLimits(status);
    assert.ok(limits.aiMessagesDaily > 100 || limits.aiMessagesDaily === -1);
  });

  it('unlocks note AI actions and deep planning route', () => {
    delete process.env.EXPO_PUBLIC_FREE_LAUNCH_MODE;
    const actions = listNoteAIActions(false);
    assert.ok(actions.includes('flashcards'));
    assert.equal(isProNoteAction('flashcards'), false);

    const router = new ModelRoutingService();
    const route = router.resolve('deep_planning', false);
    assert.ok(route.model.includes('gpt-4o'));
  });
});
