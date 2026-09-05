import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CONTEXTUAL_PAYWALL_SOURCES,
  FREE_CORE_EXPERIENCES,
  PAYWALL_COPY,
  PRO_IMPLEMENTED_BENEFITS,
} from '../src/constants/free-pro-access';
import { LEGAL_URLS, legalUrlsConfigured } from '../src/constants/legal-urls';
import {
  FREE_FEATURES,
  FREE_VS_PRO_COMPARISON,
  PRO_TOP_BENEFITS,
  calculateAnnualSavingsPercent,
} from '../src/constants/pricing';
import {
  isMicrophoneChatEnabled,
  isRealtimeVoiceEnabled,
  isScheduledCallsEnabled,
  isVoiceNotesEnabled,
} from '../src/config/release-voice';
import { PaywallImpressionService } from '../src/services/billing/paywall-impression-service';
import { billingStateMachine } from '../src/services/billing/billing-state-machine';
import { FeatureGateService } from '../src/services/billing/feature-gate-service';
import { createEmptyUsageBucket } from '../src/services/billing/usage-tracking-service';
import { normalizeEntitlementSnapshot } from '../src/services/billing/entitlement-normalize';
import {
  clearRecentBillingAnalyticsEvents,
  getRecentBillingAnalyticsEvents,
  trackEvent,
} from '../src/services/analytics/analytics-service';
import { RESTORE_NONE_MESSAGE, RESTORE_SUCCESS_MESSAGE } from '../src/services/billing/restore-messages';
import type { PlanStatus } from '../src/types/subscription';

class MemoryStorage {
  private map = new Map<string, unknown>();
  async getItem<T>(key: string): Promise<T | null> {
    return (this.map.has(key) ? (this.map.get(key) as T) : null) ?? null;
  }
  async setItem(key: string, value: unknown): Promise<void> {
    this.map.set(key, value);
  }
  async removeItem(key: string): Promise<void> {
    this.map.delete(key);
  }
}

function freeStatus(): PlanStatus {
  return {
    effectivePlan: 'free',
    isPro: false,
    isTrialActive: false,
    trialDaysLeft: 0,
    subscriptionPlan: 'free',
    isFoundingMember: false,
    entitlementSource: 'none',
  };
}

function proStatus(): PlanStatus {
  return {
    effectivePlan: 'pro',
    isPro: true,
    isTrialActive: false,
    trialDaysLeft: 0,
    subscriptionPlan: 'pro',
    isFoundingMember: false,
    entitlementSource: 'revenuecat',
    productId: 'voxa_pro_monthly',
    billingPeriod: 'monthly',
    renewalDate: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

describe('release voice flags stay off', () => {
  it('disables call and mic chat surfaces', () => {
    assert.equal(isRealtimeVoiceEnabled(), false);
    assert.equal(isScheduledCallsEnabled(), false);
    assert.equal(isVoiceNotesEnabled(), false);
    assert.equal(isMicrophoneChatEnabled(), false);
  });
});

describe('canonical Free / Pro access', () => {
  it('keeps Free core experiences and honest Pro benefits', () => {
    assert.ok(FREE_CORE_EXPERIENCES.length >= 8);
    assert.ok(PRO_IMPLEMENTED_BENEFITS.length >= 4);
    assert.equal(PAYWALL_COPY.title, 'Go deeper with Voxa Pro');
    for (const benefit of PRO_TOP_BENEFITS) {
      assert.doesNotMatch(benefit, /call|voice note/i);
    }
    for (const feature of FREE_FEATURES) {
      assert.doesNotMatch(feature, /unlimited/i);
    }
    assert.ok(FREE_VS_PRO_COMPARISON.some((row) => row.label === 'Life Book'));
  });
});

describe('legal URLs', () => {
  it('does not fall back to dead voxa.app domains', () => {
    assert.ok(!LEGAL_URLS.privacyPolicy.toLowerCase().includes('voxa.app'));
    assert.ok(!LEGAL_URLS.termsOfService.toLowerCase().includes('voxa.app'));
    assert.ok(!LEGAL_URLS.supportEmail.toLowerCase().includes('voxa.app'));
  });

  it('requires real HTTPS env URLs before legalUrlsConfigured is true', () => {
    // Without EXPO_PUBLIC_* legal URL env vars, release must fail closed (not invent hosts).
    if (!process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL && !process.env.EXPO_PUBLIC_TERMS_OF_SERVICE_URL) {
      assert.equal(legalUrlsConfigured(), false);
      assert.equal(LEGAL_URLS.privacyPolicy, '');
      assert.equal(LEGAL_URLS.termsOfService, '');
    } else {
      assert.equal(legalUrlsConfigured(), true);
      assert.ok(LEGAL_URLS.privacyPolicy.startsWith('https://'));
      assert.ok(LEGAL_URLS.termsOfService.startsWith('https://'));
    }
  });
});

describe('paywall cooldown', () => {
  it('blocks contextual opens within cooldown and allows force', async () => {
    const storage = new MemoryStorage();
    const impressions = new PaywallImpressionService(storage as never);
    assert.equal(await impressions.canShowPaywall('user-1'), true);
    await impressions.recordImpression('user-1');
    assert.equal(await impressions.canShowPaywall('user-1'), false);
    assert.equal(await impressions.canShowPaywall('user-1', true), true);
    assert.ok(CONTEXTUAL_PAYWALL_SOURCES.has('chat-limit'));
    assert.equal(CONTEXTUAL_PAYWALL_SOURCES.has('you'), false);
  });
});

describe('billing state machine duplicate purchase prevention', () => {
  it('rejects a second purchase while purchasing', () => {
    billingStateMachine.offeringsReady();
    assert.equal(billingStateMachine.startPurchase(), true);
    assert.equal(billingStateMachine.startPurchase(), false);
    billingStateMachine.purchaseCancelled();
    assert.equal(billingStateMachine.canPurchase(), true);
  });
});

describe('feature gating', () => {
  it('defaults Free and gates Pro features', () => {
    const gates = new FeatureGateService();
    const usage = createEmptyUsageBucket();
    const free = freeStatus();
    const chat = gates.canUseAiChat(free, usage);
    assert.equal(chat.allowed, true);
    const lifeBook = gates.canUseLifeBook(free);
    assert.equal(lifeBook.allowed, false);
    assert.equal(lifeBook.upgradeRequired, true);
    const proLife = gates.canUseLifeBook(proStatus());
    assert.equal(proLife.allowed, true);
  });

  it('surfaces a friendly usage-limit reason', () => {
    const gates = new FeatureGateService();
    const usage = createEmptyUsageBucket();
    usage.daily.aiMessages = 999;
    const result = gates.canUseAiChat(freeStatus(), usage);
    assert.equal(result.allowed, false);
    assert.match(result.reason ?? '', /core Voxa/i);
    assert.doesNotMatch(result.reason ?? '', /quota|aiMessages/i);
  });
});

describe('entitlement activation / demotion', () => {
  it('treats Free as default when not Pro', () => {
    const snap = normalizeEntitlementSnapshot({
      isPro: false,
      source: 'none',
      entitlementId: 'voxa_pro',
      cachedAt: new Date().toISOString(),
      offline: false,
    });
    assert.equal(snap.isPro, false);
  });

  it('demotes on expiry', () => {
    const snap = normalizeEntitlementSnapshot({
      isPro: true,
      source: 'revenuecat',
      entitlementId: 'voxa_pro',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      cachedAt: new Date().toISOString(),
      offline: false,
    });
    assert.equal(snap.isPro, false);
  });
});

describe('restore copy + analytics privacy', () => {
  it('matches required restore strings', () => {
    assert.equal(RESTORE_SUCCESS_MESSAGE, 'Voxa Pro has been restored.');
    assert.equal(
      RESTORE_NONE_MESSAGE,
      'No active Voxa Pro subscription was found for this Apple ID.',
    );
  });

  it('tracks billing events without sensitive keys', () => {
    clearRecentBillingAnalyticsEvents();
    trackEvent('paywall_opened', { source: 'you', receipt: 'SECRET', appleId: 'hidden' });
    trackEvent('package_selected', { period: 'annual' });
    trackEvent('purchase_started');
    trackEvent('purchase_cancelled');
    trackEvent('restore_no_entitlement');
    const events = getRecentBillingAnalyticsEvents();
    assert.ok(events.some((e) => e.name === 'paywall_opened'));
    const opened = events.find((e) => e.name === 'paywall_opened');
    assert.equal(opened?.props?.receipt, undefined);
    assert.equal(opened?.props?.appleId, undefined);
  });
});

describe('annual savings math', () => {
  it('only reports positive savings when annual is cheaper', () => {
    assert.ok(calculateAnnualSavingsPercent(4.99, 39.99) > 0);
    assert.equal(calculateAnnualSavingsPercent(4.99, 4.99 * 12), 0);
  });
});
