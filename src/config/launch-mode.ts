/**
 * V1 launch strategy: fully free, all features unlocked.
 * RevenueCat / BillingService remain in the codebase but stay dormant.
 *
 * Set EXPO_PUBLIC_FREE_LAUNCH_MODE=false to re-enable subscriptions later.
 */
export function isFreeLaunchMode(): boolean {
  return process.env.EXPO_PUBLIC_FREE_LAUNCH_MODE !== 'false';
}

/** RevenueCat SDK configure, purchase, and paywall UI are disabled. */
export function isBillingDormant(): boolean {
  return isFreeLaunchMode();
}

/** Paywall routes and upgrade prompts must not appear. */
export function isPaywallEnabled(): boolean {
  return !isFreeLaunchMode();
}

/** All feature gates and usage limits are bypassed. */
export function areAllFeaturesUnlocked(): boolean {
  return isFreeLaunchMode();
}
