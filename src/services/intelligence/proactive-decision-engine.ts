import { ProactiveDecision } from '../../types/companion-intelligence';
import {
  CompanionIntelligenceBundle,
  CompanionIntelligenceProfile,
} from '../../types/companion-intelligence';
import { Goal, Reminder, UserProfile } from '../../types';

export type ProactiveSignalKind =
  | 'missed_goal'
  | 'missed_reminder'
  | 'birthday'
  | 'inactivity'
  | 'morning_greeting'
  | 'evening_reflection'
  | 'study_routine'
  | 'workout_routine'
  | 'user_check_in';

export type ProactiveDecisionInput = {
  profile: UserProfile;
  bundle: CompanionIntelligenceBundle;
  goals: Goal[];
  reminders: Reminder[];
  lastMessageAt?: string;
  now?: Date;
};

const MIN_INACTIVITY_HOURS = 48;
const MAX_PROACTIVE_PER_DAY = 2;

export class ProactiveDecisionEngine {
  evaluate(input: ProactiveDecisionInput): ProactiveDecision {
    const now = input.now ?? new Date();
    const prefs = input.profile.preferences;

    if (prefs.checkInStyle === 'off' || input.profile.onboarding?.notificationPreference === 'off') {
      return this.no('User disabled check-ins');
    }

    if (this.isQuietHours(prefs.quietHoursStart, prefs.quietHoursEnd, now)) {
      return this.no('Quiet hours');
    }

    const signals = this.collectSignals(input, now);
    if (signals.length === 0) return this.no('No relevant signals');

    const best = signals.sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority))[0];

    if (best.priority === 'low' && prefs.checkInStyle !== 'proactive') {
      return this.no('Gentle mode — low priority signal skipped');
    }

    const proactivity = prefs.companionControls?.proactivity ?? 0.45;
    if (best.priority === 'medium' && proactivity < 0.35) {
      return this.no('User prefers low proactivity');
    }

    return {
      shouldReachOut: true,
      reason: best.reason,
      kind: best.kind,
      priority: best.priority,
      suggestedMessage: best.message,
    };
  }

  private collectSignals(input: ProactiveDecisionInput, now: Date) {
    const signals: Array<{
      kind: ProactiveSignalKind;
      reason: string;
      priority: ProactiveDecision['priority'];
      message: string;
    }> = [];

    const hour = now.getHours();
    const ip = input.bundle.profile;

    if (input.profile.preferences.morningGreetingEnabled && hour >= 7 && hour <= 10) {
      signals.push({
        kind: 'morning_greeting',
        reason: 'Morning window',
        priority: 'low',
        message: this.morningMessage(input.profile.displayName, ip),
      });
    }

    if (input.profile.preferences.eveningReflectionEnabled && hour >= 20 && hour <= 22) {
      signals.push({
        kind: 'evening_reflection',
        reason: 'Evening reflection window',
        priority: 'low',
        message: `${input.profile.displayName}, whenever you're ready — how did today feel?`,
      });
    }

    const staleGoal = input.goals.find((g) => g.status === 'active' && g.progress < 15);
    if (staleGoal && input.profile.preferences.checkInStyle === 'proactive') {
      signals.push({
        kind: 'missed_goal',
        reason: `Goal "${staleGoal.title}" has little progress`,
        priority: 'medium',
        message: `Still thinking about "${staleGoal.title}"? No pressure — want to talk through a small next step?`,
      });
    }

    const missedReminder = input.reminders.find(
      (r) => r.status === 'scheduled' && new Date(r.scheduledAt) < now,
    );
    if (missedReminder) {
      signals.push({
        kind: 'missed_reminder',
        reason: `Missed reminder: ${missedReminder.title}`,
        priority: 'medium',
        message: `You had "${missedReminder.title}" scheduled. Want to reschedule or talk it through?`,
      });
    }

    const birthday = ip.importantDates.find((d) => d.category === 'birthday');
    if (birthday) {
      signals.push({
        kind: 'birthday',
        reason: `Upcoming date: ${birthday.label}`,
        priority: 'medium',
        message: `You mentioned ${birthday.label}. Want help planning something meaningful?`,
      });
    }

    if (input.lastMessageAt) {
      const hoursSince =
        (now.getTime() - new Date(input.lastMessageAt).getTime()) / (1000 * 60 * 60);
      if (hoursSince >= MIN_INACTIVITY_HOURS) {
        signals.push({
          kind: 'inactivity',
          reason: `${Math.floor(hoursSince)}h since last message`,
          priority: 'low',
          message: `${input.profile.displayName}, I'm here when you want to talk — no pressure at all.`,
        });
      }
    }

    if (ip.studyProgress.length > 0 && hour >= 14 && hour <= 18) {
      signals.push({
        kind: 'study_routine',
        reason: 'Study routine window',
        priority: 'low',
        message: `Want a focused study check-in on ${ip.studyProgress[0]}?`,
      });
    }

    if (ip.fitnessProgress.length > 0 && (hour <= 9 || (hour >= 17 && hour <= 20))) {
      signals.push({
        kind: 'workout_routine',
        reason: 'Workout routine window',
        priority: 'low',
        message: `How's ${ip.fitnessProgress[0]} going today?`,
      });
    }

    return signals.slice(0, MAX_PROACTIVE_PER_DAY);
  }

  private morningMessage(name: string, ip: CompanionIntelligenceProfile) {
    const focus = ip.goals[0] ?? ip.currentChallenges[0];
    if (focus) return `Good morning, ${name}. When you're ready, we could touch on ${focus}.`;
    return `Good morning, ${name}. I'm here for whatever kind of day this turns out to be.`;
  }

  private isQuietHours(start?: string, end?: string, now = new Date()) {
    if (!start || !end) return false;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const mins = now.getHours() * 60 + now.getMinutes();
    const startM = sh * 60 + sm;
    const endM = eh * 60 + em;
    if (startM <= endM) return mins >= startM && mins <= endM;
    return mins >= startM || mins <= endM;
  }

  private no(reason: string): ProactiveDecision {
    return {
      shouldReachOut: false,
      reason,
      kind: null,
      priority: 'low',
      suggestedMessage: null,
    };
  }
}

function priorityRank(p: ProactiveDecision['priority']) {
  if (p === 'high') return 3;
  if (p === 'medium') return 2;
  return 1;
}

export const proactiveDecisionEngine = new ProactiveDecisionEngine();
