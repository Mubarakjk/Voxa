import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PACKAGE_TYPE,
  PurchasesOfferings,
  PurchasesPackage,
} from 'react-native-purchases';

import {
  calculateAnnualSavingsPercent,
  formatFallbackPrice,
  VOXA_PRICING,
} from '../../constants/voxa-pricing';
import {
  getRevenueCatApiKeyForPlatform,
  getRevenueCatEntitlementId,
  getRevenueCatOfferingId,
  hasRevenueCatConfig,
} from '../../config/revenuecat-env';
import { BillingPeriod } from '../../types/subscription';
import {
  CustomerInfoSnapshot,
  EntitlementSnapshot,
  OfferingPackageInfo,
  OfferingsSnapshot,
  PurchaseOutcome,
} from './billing-types';
import { BillingLog } from './billing-logger';
import { validateOfferingPackages } from './billing-validation';
import { getBillingRuntime, getPurchasesUnavailableMessage } from './runtime-environment';
import { SubscriptionEntitlementService } from './subscription-entitlement-service';

const PURCHASE_ENTITLEMENT_TIMEOUT_MS = 12000;
const ENTITLEMENT_RETRY_DELAYS_MS = [500, 1500, 3000];

let globalConfigured = false;
let configuredForUserId: string | undefined;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isUserCancelled(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { userCancelled?: boolean; code?: string | number };
  return candidate.userCancelled === true || candidate.code === 'PurchaseCancelledError' || candidate.code === 1;
}

function isPending(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const code = (error as { code?: string | number }).code;
  return code === 'PURCHASE_PENDING_ERROR' || code === 'PaymentPendingError';
}

function mapPeriodFromPackage(pkg: PurchasesPackage): BillingPeriod {
  if (pkg.packageType === PACKAGE_TYPE.ANNUAL) return 'annual';
  return 'monthly';
}

function extractTrialDays(product: PurchasesPackage['product']): number | undefined {
  const intro = product.introPrice;
  if (!intro || intro.price !== 0) return undefined;
  if (intro.periodUnit === 'DAY') return intro.periodNumberOfUnits;
  if (intro.periodUnit === 'WEEK') return intro.periodNumberOfUnits * 7;
  return undefined;
}

function mapPackageInfo(pkg: PurchasesPackage): OfferingPackageInfo {
  const trialDays = extractTrialDays(pkg.product);
  return {
    identifier: pkg.identifier,
    productId: pkg.product.identifier,
    priceString: pkg.product.priceString,
    price: pkg.product.price,
    currencyCode: pkg.product.currencyCode,
    period: mapPeriodFromPackage(pkg),
    trialDays,
    trialEligible: trialDays !== undefined && trialDays > 0,
  };
}

function findPackage(
  offerings: PurchasesOfferings,
  period: BillingPeriod,
): PurchasesPackage | undefined {
  const offeringId = getRevenueCatOfferingId();
  const current = offerings.all[offeringId] ?? offerings.current;
  if (!current) return undefined;

  const byId =
    period === 'monthly'
      ? current.availablePackages.find(
          (pkg) =>
            pkg.product.identifier === VOXA_PRICING.productIds.monthly ||
            pkg.identifier === VOXA_PRICING.productIds.monthly ||
            pkg.packageType === PACKAGE_TYPE.MONTHLY,
        )
      : current.availablePackages.find(
          (pkg) =>
            pkg.product.identifier === VOXA_PRICING.productIds.annual ||
            pkg.identifier === VOXA_PRICING.productIds.annual ||
            pkg.packageType === PACKAGE_TYPE.ANNUAL,
        );

  return byId ?? current.availablePackages.find((pkg) => mapPeriodFromPackage(pkg) === period);
}

function entitlementFromCustomerInfo(
  info: CustomerInfo,
  entitlementService: SubscriptionEntitlementService,
): EntitlementSnapshot {
  const entitlementId = getRevenueCatEntitlementId();
  const active = info.entitlements.active[entitlementId];
  const cachedAt = new Date().toISOString();

  if (entitlementService.isDevOverrideActive()) {
    return entitlementService.getInMemoryEntitlement();
  }

  if (!active) {
    return {
      isPro: false,
      source: 'none',
      revenueCatAppUserId: info.originalAppUserId,
      cachedAt,
      offline: false,
    };
  }

  const productId = active.productIdentifier;
  const billingPeriod: BillingPeriod = productId.includes('annual') ? 'annual' : 'monthly';
  const isTrial = active.periodType === 'TRIAL';

  return {
    isPro: true,
    source: isTrial ? 'platform_trial' : 'revenuecat',
    entitlementId,
    productId,
    billingPeriod,
    expiresAt: active.expirationDate ?? undefined,
    purchaseDate: active.originalPurchaseDate ?? undefined,
    willRenew: active.willRenew,
    isTrialActive: isTrial,
    trialEnd: isTrial ? active.expirationDate ?? undefined : undefined,
    billingIssue: active.billingIssueDetectedAt != null,
    gracePeriod: active.isActive && active.billingIssueDetectedAt != null,
    refunded: !active.isActive && active.unsubscribeDetectedAt != null,
    revenueCatAppUserId: info.originalAppUserId,
    cachedAt,
    offline: false,
  };
}

function fallbackOfferings(): OfferingsSnapshot {
  const monthlyPrice = formatFallbackPrice(VOXA_PRICING.monthlyFallbackGBP);
  const annualPrice = formatFallbackPrice(VOXA_PRICING.annualFallbackGBP);

  return {
    configured: hasRevenueCatConfig(),
    source: 'fallback',
    trialEligible: false,
    loadedAt: new Date().toISOString(),
    offeringId: getRevenueCatOfferingId(),
    monthlyPackageValid: false,
    annualPackageValid: false,
    setupMessage: getBillingRuntime().isExpoGo
      ? getPurchasesUnavailableMessage()
      : 'Showing development fallback prices. Store packages are not loaded.',
    message: getBillingRuntime().isExpoGo ? getPurchasesUnavailableMessage() : undefined,
    monthly: {
      identifier: VOXA_PRICING.productIds.monthly,
      productId: VOXA_PRICING.productIds.monthly,
      priceString: `${monthlyPrice} (fallback)`,
      price: VOXA_PRICING.monthlyFallbackGBP,
      currencyCode: VOXA_PRICING.currency,
      period: 'monthly',
      trialEligible: false,
    },
    annual: {
      identifier: VOXA_PRICING.productIds.annual,
      productId: VOXA_PRICING.productIds.annual,
      priceString: `${annualPrice} (fallback)`,
      price: VOXA_PRICING.annualFallbackGBP,
      currencyCode: VOXA_PRICING.currency,
      period: 'annual',
      trialEligible: false,
    },
  };
}

function enrichOfferings(snapshot: OfferingsSnapshot): OfferingsSnapshot {
  const validation = validateOfferingPackages(snapshot);
  return {
    ...snapshot,
    monthlyPackageValid: validation.monthlyValid,
    annualPackageValid: validation.annualValid,
    setupMessage: validation.setupMessage,
  };
}

export class RevenueCatPurchaseManager {
  private lastOfferings: OfferingsSnapshot | null = null;
  private lastPurchase: PurchaseOutcome | undefined;
  private lastRestore: PurchaseOutcome | undefined;
  private lastRefreshAt: string | undefined;
  private purchaseInFlight = false;
  private restoreInFlight = false;

  constructor(private readonly entitlementService: SubscriptionEntitlementService) {}

  isAvailable(): boolean {
    const runtime = getBillingRuntime();
    return hasRevenueCatConfig() && runtime.supportsNativePurchases;
  }

  isPurchaseInFlight(): boolean {
    return this.purchaseInFlight;
  }

  isRestoreInFlight(): boolean {
    return this.restoreInFlight;
  }

  getStatusMessage(): string {
    if (!hasRevenueCatConfig()) return 'RevenueCat API key not configured.';
    if (getBillingRuntime().isExpoGo) return getPurchasesUnavailableMessage();
    return 'RevenueCat ready.';
  }

  async configure(appUserId?: string): Promise<void> {
    if (!hasRevenueCatConfig()) return;
    const runtime = getBillingRuntime();
    if (!runtime.supportsNativePurchases) return;

    const apiKey = getRevenueCatApiKeyForPlatform();
    if (!apiKey) return;

    BillingLog.configureStart(appUserId);

    try {
      if (!globalConfigured) {
        if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        Purchases.configure({ apiKey, appUserID: appUserId });
        globalConfigured = true;
        configuredForUserId = appUserId;
        BillingLog.configureSuccess();
        return;
      }

      if (appUserId && configuredForUserId !== appUserId) {
        BillingLog.accountLinkStart(appUserId);
        await Purchases.logIn(appUserId);
        configuredForUserId = appUserId;
        BillingLog.accountLinkSuccess();
      }
    } catch (err) {
      BillingLog.configureFailure(err instanceof Error ? err.message : 'configure failed');
      throw err;
    }
  }

  async logIn(appUserId: string): Promise<CustomerInfoSnapshot> {
    if (!this.isAvailable()) {
      return this.buildUnavailableSnapshot(appUserId);
    }

    BillingLog.accountLinkStart(appUserId);
    try {
      const { customerInfo } = await Purchases.logIn(appUserId);
      configuredForUserId = appUserId;
      BillingLog.accountLinkSuccess();
      return this.snapshotFromCustomerInfo(customerInfo, appUserId);
    } catch (err) {
      BillingLog.accountLinkFailure(err instanceof Error ? err.message : 'logIn failed');
      throw err;
    }
  }

  async logOut(): Promise<void> {
    if (!globalConfigured) return;
    try {
      await Purchases.logOut();
      BillingLog.accountLogoutSuccess();
    } catch (err) {
      BillingLog.accountLogoutFailure(err instanceof Error ? err.message : 'logOut failed');
    } finally {
      configuredForUserId = undefined;
      this.lastOfferings = null;
      await this.entitlementService.clearAllCachedEntitlements();
    }
  }

  async refreshCustomerInfo(appUserId: string): Promise<CustomerInfoSnapshot> {
    if (!this.isAvailable()) {
      return this.buildUnavailableSnapshot(appUserId);
    }

    BillingLog.entitlementRefreshStart();
    try {
      const info = await Purchases.getCustomerInfo();
      this.lastRefreshAt = new Date().toISOString();
      const snapshot = this.snapshotFromCustomerInfo(info, appUserId);
      BillingLog.entitlementRefreshSuccess(snapshot.entitlement.isPro);
      return snapshot;
    } catch (err) {
      BillingLog.entitlementRefreshFailure(err instanceof Error ? err.message : 'refresh failed');
      throw err;
    }
  }

  async getOfferings(): Promise<OfferingsSnapshot> {
    if (!this.isAvailable()) {
      this.lastOfferings = enrichOfferings(fallbackOfferings());
      return this.lastOfferings;
    }

    BillingLog.offeringLoadStart();
    try {
      const offerings = await Purchases.getOfferings();
      const offeringId = getRevenueCatOfferingId();
      const current = offerings.all[offeringId] ?? offerings.current;
      if (!current) {
        this.lastOfferings = enrichOfferings({
          ...fallbackOfferings(),
          setupMessage: `Offering "${offeringId}" not found in RevenueCat.`,
        });
        BillingLog.offeringLoadFailure('offering missing');
        return this.lastOfferings;
      }

      const monthly = current.availablePackages.find(
        (pkg) => mapPeriodFromPackage(pkg) === 'monthly',
      );
      const annual = current.availablePackages.find((pkg) => mapPeriodFromPackage(pkg) === 'annual');

      this.lastOfferings = enrichOfferings({
        configured: true,
        source: 'store',
        loadedAt: new Date().toISOString(),
        offeringId,
        trialEligible: Boolean(
          (monthly && extractTrialDays(monthly.product)) || (annual && extractTrialDays(annual.product)),
        ),
        monthly: monthly ? mapPackageInfo(monthly) : undefined,
        annual: annual ? mapPackageInfo(annual) : undefined,
      });
      BillingLog.offeringLoadSuccess('store');
      return this.lastOfferings;
    } catch (err) {
      BillingLog.offeringLoadFailure(err instanceof Error ? err.message : 'offerings failed');
      this.lastOfferings = enrichOfferings(fallbackOfferings());
      return this.lastOfferings;
    }
  }

  async purchaseSubscription(period: BillingPeriod, appUserId: string): Promise<PurchaseOutcome> {
    if (this.purchaseInFlight) {
      return { success: false, errorMessage: 'Purchase already in progress.' };
    }

    if (!this.isAvailable()) {
      const outcome: PurchaseOutcome = {
        success: false,
        errorMessage: getPurchasesUnavailableMessage(),
      };
      this.lastPurchase = outcome;
      return outcome;
    }

    this.purchaseInFlight = true;
    BillingLog.purchaseStart(period);

    try {
      const offerings = await this.getOfferings();
      if (!offerings.monthlyPackageValid && period === 'monthly') {
        const outcome: PurchaseOutcome = {
          success: false,
          errorMessage: offerings.setupMessage ?? 'Monthly package unavailable.',
        };
        this.lastPurchase = outcome;
        BillingLog.purchaseFailure(outcome.errorMessage!);
        return outcome;
      }
      if (!offerings.annualPackageValid && period === 'annual') {
        const outcome: PurchaseOutcome = {
          success: false,
          errorMessage: offerings.setupMessage ?? 'Annual package unavailable.',
        };
        this.lastPurchase = outcome;
        BillingLog.purchaseFailure(outcome.errorMessage!);
        return outcome;
      }

      const storeOfferings = await Purchases.getOfferings();
      const pkg = findPackage(storeOfferings, period);
      if (!pkg) {
        const outcome: PurchaseOutcome = {
          success: false,
          errorMessage: offerings.setupMessage ?? 'Subscription package unavailable.',
        };
        this.lastPurchase = outcome;
        BillingLog.purchaseFailure(outcome.errorMessage!);
        return outcome;
      }

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      let entitlement = entitlementFromCustomerInfo(customerInfo, this.entitlementService);

      if (!entitlement.isPro) {
        const started = Date.now();
        for (const delay of ENTITLEMENT_RETRY_DELAYS_MS) {
          if (Date.now() - started > PURCHASE_ENTITLEMENT_TIMEOUT_MS) break;
          await sleep(delay);
          BillingLog.entitlementRefreshStart();
          const refreshed = await Purchases.getCustomerInfo();
          entitlement = entitlementFromCustomerInfo(refreshed, this.entitlementService);
          if (entitlement.isPro) break;
        }
      }

      await this.entitlementService.setEntitlement(appUserId, entitlement);

      if (!entitlement.isPro) {
        const outcome: PurchaseOutcome = {
          success: false,
          pending: true,
          productId: pkg.product.identifier,
          errorMessage: 'Purchase received. Pro activation may take a moment — tap Restore if needed.',
        };
        this.lastPurchase = outcome;
        BillingLog.purchasePending();
        return outcome;
      }

      const outcome: PurchaseOutcome = {
        success: true,
        productId: pkg.product.identifier,
        customerInfoUpdatedAt: new Date().toISOString(),
      };
      this.lastPurchase = outcome;
      BillingLog.purchaseSuccess(pkg.product.identifier);
      return outcome;
    } catch (err) {
      if (isUserCancelled(err)) {
        const outcome: PurchaseOutcome = { success: false, cancelled: true };
        this.lastPurchase = outcome;
        BillingLog.purchaseCancelled();
        return outcome;
      }
      if (isPending(err)) {
        const outcome: PurchaseOutcome = { success: false, pending: true };
        this.lastPurchase = outcome;
        BillingLog.purchasePending();
        return outcome;
      }

      const outcome: PurchaseOutcome = {
        success: false,
        errorMessage: err instanceof Error ? err.message : 'Purchase failed.',
      };
      this.lastPurchase = outcome;
      BillingLog.purchaseFailure(outcome.errorMessage!);
      return outcome;
    } finally {
      this.purchaseInFlight = false;
    }
  }

  async restorePurchases(appUserId: string): Promise<PurchaseOutcome> {
    if (this.restoreInFlight) {
      return { success: false, errorMessage: 'Restore already in progress.' };
    }

    if (!this.isAvailable()) {
      const outcome: PurchaseOutcome = {
        success: false,
        errorMessage: getPurchasesUnavailableMessage(),
      };
      this.lastRestore = outcome;
      return outcome;
    }

    this.restoreInFlight = true;
    BillingLog.restoreStart();

    try {
      const info = await Purchases.restorePurchases();
      const entitlement = entitlementFromCustomerInfo(info, this.entitlementService);
      await this.entitlementService.setEntitlement(appUserId, entitlement);

      if (!entitlement.isPro) {
        const outcome: PurchaseOutcome = {
          success: true,
          errorMessage: 'No active Voxa Pro subscription found for this account.',
        };
        this.lastRestore = outcome;
        BillingLog.restoreNone();
        return outcome;
      }

      const outcome: PurchaseOutcome = {
        success: true,
        productId: entitlement.productId,
        customerInfoUpdatedAt: new Date().toISOString(),
      };
      this.lastRestore = outcome;
      BillingLog.restoreSuccess(true);
      return outcome;
    } catch (err) {
      const outcome: PurchaseOutcome = {
        success: false,
        errorMessage: err instanceof Error ? err.message : 'Restore failed.',
      };
      this.lastRestore = outcome;
      BillingLog.restoreFailure(outcome.errorMessage!);
      return outcome;
    } finally {
      this.restoreInFlight = false;
    }
  }

  getLastPurchase(): PurchaseOutcome | undefined {
    return this.lastPurchase;
  }

  getLastRestore(): PurchaseOutcome | undefined {
    return this.lastRestore;
  }

  getLastOfferings(): OfferingsSnapshot | null {
    return this.lastOfferings;
  }

  getLastRefreshAt(): string | undefined {
    return this.lastRefreshAt;
  }

  private snapshotFromCustomerInfo(info: CustomerInfo, appUserId: string): CustomerInfoSnapshot {
    const entitlement = entitlementFromCustomerInfo(info, this.entitlementService);
    this.lastRefreshAt = new Date().toISOString();
    return {
      appUserId,
      entitlement,
      configured: globalConfigured,
      offeringsLoaded: Boolean(this.lastOfferings),
      lastRefreshAt: this.lastRefreshAt,
    };
  }

  private buildUnavailableSnapshot(appUserId: string): CustomerInfoSnapshot {
    return {
      appUserId,
      configured: hasRevenueCatConfig(),
      offeringsLoaded: Boolean(this.lastOfferings),
      entitlement: {
        isPro: false,
        source: 'none',
        cachedAt: new Date().toISOString(),
        offline: true,
      },
    };
  }
}

export async function openPlatformSubscriptionManagement(): Promise<boolean> {
  if (!hasRevenueCatConfig() || !globalConfigured) return false;
  try {
    await Purchases.showManageSubscriptions();
    return true;
  } catch (err) {
    console.warn('[Voxa Billing] Unable to open subscription management.', err);
    return false;
  }
}

export function resetBillingConfigureStateForTests() {
  globalConfigured = false;
  configuredForUserId = undefined;
}
