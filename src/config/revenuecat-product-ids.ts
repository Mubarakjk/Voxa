/**
 * App Store Connect / Play product identifiers for Voxa Pro.
 * Override via env — no hard-coded usage in pricing constants.
 */

const DEFAULT_MONTHLY_PRODUCT_ID = 'voxa_pro_monthly';
const DEFAULT_ANNUAL_PRODUCT_ID = 'voxa_pro_annual';

export function getRevenueCatMonthlyProductId(): string {
  return process.env.EXPO_PUBLIC_REVENUECAT_PRODUCT_MONTHLY?.trim() || DEFAULT_MONTHLY_PRODUCT_ID;
}

export function getRevenueCatAnnualProductId(): string {
  return process.env.EXPO_PUBLIC_REVENUECAT_PRODUCT_ANNUAL?.trim() || DEFAULT_ANNUAL_PRODUCT_ID;
}

export function getRevenueCatProductIds(): { monthly: string; annual: string } {
  return {
    monthly: getRevenueCatMonthlyProductId(),
    annual: getRevenueCatAnnualProductId(),
  };
}
