import { AuthError } from '@supabase/supabase-js';

const INTERNAL = /jwt|token|postgres|relation |undefined|stack|fetch failed|failed to fetch|network request|timeout|econnreset|non-2xx/i;

/** User-facing auth copy — never surface backend internals. */
export function formatAuthUserError(error: unknown, fallback: string): string {
  if (error instanceof AuthError) {
    const message = error.message.trim();
    if (/rate limit/i.test(message)) {
      return 'Too many attempts. Wait a little while, then try again.';
    }
    if (/invalid login/i.test(message)) {
      return 'Email or password is incorrect.';
    }
    if (/already registered|already been registered/i.test(message)) {
      return 'An account with this email already exists. Try signing in.';
    }
    if (/email not confirmed/i.test(message)) {
      return 'Please confirm your email, then sign in.';
    }
    if (INTERNAL.test(message) || message.length > 120 || message.includes('{')) {
      return fallback;
    }
    return message || fallback;
  }
  if (error instanceof Error && INTERNAL.test(error.message)) {
    return fallback;
  }
  return fallback;
}
