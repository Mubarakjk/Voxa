/**
 * Expo inlines EXPO_PUBLIC_* variables at build time.
 * Restart the dev server after changing .env.
 */
export function getOpenAIApiKey(): string | undefined {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim();
  return key || undefined;
}

export function hasOpenAIApiKey(): boolean {
  return Boolean(getOpenAIApiKey());
}
