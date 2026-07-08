import { FREE_PLAN_LIMITS, PRO_PLAN_LIMITS } from '../../constants/pricing';
import {
  GateFeature,
  GateResult,
  isUnlimited,
  PlanLimits,
  PlanStatus,
  UsageBucket,
} from '../../types/subscription';

type LimitCheck = {
  daily: number;
  monthly: number;
  dailyLimit: number;
  monthlyLimit: number;
  feature: GateFeature;
  label: string;
};

export class FeatureGateService {
  resolveLimits(status: PlanStatus): PlanLimits {
    return status.isPro ? PRO_PLAN_LIMITS : FREE_PLAN_LIMITS;
  }

  private checkLimit(input: LimitCheck): GateResult {
    if (isUnlimited(input.dailyLimit) && isUnlimited(input.monthlyLimit)) {
      return { allowed: true, feature: input.feature };
    }

    if (!isUnlimited(input.dailyLimit) && input.daily >= input.dailyLimit) {
      return {
        allowed: false,
        feature: input.feature,
        limitReached: true,
        upgradeRequired: true,
        reason: `Daily ${input.label} limit reached. Resets tomorrow.`,
        resetsAt: tomorrowIso(),
      };
    }

    if (!isUnlimited(input.monthlyLimit) && input.monthly >= input.monthlyLimit) {
      return {
        allowed: false,
        feature: input.feature,
        limitReached: true,
        upgradeRequired: true,
        reason: `Monthly ${input.label} limit reached.`,
        resetsAt: nextMonthIso(),
      };
    }

    return { allowed: true, feature: input.feature };
  }

  private proOnly(feature: GateFeature, label: string, status: PlanStatus): GateResult {
    if (status.isPro) return { allowed: true, feature };
    return {
      allowed: false,
      feature,
      upgradeRequired: true,
      reason: `${label} is a Voxa Pro feature.`,
    };
  }

  canUseAiChat(status: PlanStatus, usage: UsageBucket): GateResult {
    const limits = this.resolveLimits(status);
    return this.checkLimit({
      feature: 'ai_chat',
      label: 'AI messages',
      daily: usage.daily.aiMessages,
      monthly: usage.monthly.aiMessages,
      dailyLimit: limits.aiMessagesDaily,
      monthlyLimit: limits.aiMessagesMonthly,
    });
  }

  canUseVoice(status: PlanStatus, usage: UsageBucket): GateResult {
    const limits = this.resolveLimits(status);
    return this.checkLimit({
      feature: 'voice_call',
      label: 'voice minutes',
      daily: usage.daily.voiceMinutes,
      monthly: usage.monthly.voiceMinutes,
      dailyLimit: limits.voiceMinutesDaily,
      monthlyLimit: limits.voiceMinutesMonthly,
    });
  }

  canUseVoiceNote(status: PlanStatus, usage: UsageBucket): GateResult {
    const limits = this.resolveLimits(status);
    return this.checkLimit({
      feature: 'voice_note',
      label: 'voice notes',
      daily: usage.daily.voiceNotes,
      monthly: usage.monthly.voiceNotes,
      dailyLimit: limits.voiceNotesDaily,
      monthlyLimit: limits.voiceNotesMonthly,
    });
  }

  canUploadImage(status: PlanStatus, usage: UsageBucket): GateResult {
    const limits = this.resolveLimits(status);
    return this.checkLimit({
      feature: 'image_upload',
      label: 'image uploads',
      daily: usage.daily.imageUploads,
      monthly: usage.monthly.imageUploads,
      dailyLimit: limits.imageUploadsDaily,
      monthlyLimit: limits.imageUploadsMonthly,
    });
  }

  canUploadVideo(status: PlanStatus, usage: UsageBucket): GateResult {
    const limits = this.resolveLimits(status);
    return this.checkLimit({
      feature: 'video_upload',
      label: 'video uploads',
      daily: usage.daily.videoUploads,
      monthly: usage.monthly.videoUploads,
      dailyLimit: limits.videoUploadsDaily,
      monthlyLimit: limits.videoUploadsMonthly,
    });
  }

  canUploadDocument(status: PlanStatus, usage: UsageBucket): GateResult {
    const limits = this.resolveLimits(status);
    return this.checkLimit({
      feature: 'document_upload',
      label: 'documents',
      daily: usage.daily.documents,
      monthly: usage.monthly.documents,
      dailyLimit: limits.documentsDaily,
      monthlyLimit: limits.documentsMonthly,
    });
  }

  canUseUnlimitedMemory(status: PlanStatus, usage: UsageBucket): GateResult {
    const limits = this.resolveLimits(status);
    if (isUnlimited(limits.memoriesMax)) return { allowed: true, feature: 'unlimited_memory' };
    if (usage.memoryCount >= limits.memoriesMax) {
      return {
        allowed: false,
        feature: 'unlimited_memory',
        limitReached: true,
        upgradeRequired: true,
        reason: `Memory limit reached (${limits.memoriesMax}).`,
      };
    }
    return { allowed: true, feature: 'unlimited_memory' };
  }

  canCreateGoal(status: PlanStatus, usage: UsageBucket): GateResult {
    const limits = this.resolveLimits(status);
    if (isUnlimited(limits.goalsMax)) return { allowed: true, feature: 'unlimited_goals' };
    if (usage.goalCount >= limits.goalsMax) {
      return {
        allowed: false,
        feature: 'unlimited_goals',
        limitReached: true,
        upgradeRequired: true,
        reason: `Goal limit reached (${limits.goalsMax}).`,
      };
    }
    return { allowed: true, feature: 'unlimited_goals' };
  }

  canCreateReminder(status: PlanStatus, usage: UsageBucket): GateResult {
    const limits = this.resolveLimits(status);
    if (isUnlimited(limits.remindersMax)) return { allowed: true, feature: 'unlimited_reminders' };
    if (usage.reminderCount >= limits.remindersMax) {
      return {
        allowed: false,
        feature: 'unlimited_reminders',
        limitReached: true,
        upgradeRequired: true,
        reason: `Reminder limit reached (${limits.remindersMax}).`,
      };
    }
    return { allowed: true, feature: 'unlimited_reminders' };
  }

  canUseTimeline(status: PlanStatus): GateResult {
    return this.proOnly('timeline', 'Relationship timeline', status);
  }

  canUseMultiplePersonalities(status: PlanStatus): GateResult {
    return this.proOnly('multiple_personalities', 'Multiple personalities', status);
  }

  canUsePremiumVoices(status: PlanStatus): GateResult {
    return this.proOnly('premium_voices', 'Premium voices', status);
  }

  canUseAdvancedMemory(status: PlanStatus): GateResult {
    return this.proOnly('advanced_memory', 'Advanced memory', status);
  }

  canUseCalendarIntegration(status: PlanStatus): GateResult {
    return this.proOnly('calendar_integration', 'Calendar integration', status);
  }

  canUseEmailAssistant(status: PlanStatus): GateResult {
    return this.proOnly('email_assistant', 'Email assistant', status);
  }

  canUseDocumentUnderstanding(status: PlanStatus): GateResult {
    return this.proOnly('document_understanding', 'Document understanding', status);
  }

  canUsePriorityAi(status: PlanStatus): GateResult {
    return this.proOnly('priority_ai', 'Priority AI', status);
  }

  getRemainingLimits(status: PlanStatus, usage: UsageBucket) {
    const limits = this.resolveLimits(status);
    const remaining = (limit: number, used: number) =>
      isUnlimited(limit) ? 'Unlimited' : String(Math.max(0, limit - used));

    return {
      aiMessagesDaily: remaining(limits.aiMessagesDaily, usage.daily.aiMessages),
      aiMessagesMonthly: remaining(limits.aiMessagesMonthly, usage.monthly.aiMessages),
      voiceMinutesDaily: remaining(limits.voiceMinutesDaily, usage.daily.voiceMinutes),
      imageUploadsDaily: remaining(limits.imageUploadsDaily, usage.daily.imageUploads),
      videoUploadsDaily: remaining(limits.videoUploadsDaily, usage.daily.videoUploads),
      voiceNotesDaily: remaining(limits.voiceNotesDaily, usage.daily.voiceNotes),
      memories: remaining(limits.memoriesMax, usage.memoryCount),
      goals: remaining(limits.goalsMax, usage.goalCount),
      reminders: remaining(limits.remindersMax, usage.reminderCount),
    };
  }
}

function tomorrowIso(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function nextMonthIso(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 1, 1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}
