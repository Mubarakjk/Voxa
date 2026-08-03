/** Map raw store / RevenueCat errors to calm, recoverable copy. Never show raw provider strings. */

export function isBillingUserCancelled(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { userCancelled?: boolean; code?: string | number };
  return (
    candidate.userCancelled === true ||
    candidate.code === 'PurchaseCancelledError' ||
    candidate.code === 1
  );
}

export function isBillingPending(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const code = (error as { code?: string | number }).code;
  return code === 'PURCHASE_PENDING_ERROR' || code === 'PaymentPendingError';
}

function rawMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '');
  }
  return '';
}

export function toFriendlyBillingError(
  error: unknown,
  context: 'purchase' | 'restore' | 'offerings' | 'generic' = 'generic',
): string {
  if (isBillingUserCancelled(error)) {
    return 'Purchase cancelled — no charge was made.';
  }
  if (isBillingPending(error)) {
    return 'Your purchase is pending store approval. Voxa Pro will unlock when it completes.';
  }

  const lower = rawMessage(error).toLowerCase();

  if (
    lower.includes('network') ||
    lower.includes('offline') ||
    lower.includes('internet') ||
    lower.includes('timed out') ||
    lower.includes('timeout')
  ) {
    return 'Check your connection and try again. You won’t be charged twice.';
  }

  if (lower.includes('not available') || lower.includes('store problem') || lower.includes('storekit')) {
    return 'The App Store isn’t available right now. Please try again in a moment.';
  }

  if (lower.includes('not allowed') || lower.includes('permission') || lower.includes('restricted')) {
    return 'Purchases aren’t available on this device right now.';
  }

  if (lower.includes('product') && (lower.includes('not found') || lower.includes('invalid'))) {
    return 'This subscription isn’t available yet. Please try again later.';
  }

  if (lower.includes('receipt') || lower.includes('already')) {
    return context === 'restore'
      ? 'We couldn’t verify a subscription for this Apple ID. Try Restore again, or contact support if you were charged.'
      : 'This Apple ID may already own this subscription. Try Restore Purchases.';
  }

  if (context === 'restore') {
    return 'We couldn’t restore purchases right now. Please try again in a moment.';
  }
  if (context === 'offerings') {
    return 'We couldn’t load pricing right now. Pull to refresh or try again shortly.';
  }
  if (context === 'purchase') {
    return 'We couldn’t complete that purchase. Please try again.';
  }
  return 'Something went wrong with billing. Please try again.';
}

/** Sanitize an already-string errorMessage from PurchaseOutcome. */
export function sanitizeBillingMessage(
  message: string | null | undefined,
  context: 'purchase' | 'restore' | 'offerings' | 'generic' = 'generic',
): string {
  if (!message?.trim()) {
    return toFriendlyBillingError(null, context);
  }
  return toFriendlyBillingError(new Error(message), context);
}
