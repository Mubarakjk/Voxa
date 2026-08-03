/** User-facing restore copy — keep consistent across You, Paywall, and Billing QA. */

export const RESTORE_SUCCESS_MESSAGE = 'Voxa Pro has been restored.';

export const RESTORE_NONE_MESSAGE =
  'No active Voxa Pro subscription was found for this Apple ID.';

export const RESTORE_FAILURE_MESSAGE =
  "We couldn't restore purchases right now. Please try again.";

export function restoreAlertTitle(isPro: boolean): string {
  return isPro ? 'Restored' : 'No subscription found';
}

export function restoreAlertMessage(isPro: boolean): string {
  return isPro ? RESTORE_SUCCESS_MESSAGE : RESTORE_NONE_MESSAGE;
}
