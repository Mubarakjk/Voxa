/**
 * Home / greeting display-name helpers.
 * Never surface placeholder QA names in App Store-facing copy.
 */

const INVALID_FIRST_NAMES =
  /^(test|tester|testing|user|null|undefined|demo|guest|n\/?a|asdf|foo|bar)$/i;

/**
 * Returns a usable first name from the profile display name, or null when
 * missing / placeholder / invalid for UI.
 */
export function resolveGreetingFirstName(displayName?: string | null): string | null {
  const first = (displayName ?? '').trim().split(/\s+/).filter(Boolean)[0] ?? '';
  if (first.length < 2) return null;
  if (INVALID_FIRST_NAMES.test(first)) return null;
  if (/^(null|undefined)$/i.test(first)) return null;
  return first;
}
