import { ISODateString } from './common';

export type SubscriptionPlan = 'free' | 'pro';

export type BillingPeriod = 'monthly' | 'annual' | 'founding';

export type UserSubscription = {
  subscriptionPlan: SubscriptionPlan;
  trialStart?: ISODateString;
  trialEnd?: ISODateString;
  trialActive: boolean;
  trialUsed: boolean;
  isFoundingMember?: boolean;
  foundingMemberNumber?: number;
  /** RevenueCat / store product id when billing is wired. */
  productId?: string;
  /** Provider-side subscription status placeholder. */
  billingStatus?: 'none' | 'trialing' | 'active' | 'expired' | 'cancelled';
};

export type UsageMetric =
  | 'aiMessages'
  | 'voiceMinutes'
  | 'imageUploads'
  | 'videoUploads'
  | 'voiceNotes'
  | 'documents'
  | 'storageBytes';

export type UsageBucket = {
  daily: Record<UsageMetric, number>;
  monthly: Record<UsageMetric, number>;
  /** ISO date keys for daily rollover */
  dailyKey: string;
  monthlyKey: string;
  memoryCount: number;
  goalCount: number;
  reminderCount: number;
};

export type PlanLimits = {
  aiMessagesDaily: number;
  aiMessagesMonthly: number;
  voiceMinutesDaily: number;
  voiceMinutesMonthly: number;
  imageUploadsDaily: number;
  imageUploadsMonthly: number;
  videoUploadsDaily: number;
  videoUploadsMonthly: number;
  voiceNotesDaily: number;
  voiceNotesMonthly: number;
  documentsDaily: number;
  documentsMonthly: number;
  storageBytesMonthly: number;
  memoriesMax: number;
  goalsMax: number;
  remindersMax: number;
  routinesMax: number;
  historyDays: number;
};

export type GateFeature =
  | 'ai_chat'
  | 'voice_call'
  | 'voice_note'
  | 'image_upload'
  | 'video_upload'
  | 'document_upload'
  | 'unlimited_memory'
  | 'advanced_memory'
  | 'pinned_memory'
  | 'memory_connections'
  | 'timeline'
  | 'multiple_personalities'
  | 'premium_voices'
  | 'calendar_integration'
  | 'email_assistant'
  | 'document_understanding'
  | 'priority_ai'
  | 'unlimited_goals'
  | 'unlimited_reminders'
  | 'life_os'
  | 'future_self'
  | 'vision_board'
  | 'bucket_list'
  | 'life_book'
  | 'decision_simulator'
  | 'debate_mode'
  | 'weekly_letter'
  | 'mood_insights'
  | 'conversation_worlds'
  | 'coaching_hub'
  | 'dream_journal'
  | 'arcade_full'
  | 'premium_cosmetics'
  | 'sports_intelligence'
  | 'exports';

export type GateResult = {
  allowed: boolean;
  feature: GateFeature;
  reason?: string;
  limitReached?: boolean;
  resetsAt?: ISODateString;
  upgradeRequired?: boolean;
};

export type PlanStatus = {
  effectivePlan: SubscriptionPlan;
  isPro: boolean;
  isTrialActive: boolean;
  trialDaysLeft: number;
  trialEnd?: ISODateString;
  subscriptionPlan: SubscriptionPlan;
  isFoundingMember: boolean;
  billingPeriod?: BillingPeriod;
  renewalDate?: ISODateString;
  billingIssue?: boolean;
  gracePeriod?: boolean;
  entitlementSource?: 'revenuecat' | 'platform_trial' | 'dev_override' | 'none';
  productId?: string;
};

export function createDefaultSubscription(): UserSubscription {
  return {
    subscriptionPlan: 'free',
    trialActive: false,
    trialUsed: false,
    billingStatus: 'none',
  };
}

export const UNLIMITED = -1;

export function isUnlimited(value: number): boolean {
  return value < 0;
}
