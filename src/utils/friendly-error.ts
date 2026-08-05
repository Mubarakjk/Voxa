/** Human-readable copy for production — raw errors stay in Metro via console. */
export function friendlyErrorMessage(
  err: unknown,
  fallback: string,
): string {
  if (__DEV__ && err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return fallback;
}

export const FRIENDLY_ERRORS = {
  home: "We couldn't load Home right now. Check your connection and try again.",
  memories: "We couldn't load your saved moments. Check your connection and try again.",
  notes: "We couldn't load your notes. Check your connection and try again.",
  generic: 'Something went wrong. Please try again.',
} as const;
