import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeEntitlementSnapshot } from '../src/services/billing/entitlement-normalize';
import {
  sanitizeBillingMessage,
  toFriendlyBillingError,
} from '../src/services/billing/friendly-billing-errors';
import { EntitlementSnapshot } from '../src/services/billing/billing-types';
import {
  getRevenueCatAnnualProductId,
  getRevenueCatMonthlyProductId,
  getRevenueCatProductIds,
} from '../src/config/revenuecat-product-ids';

function baseEntitlement(overrides: Partial<EntitlementSnapshot> = {}): EntitlementSnapshot {
  return {
    isPro: true,
    source: 'revenuecat',
    entitlementId: 'voxa_pro',
    productId: 'voxa_pro_monthly',
    cachedAt: new Date().toISOString(),
    offline: false,
    ...overrides,
  };
}

describe('normalizeEntitlementSnapshot', () => {
  it('keeps active Pro when expiresAt is in the future', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const next = normalizeEntitlementSnapshot(baseEntitlement({ expiresAt: future }));
    assert.equal(next.isPro, true);
  });

  it('demotes Pro when expiresAt is in the past', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const next = normalizeEntitlementSnapshot(baseEntitlement({ expiresAt: past }));
    assert.equal(next.isPro, false);
    assert.equal(next.source, 'none');
    assert.equal(next.isTrialActive, false);
  });

  it('keeps Pro when there is no expiresAt (non-expiring grant)', () => {
    const next = normalizeEntitlementSnapshot(baseEntitlement({ expiresAt: undefined }));
    assert.equal(next.isPro, true);
  });

  it('does not demote free snapshots', () => {
    const next = normalizeEntitlementSnapshot(
      baseEntitlement({ isPro: false, source: 'none', expiresAt: new Date(0).toISOString() }),
    );
    assert.equal(next.isPro, false);
  });
});

describe('friendly billing errors', () => {
  it('maps network failures to recoverable copy', () => {
    const message = toFriendlyBillingError(new Error('Network request failed'), 'purchase');
    assert.match(message, /connection/i);
    assert.doesNotMatch(message, /Network request failed/);
  });

  it('maps cancelled purchases', () => {
    const message = toFriendlyBillingError(
      { userCancelled: true, message: 'PurchaseCancelledError' },
      'purchase',
    );
    assert.match(message, /cancelled/i);
  });

  it('sanitizes raw outcome messages', () => {
    const message = sanitizeBillingMessage('PURCHASES_ERROR: StoreKit error 2', 'purchase');
    assert.equal(message.includes('PURCHASES_ERROR'), false);
    assert.match(message, /try again/i);
  });

  it('uses restore-specific copy', () => {
    const message = toFriendlyBillingError(new Error('unknown boom'), 'restore');
    assert.match(message, /restore/i);
  });
});

describe('RevenueCat product IDs from environment', () => {
  it('exposes monthly and annual product ids', () => {
    const ids = getRevenueCatProductIds();
    assert.equal(typeof ids.monthly, 'string');
    assert.equal(typeof ids.annual, 'string');
    assert.ok(ids.monthly.length > 0);
    assert.ok(ids.annual.length > 0);
    assert.equal(getRevenueCatMonthlyProductId(), ids.monthly);
    assert.equal(getRevenueCatAnnualProductId(), ids.annual);
  });
});
