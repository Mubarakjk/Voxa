export function getAiGatewayUrlFromEnv(): string | undefined {
  const explicit = process.env.EXPO_PUBLIC_AI_GATEWAY_URL?.trim();
  if (explicit) return explicit;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) return undefined;

  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/ai-gateway`;
}

export function hasSupabaseConfigFromEnv(): boolean {
  return Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

export function isAiGatewayConfiguredFromEnv(): boolean {
  return Boolean(getAiGatewayUrlFromEnv() && hasSupabaseConfigFromEnv());
}

export function hasOpenAIKeyFromEnv(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim());
}
