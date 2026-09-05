export type UsageAllowance = {
  plan: 'free' | 'pro';
  metric: string;
  dailyLimit: number | null;
  monthlyLimit: number | null;
  fairUseLimit: number | null;
};

export type UsageCheckResult =
  | { allowed: true; plan: 'free' | 'pro' }
  | { allowed: false; plan: 'free' | 'pro'; code: string; message: string };

export function getDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function getMonthKey(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

export function resolvePlanFromSubscription(status?: string | null): 'free' | 'pro' {
  if (!status) return 'free';
  return ['active', 'trialing', 'billing_issue', 'grace'].includes(status) ? 'pro' : 'free';
}

export function checkUsageAllowance(input: {
  plan: 'free' | 'pro';
  metric: string;
  amount: number;
  dailyUsed: number;
  monthlyUsed: number;
  limits: UsageAllowance;
}): UsageCheckResult {
  const { plan, metric, amount, dailyUsed, monthlyUsed, limits } = input;

  if (plan === 'pro' && limits.fairUseLimit != null) {
    if (dailyUsed + amount > limits.fairUseLimit) {
      return {
        allowed: false,
        plan,
        code: 'fair_use_exceeded',
        message: `Fair-use limit reached for ${metric}.`,
      };
    }
    return { allowed: true, plan };
  }

  if (limits.dailyLimit != null && dailyUsed + amount > limits.dailyLimit) {
    return {
      allowed: false,
      plan,
      code: 'daily_limit',
      message: `Daily limit reached for ${metric}.`,
    };
  }

  if (limits.monthlyLimit != null && monthlyUsed + amount > limits.monthlyLimit) {
    return {
      allowed: false,
      plan,
      code: 'monthly_limit',
      message: `Monthly limit reached for ${metric}.`,
    };
  }

  return { allowed: true, plan };
}

export const ABUSE_LIMITS = {
  maxUserMessageChars: 4_000,
  maxContextPayloadChars: 24_000,
  maxTotalPayloadChars: 28_000,
  maxAudioSeconds: 180,
  maxImageBytes: 12 * 1024 * 1024,
  maxRetryCount: 3,
} as const;

export type ChatPayloadSizeResult =
  | { allowed: true }
  | { allowed: false; plan: 'free' | 'pro'; code: string; message: string };

export function validateChatPayloadSize(
  messages: { role: string; content: string }[],
): ChatPayloadSizeResult {
  const totalChars = messages.reduce((sum, message) => sum + message.content.length, 0);
  const userMessages = messages.filter((message) => message.role === 'user');
  const largestUserMessageChars = userMessages.reduce(
    (max, message) => Math.max(max, message.content.length),
    0,
  );

  if (largestUserMessageChars > ABUSE_LIMITS.maxUserMessageChars) {
    return {
      allowed: false,
      plan: 'free',
      code: 'message_too_large',
      message: 'Message exceeds maximum size.',
    };
  }

  const lastUserMessage = userMessages[userMessages.length - 1];
  const contextChars = totalChars - (lastUserMessage?.content.length ?? 0);

  if (contextChars > ABUSE_LIMITS.maxContextPayloadChars) {
    return {
      allowed: false,
      plan: 'free',
      code: 'context_too_large',
      message: 'Conversation context exceeds maximum size.',
    };
  }

  if (totalChars > ABUSE_LIMITS.maxTotalPayloadChars) {
    return {
      allowed: false,
      plan: 'free',
      code: 'context_too_large',
      message: 'Conversation context exceeds maximum size.',
    };
  }

  return { allowed: true };
}

export function validatePayloadSize(input: {
  messageChars?: number;
  audioSeconds?: number;
  imageBytes?: number;
}): UsageCheckResult | { allowed: true } {
  if (input.messageChars != null && input.messageChars > ABUSE_LIMITS.maxTotalPayloadChars) {
    return {
      allowed: false,
      plan: 'free',
      code: 'context_too_large',
      message: 'Conversation context exceeds maximum size.',
    };
  }
  if (input.audioSeconds != null && input.audioSeconds > ABUSE_LIMITS.maxAudioSeconds) {
    return {
      allowed: false,
      plan: 'free',
      code: 'audio_too_long',
      message: 'Audio exceeds maximum duration.',
    };
  }
  if (input.imageBytes != null && input.imageBytes > ABUSE_LIMITS.maxImageBytes) {
    return {
      allowed: false,
      plan: 'free',
      code: 'image_too_large',
      message: 'Image exceeds maximum size.',
    };
  }
  return { allowed: true };
}
