/**
 * Central Voxa Pro pricing display fallbacks.
 * Store product IDs come from environment via `src/config/revenuecat-env.ts` — not hard-coded here.
 */
export const VOXA_PRICING = {
  monthlyFallbackGBP: 4.99,
  annualFallbackGBP: 39.99,
  entitlementId: 'voxa_pro',
  offeringId: 'default',
  trialDaysDisplayFallback: 7,
  currency: 'GBP',
  currencySymbol: '£',
} as const;

export type VoxaProductPeriod = 'monthly' | 'annual';

export function formatFallbackPrice(amount: number, currencySymbol = VOXA_PRICING.currencySymbol): string {
  return `${currencySymbol}${amount.toFixed(2)}`;
}

export function calculateAnnualSavingsPercent(monthly: number, annual: number): number {
  if (monthly <= 0) return 0;
  const monthlyAnnualised = monthly * 12;
  if (monthlyAnnualised <= annual) return 0;
  return Math.round(((monthlyAnnualised - annual) / monthlyAnnualised) * 100);
}

export function calculateAnnualSavingsAmount(monthly: number, annual: number): number {
  return Math.max(0, monthly * 12 - annual);
}
