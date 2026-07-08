import { UserProfile, Goal, Memory, Reminder } from '../../types';

/**
 * Proactive companion architecture — optional, user-controlled nudges only.
 * No manipulation. Each system checks preferences before scheduling anything.
 */

export type ProactiveTriggerKind =
  | 'morning_greeting'
  | 'evening_reflection'
  | 'missed_goal_follow_up'
  | 'birthday_reminder'
  | 'daily_motivation'
  | 'inactivity_check_in';

export type ProactiveTriggerConfig = {
  kind: ProactiveTriggerKind;
  enabled: boolean;
  quietHoursRespected: boolean;
  minimumIntervalHours: number;
  description: string;
};

export type ProactiveEvaluationContext = {
  profile: UserProfile;
  now: Date;
  activeGoals: Goal[];
  memories: Memory[];
  reminders: Reminder[];
  lastActiveAt?: string;
  lastMessageAt?: string;
};

export type ProactiveNudgeProposal = {
  kind: ProactiveTriggerKind;
  title: string;
  body: string;
  scheduledAt: Date;
  data?: Record<string, unknown>;
};

export interface IProactiveCompanionSystem {
  readonly kind: ProactiveTriggerKind;
  isEnabled(profile: UserProfile): boolean;
  evaluate(context: ProactiveEvaluationContext): ProactiveNudgeProposal | null;
}

export class MorningGreetingSystem implements IProactiveCompanionSystem {
  readonly kind = 'morning_greeting' as const;

  isEnabled(profile: UserProfile) {
    return profile.preferences.morningGreetingEnabled !== false && profile.preferences.checkInStyle !== 'off';
  }

  evaluate(context: ProactiveEvaluationContext): ProactiveNudgeProposal | null {
    if (!this.isEnabled(context.profile)) return null;
    const wake = context.profile.onboarding?.sleepSchedule?.wake ?? '08:00';
    const [hour, minute] = wake.split(':').map(Number);
    const at = new Date(context.now);
    at.setHours(hour, minute, 0, 0);
    return {
      kind: this.kind,
      title: `Good morning, ${context.profile.displayName}`,
      body: 'Your companion is here when you want to start the day gently.',
      scheduledAt: at,
    };
  }
}

export class EveningReflectionSystem implements IProactiveCompanionSystem {
  readonly kind = 'evening_reflection' as const;

  isEnabled(profile: UserProfile) {
    return profile.preferences.eveningReflectionEnabled !== false && profile.preferences.checkInStyle !== 'off';
  }

  evaluate(context: ProactiveEvaluationContext): ProactiveNudgeProposal | null {
    if (!this.isEnabled(context.profile)) return null;
    const sleep = context.profile.onboarding?.sleepSchedule?.sleep ?? '21:00';
    const [hour, minute] = sleep.split(':').map(Number);
    const at = new Date(context.now);
    at.setHours(hour, minute, 0, 0);
    return {
      kind: this.kind,
      title: 'Evening reflection',
      body: `${context.profile.displayName}, want a quiet moment to reflect on today?`,
      scheduledAt: at,
    };
  }
}

export class MissedGoalFollowUpSystem implements IProactiveCompanionSystem {
  readonly kind = 'missed_goal_follow_up' as const;

  isEnabled(profile: UserProfile) {
    return profile.preferences.checkInStyle === 'proactive';
  }

  evaluate(context: ProactiveEvaluationContext): ProactiveNudgeProposal | null {
    if (!this.isEnabled(context.profile)) return null;
    const stale = context.activeGoals.find((goal) => goal.progress < 20);
    if (!stale) return null;
    return {
      kind: this.kind,
      title: 'Goal check-in',
      body: `Still thinking about "${stale.title}"? No pressure — I'm here if you want to revisit it.`,
      scheduledAt: new Date(context.now.getTime() + 2 * 60 * 60 * 1000),
      data: { goalId: stale.id },
    };
  }
}

export class BirthdayReminderSystem implements IProactiveCompanionSystem {
  readonly kind = 'birthday_reminder' as const;

  isEnabled(profile: UserProfile) {
    return profile.preferences.checkInStyle !== 'off';
  }

  evaluate(context: ProactiveEvaluationContext): ProactiveNudgeProposal | null {
    if (!this.isEnabled(context.profile)) return null;
    const birthdayMemory = context.memories.find((item) => /birthday/i.test(`${item.title} ${item.content}`));
    if (!birthdayMemory) return null;
    return {
      kind: this.kind,
      title: 'Upcoming birthday',
      body: `You mentioned ${birthdayMemory.title}. Want help planning something thoughtful?`,
      scheduledAt: new Date(context.now.getTime() + 24 * 60 * 60 * 1000),
      data: { memoryId: birthdayMemory.id },
    };
  }
}

export class DailyMotivationSystem implements IProactiveCompanionSystem {
  readonly kind = 'daily_motivation' as const;

  isEnabled(profile: UserProfile) {
    return profile.preferences.checkInStyle === 'proactive';
  }

  evaluate(context: ProactiveEvaluationContext): ProactiveNudgeProposal | null {
    if (!this.isEnabled(context.profile)) return null;
    const goal = context.activeGoals[0];
    if (!goal) return null;
    return {
      kind: this.kind,
      title: 'A small nudge',
      body: `"${goal.title}" — one tiny step today is enough.`,
      scheduledAt: new Date(context.now.getTime() + 4 * 60 * 60 * 1000),
      data: { goalId: goal.id },
    };
  }
}

export class InactivityCheckInSystem implements IProactiveCompanionSystem {
  readonly kind = 'inactivity_check_in' as const;

  isEnabled(profile: UserProfile) {
    return profile.preferences.checkInStyle !== 'off';
  }

  evaluate(context: ProactiveEvaluationContext): ProactiveNudgeProposal | null {
    if (!this.isEnabled(context.profile)) return null;
    if (!context.lastMessageAt) return null;
    const hoursSince = (context.now.getTime() - new Date(context.lastMessageAt).getTime()) / (1000 * 60 * 60);
    if (hoursSince < 48) return null;
    return {
      kind: this.kind,
      title: 'Thinking of you',
      body: `${context.profile.displayName}, no pressure — I'm here whenever you want to talk.`,
      scheduledAt: new Date(context.now.getTime() + 60 * 60 * 1000),
    };
  }
}

export class ProactiveCompanionRegistry {
  readonly systems: IProactiveCompanionSystem[] = [
    new MorningGreetingSystem(),
    new EveningReflectionSystem(),
    new MissedGoalFollowUpSystem(),
    new BirthdayReminderSystem(),
    new DailyMotivationSystem(),
    new InactivityCheckInSystem(),
  ];

  evaluateAll(context: ProactiveEvaluationContext): ProactiveNudgeProposal[] {
    return this.systems
      .map((system) => system.evaluate(context))
      .filter((item): item is ProactiveNudgeProposal => item !== null);
  }

  getDefaultConfigs(profile: UserProfile): ProactiveTriggerConfig[] {
    return this.systems.map((system) => ({
      kind: system.kind,
      enabled: system.isEnabled(profile),
      quietHoursRespected: true,
      minimumIntervalHours: 24,
      description: system.kind.replace(/_/g, ' '),
    }));
  }
}

export const proactiveCompanionRegistry = new ProactiveCompanionRegistry();

export class ProactiveCompanionCoordinator {
  constructor(private readonly registry: ProactiveCompanionRegistry = proactiveCompanionRegistry) {}

  /** Architecture-only: returns proposals; scheduling is explicit and opt-in. */
  async planNudges(context: ProactiveEvaluationContext): Promise<ProactiveNudgeProposal[]> {
    if (context.profile.preferences.checkInStyle === 'off') return [];
    if (context.profile.onboarding?.notificationPreference === 'off') return [];
    return this.registry.evaluateAll(context);
  }
}

export function createProactiveCompanionCoordinator() {
  return new ProactiveCompanionCoordinator();
}
