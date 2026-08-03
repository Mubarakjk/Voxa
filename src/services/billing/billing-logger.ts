/** Safe billing logs — DEBUG builds only. Never print secrets or full transaction payloads. */

function canLog(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

export function billingLog(scope: string, detail?: Record<string, unknown>) {
  if (!canLog()) return;
  const safe = detail
    ? Object.fromEntries(
        Object.entries(detail).filter(([key]) => !/secret|token|key|password|authorization/i.test(key)),
      )
    : undefined;
  console.info(`[Voxa Billing] ${scope}`, safe ?? '');
}

export const BillingLog = {
  configureStart: (userId?: string) => billingLog('CONFIGURE START', { userId: userId?.slice(0, 8) }),
  configureSuccess: () => billingLog('CONFIGURE SUCCESS'),
  configureFailure: (message: string) => billingLog('CONFIGURE FAILURE', { message }),
  offeringLoadStart: () => billingLog('OFFERING LOAD START'),
  offeringLoadSuccess: (source: string) => billingLog('OFFERING LOAD SUCCESS', { source }),
  offeringLoadFailure: (message: string) => billingLog('OFFERING LOAD FAILURE', { message }),
  purchaseStart: (period: string) => billingLog('PURCHASE START', { period }),
  purchaseCancelled: () => billingLog('PURCHASE CANCELLED'),
  purchasePending: () => billingLog('PURCHASE PENDING'),
  purchaseSuccess: (productId?: string) => billingLog('PURCHASE SUCCESS', { productId }),
  purchaseFailure: (message: string) => billingLog('PURCHASE FAILURE', { message }),
  entitlementRefreshStart: () => billingLog('ENTITLEMENT REFRESH START'),
  entitlementRefreshSuccess: (isPro: boolean) => billingLog('ENTITLEMENT REFRESH SUCCESS', { isPro }),
  entitlementRefreshFailure: (message: string) => billingLog('ENTITLEMENT REFRESH FAILURE', { message }),
  customerInfoUpdate: (isPro: boolean) => billingLog('CUSTOMER INFO UPDATE', { isPro }),
  foregroundRefresh: (isPro: boolean) => billingLog('FOREGROUND REFRESH', { isPro }),
  restoreStart: () => billingLog('RESTORE START'),
  restoreSuccess: (found: boolean) => billingLog('RESTORE SUCCESS', { found }),
  restoreNone: () => billingLog('RESTORE NONE'),
  restoreFailure: (message: string) => billingLog('RESTORE FAILURE', { message }),
  accountLinkStart: (userId: string) => billingLog('ACCOUNT LINK START', { userId: userId.slice(0, 8) }),
  accountLinkSuccess: () => billingLog('ACCOUNT LINK SUCCESS'),
  accountLinkFailure: (message: string) => billingLog('ACCOUNT LINK FAILURE', { message }),
  accountLogoutSuccess: () => billingLog('ACCOUNT LOGOUT SUCCESS'),
  accountLogoutFailure: (message: string) => billingLog('ACCOUNT LOGOUT FAILURE', { message }),
  webhookMirrorStatus: (status: string) => billingLog('WEBHOOK MIRROR STATUS', { status }),
} as const;

export function maskSecret(value?: string | null): string {
  if (!value?.trim()) return 'not set';
  const trimmed = value.trim();
  if (trimmed.length <= 8) return '****';
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}
