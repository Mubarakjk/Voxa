import { BillingPeriod, PlanLimits, UNLIMITED } from '../types/subscription';

/** Central pricing & plan configuration — single source of truth. */
export const PRICING_CONFIG = {
  currency: 'GBP',
  currencySymbol: '£',
  trialDays: 7,
  foundingMemberSlots: 1000,
  foundingMemberEnabled: process.env.EXPO_PUBLIC_FOUNDING_MEMBER_ENABLED === 'true',
  plans: {
    free: {
      id: 'free' as const,
      label: 'Free',
      description: 'Everything you need to start with Voxa.',
    },
    pro: {
      id: 'pro' as const,
      label: 'Voxa Pro',
      description: 'Unlimited conversations, voice, and premium intelligence.',
    },
  },
  prices: {
    monthly: 7.99,
    annual: 59.99,
    founding: 5.99,
  },
  billingPeriods: {
    monthly: {
      id: 'monthly' as BillingPeriod,
      label: 'Monthly',
      price: 7.99,
      periodLabel: '/month',
    },
    annual: {
      id: 'annual' as BillingPeriod,
      label: 'Annual',
      price: 59.99,
      periodLabel: '/year',
      savingsLabel: 'Save 37%',
    },
    founding: {
      id: 'founding' as BillingPeriod,
      label: 'Founding Member',
      price: 5.99,
      periodLabel: '/month forever',
      badge: 'Limited',
      slots: 1000,
    },
  },
} as const;

export const FREE_PLAN_LIMITS: PlanLimits = {
  aiMessagesDaily: 20,
  aiMessagesMonthly: 200,
  voiceMinutesDaily: 5,
  voiceMinutesMonthly: 30,
  imageUploadsDaily: 3,
  imageUploadsMonthly: 30,
  voiceNotesDaily: 5,
  voiceNotesMonthly: 50,
  videoUploadsDaily: 1,
  videoUploadsMonthly: 10,
  documentsDaily: 2,
  documentsMonthly: 20,
  storageBytesMonthly: 100 * 1024 * 1024,
  memoriesMax: 50,
  goalsMax: 5,
  remindersMax: 10,
  historyDays: 30,
};

export const PRO_PLAN_LIMITS: PlanLimits = {
  aiMessagesDaily: UNLIMITED,
  aiMessagesMonthly: UNLIMITED,
  voiceMinutesDaily: UNLIMITED,
  voiceMinutesMonthly: UNLIMITED,
  imageUploadsDaily: UNLIMITED,
  imageUploadsMonthly: UNLIMITED,
  videoUploadsDaily: UNLIMITED,
  videoUploadsMonthly: UNLIMITED,
  voiceNotesDaily: UNLIMITED,
  voiceNotesMonthly: UNLIMITED,
  documentsDaily: UNLIMITED,
  documentsMonthly: UNLIMITED,
  storageBytesMonthly: UNLIMITED,
  memoriesMax: UNLIMITED,
  goalsMax: UNLIMITED,
  remindersMax: UNLIMITED,
  historyDays: UNLIMITED,
};

export const PRO_FEATURES = [
  'Unlimited AI conversations',
  'Unlimited voice conversations',
  'Unlimited voice notes',
  'Unlimited photos & videos',
  'Unlimited documents',
  'Unlimited memories & goals',
  'Premium voices',
  'Multiple personalities',
  'Advanced memory',
  'Relationship timeline',
  'Priority AI responses',
  'Early access features',
] as const;

export const FREE_FEATURES = [
  'Basic chat',
  'Limited AI messages',
  'Basic memory & reminders',
  'Daily briefing',
  'One companion',
  'Basic customisation',
  'Limited media uploads',
] as const;

export function formatPrice(amount: number): string {
  return `${PRICING_CONFIG.currencySymbol}${amount.toFixed(2)}`;
}

export function isFoundingMemberOfferEnabled(): boolean {
  return PRICING_CONFIG.foundingMemberEnabled;
}
