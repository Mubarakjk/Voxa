import Purchases, {
  CustomerInfo,
  CustomerInfoUpdateListener,
  LOG_LEVEL,
  PACKAGE_TYPE,
  PurchasesOfferings,
  PurchasesPackage,
} from 'react-native-purchases';

import { formatFallbackPrice, VOXA_PRICING } from '../../constants/voxa-pricing';
import {
  getRevenueCatAnnualProductId,
  getRevenueCatApiKeyForPlatform,
  getRevenueCatEntitlementId,
  getRevenueCatMonthlyProductId,
  getRevenueCatOfferingId,
  getRevenueCatProductIds,
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
import { normalizeEntitlementSnapshot } from './entitlement-normalize';
import {
  isBillingPending,
  isBillingUserCancelled,
  sanitizeBillingMessage,
  toFriendlyBillingError,
} from './friendly-billing-errors';
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

function mapPeriodFromPackage(pkg: PurchasesPackage): BillingPeriod {
  if (pkg.packageType === PACKAGE_TYPE.ANNUAL) return 'annual';
  return 'monthly';
}

function billingPeriodForProductId(productId: string): BillingPeriod {
  const annualId = getRevenueCatAnnualProductId();
  if (productId === annualId || productId.toLowerCase().includes('annual')) return 'annual';
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

  const productIds = getRevenueCatProductIds();
  const byId =
    period === 'monthly'
      ? current.availablePackages.find(
          (pkg) =>
            pkg.product.identifier === productIds.monthly ||
            pkg.identifier === productIds.monthly ||
            pkg.packageType === PACKAGE_TYPE.MONTHLY,
        )
      : current.availablePackages.find(
          (pkg) =>
            pkg.product.identifier === productIds.annual ||
            pkg.identifier === productIds.annual ||
            pkg.packageType === PACKAGE_TYPE.ANNUAL,
        );

  return byId ?? current.availablePackages.find((pkg) => mapPeriodFromPackage(pkg) === period);
}

export function entitlementFromCustomerInfo(
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
      entitlementId,
      revenueCatAppUserId: info.originalAppUserId,
      cachedAt,
      offline: false,
    };
  }

  const productId = active.productIdentifier;
  const billingPeriod = billingPeriodForProductId(productId);
  const isTrial = active.periodType === 'TRIAL';
  const expiresAt = active.expirationDate ?? undefined;

  const mapped: EntitlementSnapshot = {
    isPro: Boolean(active.isActive),
    source: isTrial ? 'platform_trial' : 'revenuecat',
    entitlementId,
    productId,
    billingPeriod,
    expiresAt,
    purchaseDate: active.originalPurchaseDate ?? undefined,
    willRenew: active.willRenew,
    isTrialActive: isTrial,
    trialEnd: isTrial ? expiresAt : undefined,
    billingIssue: active.billingIssueDetectedAt != null,
    gracePeriod: active.isActive && active.billingIssueDetectedAt != null,
    refunded: !active.isActive && active.unsubscribeDetectedAt != null,
    revenueCatAppUserId: info.originalAppUserId,
    cachedAt,
    offline: false,
  };

  return normalizeEntitlementSnapshot(mapped);
}

function fallbackOfferings(): OfferingsSnapshot {
  const monthlyPrice = formatFallbackPrice(VOXA_PRICING.monthlyFallbackGBP);
  const annualPrice = formatFallbackPrice(VOXA_PRICING.annualFallbackGBP);
  const productIds = getRevenueCatProductIds();

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
      identifier: productIds.monthly,
      productId: productIds.monthly,
      priceString: `${monthlyPrice} (fallback)`,
      price: VOXA_PRICING.monthlyFallbackGBP,
      currencyCode: VOXA_PRICING.currency,
      period: 'monthly',
      trialEligible: false,
    },
    annual: {
      identifier: productIds.annual,
      productId: productIds.annual,
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
  private customerInfoListener: CustomerInfoUpdateListener | null = null;
  private onCustomerInfoEntitlement:
    | ((userId: string, entitlement: EntitlementSnapshot) => void | Promise<void>)
    | null = null;

  constructor(private readonly entitlementService: SubscriptionEntitlementService) {}

  /** Called when CustomerInfo changes (listener) so profile/Supabase can sync. */
  setCustomerInfoEntitlementHandler(
    handler: ((userId: string, entitlement: EntitlementSnapshot) => void | Promise<void>) | null,
  ) {
    this.onCustomerInfoEntitlement = handler;
  }

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
        this.ensureCustomerInfoListener();
        BillingLog.configureSuccess();
        return;
      }

      if (appUserId && configuredForUserId !== appUserId) {
        BillingLog.accountLinkStart(appUserId);
        await Purchases.logIn(appUserId);
        configuredForUserId = appUserId;
        BillingLog.accountLinkSuccess();
      }

      this.ensureCustomerInfoListener();
    } catch (err) {
      BillingLog.configureFailure(toFriendlyBillingError(err, 'generic'));
      if (__DEV__) {
        console.error('[Voxa Billing] Purchases.configure failed (non-blocking)', err);
      }
      // Do not throw — app must boot on free access when billing is unavailable.
    }
  }

  private ensureCustomerInfoListener() {
    if (this.customerInfoListener || !globalConfigured) return;

    this.customerInfoListener = (info: CustomerInfo) => {
      const userId = configuredForUserId;
      if (!userId) return;

      const entitlement = entitlementFromCustomerInfo(info, this.entitlementService);
      BillingLog.customerInfoUpdate(entitlement.isPro);

      void (async () => {
        if (this.onCustomerInfoEntitlement) {
          await this.onCustomerInfoEntitlement(userId, entitlement);
        } else {
          await this.entitlementService.setEntitlement(userId, entitlement);
        }
      })().catch((err) => {
        BillingLog.entitlementRefreshFailure(toFriendlyBillingError(err, 'generic'));
      });
    };

    Purchases.addCustomerInfoUpdateListener(this.customerInfoListener);
  }

  removeCustomerInfoListener() {
    if (!this.customerInfoListener) return;
    Purchases.removeCustomerInfoUpdateListener(this.customerInfoListener);
    this.customerInfoListener = null;
  }

  async logIn(appUserId: string): Promise<CustomerInfoSnapshot> {
    if (!this.isAvailable()) {
      return this.buildUnavailableSnapshot(appUserId);
    }

    BillingLog.accountLinkStart(appUserId);
    try {
      const { customerInfo } = await Purchases.logIn(appUserId);
      configuredForUserId = appUserId;
      this.ensureCustomerInfoListener();
      BillingLog.accountLinkSuccess();
      return this.snapshotFromCustomerInfo(customerInfo, appUserId);
    } catch (err) {
      BillingLog.accountLinkFailure(toFriendlyBillingError(err, 'generic'));
      throw err;
    }
  }

  async logOut(): Promise<void> {
    if (!globalConfigured) return;
    try {
      await Purchases.logOut();
      BillingLog.accountLogoutSuccess();
    } catch (err) {
      BillingLog.accountLogoutFailure(toFriendlyBillingError(err, 'generic'));
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
      configuredForUserId = appUserId;
      const info = await Purchases.getCustomerInfo();
      this.lastRefreshAt = new Date().toISOString();
      const snapshot = this.snapshotFromCustomerInfo(info, appUserId);
      await this.entitlementService.setEntitlement(appUserId, snapshot.entitlement);
      BillingLog.entitlementRefreshSuccess(snapshot.entitlement.isPro);
      return snapshot;
    } catch (err) {
      BillingLog.entitlementRefreshFailure(toFriendlyBillingError(err, 'generic'));
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

      const monthlyId = getRevenueCatMonthlyProductId();
      const annualId = getRevenueCatAnnualProductId();
      const monthly =
        current.availablePackages.find((pkg) => pkg.product.identifier === monthlyId) ??
        current.availablePackages.find((pkg) => mapPeriodFromPackage(pkg) === 'monthly');
      const annual =
        current.availablePackages.find((pkg) => pkg.product.identifier === annualId) ??
        current.availablePackages.find((pkg) => mapPeriodFromPackage(pkg) === 'annual');

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
      BillingLog.offeringLoadFailure(toFriendlyBillingError(err, 'offerings'));
      this.lastOfferings = enrichOfferings(fallbackOfferings());
      return this.lastOfferings;
    }
  }

  async purchaseSubscription(period: BillingPeriod, appUserId: string): Promise<PurchaseOutcome> {
    if (this.purchaseInFlight) {
      return { success: false, errorMessage: 'Purchase already in progress. Please wait a moment.' };
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
          errorMessage: sanitizeBillingMessage(
            offerings.setupMessage ?? 'Monthly package unavailable.',
            'purchase',
          ),
        };
        this.lastPurchase = outcome;
        BillingLog.purchaseFailure(outcome.errorMessage!);
        return outcome;
      }
      if (!offerings.annualPackageValid && period === 'annual') {
        const outcome: PurchaseOutcome = {
          success: false,
          errorMessage: sanitizeBillingMessage(
            offerings.setupMessage ?? 'Annual package unavailable.',
            'purchase',
          ),
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
          errorMessage: sanitizeBillingMessage(
            offerings.setupMessage ?? 'Subscription package unavailable.',
            'purchase',
          ),
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
      if (isBillingUserCancelled(err)) {
        const outcome: PurchaseOutcome = { success: false, cancelled: true };
        this.lastPurchase = outcome;
        BillingLog.purchaseCancelled();
        return outcome;
      }
      if (isBillingPending(err)) {
        const outcome: PurchaseOutcome = {
          success: false,
          pending: true,
          errorMessage: toFriendlyBillingError(err, 'purchase'),
        };
        this.lastPurchase = outcome;
        BillingLog.purchasePending();
        return outcome;
      }

      const outcome: PurchaseOutcome = {
        success: false,
        errorMessage: toFriendlyBillingError(err, 'purchase'),
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
      return { success: false, errorMessage: 'Restore already in progress. Please wait a moment.' };
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
      configuredForUserId = appUserId;
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
        errorMessage: toFriendlyBillingError(err, 'restore'),
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
  } catch {
    return false;
  }
}

export function resetBillingConfigureStateForTests() {
  globalConfigured = false;
  configuredForUserId = undefined;
}
