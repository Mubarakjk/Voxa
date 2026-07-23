import { BillingPeriod } from '../../types/subscription';

export type PurchaseOutcome = {
  success: boolean;
  cancelled?: boolean;
  pending?: boolean;
  errorMessage?: string;
  productId?: string;
  customerInfoUpdatedAt?: string;
};

export type OfferingPackageInfo = {
  identifier: string;
  productId: string;
  priceString: string;
  price: number;
  currencyCode: string;
  period: BillingPeriod;
  trialDays?: number;
  trialEligible: boolean;
};

export type OfferingsSnapshot = {
  monthly?: OfferingPackageInfo;
  annual?: OfferingPackageInfo;
  trialEligible: boolean;
  loadedAt: string;
  source: 'store' | 'fallback';
  configured: boolean;
  offeringId?: string;
  monthlyPackageValid?: boolean;
  annualPackageValid?: boolean;
  setupMessage?: string;
  message?: string;
};

export type EntitlementSnapshot = {
  isPro: boolean;
  source: 'revenuecat' | 'platform_trial' | 'dev_override' | 'none';
  entitlementId?: string;
  productId?: string;
  billingPeriod?: BillingPeriod;
  expiresAt?: string;
  purchaseDate?: string;
  willRenew?: boolean;
  isTrialActive?: boolean;
  trialEnd?: string;
  billingIssue?: boolean;
  gracePeriod?: boolean;
  refunded?: boolean;
  storeEnvironment?: string;
  revenueCatAppUserId?: string;
  cachedAt: string;
  offline: boolean;
};

export type CustomerInfoSnapshot = {
  appUserId: string;
  entitlement: EntitlementSnapshot;
  configured: boolean;
  offeringsLoaded: boolean;
  lastRefreshAt?: string;
  storeEnvironment?: string;
};

export type BillingDebugState = {
  revenueCatConfigured: boolean;
  runtimeLabel: string;
  supportsPurchases: boolean;
  appUserId?: string;
  entitlement: EntitlementSnapshot;
  offerings?: OfferingsSnapshot;
  lastPurchase?: PurchaseOutcome;
  lastRestore?: PurchaseOutcome;
  lastRefreshAt?: string;
  supabaseMirrorStatus?: string;
  webhookLastEvent?: string;
};

export type SubscriptionMirrorRecord = {
  id?: string;
  user_id: string;
  revenuecat_app_user_id: string;
  entitlement_id: string;
  product_id?: string;
  platform?: string;
  status: string;
  purchase_date?: string;
  expiration_date?: string;
  trial_end?: string;
  will_renew?: boolean;
  store_environment?: string;
  original_transaction_id?: string;
  last_event_id?: string;
  updated_at?: string;
};
