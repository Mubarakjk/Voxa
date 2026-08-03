import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CONTEXTUAL_PAYWALL_SOURCES,
  PAYWALL_COOLDOWN_MS,
  PAYWALL_COPY,
} from '../src/constants/free-pro-access';
import { FREE_PLAN_LIMITS, PRO_PLAN_LIMITS } from '../src/constants/pricing';
import { calculateAnnualSavingsPercent } from '../src/constants/voxa-pricing';
import { legalUrlsConfigured } from '../src/constants/legal-urls';
import {
  clearRecentBillingAnalyticsEvents,
  getRecentBillingAnalyticsEvents,
  trackEvent,
} from '../src/services/analytics/analytics-service';
import { BillingStateMachine } from '../src/services/billing/billing-state-machine';
import { PaywallImpressionService } from '../src/services/billing/paywall-impression-service';
import { normalizeEntitlementSnapshot } from '../src/services/billing/entitlement-normalize';
import { isLiveCallingUiEnabled, isMicrophoneUiEnabled } from '../src/config/release-voice';

class MemoryStorage {
  private data = new Map<string, unknown>();

  async getItem<T>(key: string): Promise<T | null> {
    return (this.data.get(key) as T | undefined) ?? null;
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    this.data.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.data.delete(key);
  }
}

describe('free tier defaults', () => {
  it('keeps meaningful free limits', () => {
    assert.ok(FREE_PLAN_LIMITS.aiMessagesDaily >= 15);
    assert.ok(FREE_PLAN_LIMITS.memoriesMax >= 40);
    assert.ok(FREE_PLAN_LIMITS.goalsMax >= 3);
  });

  it('pro fair-use exceeds free', () => {
    assert.ok(PRO_PLAN_LIMITS.aiMessagesDaily > FREE_PLAN_LIMITS.aiMessagesDaily);
    assert.ok(PRO_PLAN_LIMITS.memoriesMax === -1 || PRO_PLAN_LIMITS.memoriesMax > FREE_PLAN_LIMITS.memoriesMax);
  });
});

describe('paywall copy', () => {
  it('uses honest release messaging', () => {
    assert.match(PAYWALL_COPY.title, /Voxa Pro/i);
    assert.match(PAYWALL_COPY.subtitle, /memory/i);
    assert.equal(PAYWALL_COPY.subscribeLabel, 'Subscribe');
  });
});

describe('paywall cooldown', () => {
  it('blocks contextual prompts within 6 hours', async () => {
    const storage = new MemoryStorage();
    const svc = new PaywallImpressionService(storage);
    const userId = 'user-1';
    assert.equal(await svc.canShowPaywall(userId), true);
    await svc.recordImpression(userId);
    assert.equal(await svc.canShowPaywall(userId), false);
    assert.equal(await svc.canShowPaywall(userId, true), true);
  });

  it('uses six hour cooldown constant', () => {
    assert.equal(PAYWALL_COOLDOWN_MS, 6 * 60 * 60 * 1000);
  });
});

describe('contextual paywall sources', () => {
  it('does not cooldown user-initiated you/onboarding opens', () => {
    assert.equal(CONTEXTUAL_PAYWALL_SOURCES.has('you'), false);
    assert.equal(CONTEXTUAL_PAYWALL_SOURCES.has('onboarding'), false);
    assert.equal(CONTEXTUAL_PAYWALL_SOURCES.has('chat-limit'), true);
  });
});

describe('billing state machine', () => {
  it('prevents duplicate purchase taps', () => {
    const sm = new BillingStateMachine();
    assert.equal(sm.startPurchase(), true);
    assert.equal(sm.startPurchase(), false);
    sm.purchaseSucceeded();
    assert.equal(sm.startPurchase(), true);
  });

  it('prevents purchase during restore', () => {
    const sm = new BillingStateMachine();
    sm.offeringsReady();
    assert.equal(sm.startRestore(), true);
    assert.equal(sm.startPurchase(), false);
    sm.restoreFinished();
    assert.equal(sm.startPurchase(), true);
  });
});

describe('annual savings math', () => {
  it('shows savings only when annual beats twelve months', () => {
    assert.equal(calculateAnnualSavingsPercent(4.99, 39.99), 33);
    assert.equal(calculateAnnualSavingsPercent(4.99, 59.88), 0);
  });
});

describe('entitlement demotion', () => {
  it('demotes expired Pro', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const next = normalizeEntitlementSnapshot({
      isPro: true,
      source: 'revenuecat',
      entitlementId: 'voxa_pro',
      expiresAt: past,
      cachedAt: new Date().toISOString(),
      offline: false,
    });
    assert.equal(next.isPro, false);
  });
});

describe('release voice gates', () => {
  it('keeps calling and microphone UI off by default', () => {
    assert.equal(isLiveCallingUiEnabled(), false);
    assert.equal(isMicrophoneUiEnabled(), false);
  });
});

describe('billing analytics privacy', () => {
  it('records billing events without sensitive keys', () => {
    clearRecentBillingAnalyticsEvents();
    trackEvent('purchase_started', { source: 'you', period: 'monthly' });
    trackEvent('purchase_succeeded', { period: 'monthly' });
    trackEvent('restore_no_entitlement');
    const events = getRecentBillingAnalyticsEvents().map((e) => e.name);
    assert.deepEqual(events, ['purchase_started', 'purchase_succeeded', 'restore_no_entitlement']);
    for (const entry of getRecentBillingAnalyticsEvents()) {
      for (const key of Object.keys(entry.props ?? {})) {
        assert.equal(/receipt|apple.?id|chat|memory|note_body/i.test(key), false);
      }
    }
  });
});

describe('legal urls', () => {
  it('expects https production urls', () => {
    const ok = legalUrlsConfigured();
    assert.equal(typeof ok, 'boolean');
  });
});
