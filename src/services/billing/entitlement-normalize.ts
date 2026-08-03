import { EntitlementSnapshot } from './billing-types';

/** Recalculate Pro from expiresAt so stale cache cannot keep Pro past expiry. */
export function normalizeEntitlementSnapshot(snapshot: EntitlementSnapshot): EntitlementSnapshot {
  if (!snapshot.isPro) {
    return snapshot;
  }

  if (snapshot.source === 'dev_override') {
    return snapshot;
  }

  if (!snapshot.expiresAt) {
    return snapshot;
  }

  const expiresMs = new Date(snapshot.expiresAt).getTime();
  if (Number.isNaN(expiresMs) || expiresMs > Date.now()) {
    return snapshot;
  }

  return {
    ...snapshot,
    isPro: false,
    isTrialActive: false,
    gracePeriod: false,
    source: 'none',
    cachedAt: new Date().toISOString(),
  };
}

export function isEntitlementCurrentlyPro(snapshot: EntitlementSnapshot): boolean {
  return normalizeEntitlementSnapshot(snapshot).isPro;
}
