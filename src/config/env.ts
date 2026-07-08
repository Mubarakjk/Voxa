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

export function getSupabaseUrl(): string | undefined {
  return process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || undefined;
}

export function getSupabaseAnonKey(): string | undefined {
  return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || undefined;
}

export function hasSupabaseConfig(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function isFoundingMemberEnabled(): boolean {
  return process.env.EXPO_PUBLIC_FOUNDING_MEMBER_ENABLED === 'true';
}

export function getDataSourceMode(): 'supabase' | 'local' {
  return hasSupabaseConfig() ? 'supabase' : 'local';
}

export function getAudDApiToken(): string | undefined {
  return process.env.EXPO_PUBLIC_AUDD_API_TOKEN?.trim() || undefined;
}

export function hasAudDApiToken(): boolean {
  return Boolean(getAudDApiToken());
}

export function getACRCloudConfig(): { host: string; accessKey: string; accessSecret: string } | null {
  const host = process.env.EXPO_PUBLIC_ACRCLOUD_HOST?.trim();
  const accessKey = process.env.EXPO_PUBLIC_ACRCLOUD_ACCESS_KEY?.trim();
  const accessSecret = process.env.EXPO_PUBLIC_ACRCLOUD_ACCESS_SECRET?.trim();
  if (!host || !accessKey || !accessSecret) return null;
  return { host, accessKey, accessSecret };
}

export function hasACRCloudConfig(): boolean {
  return Boolean(getACRCloudConfig());
}
