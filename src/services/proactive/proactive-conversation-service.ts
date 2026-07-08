import { UserProfile } from '../../types';
import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { Goal, Reminder } from '../../types';

export type ProactiveConversationKind =
  | 'good_morning'
  | 'good_night'
  | 'interview_today'
  | 'gym_checkin'
  | 'feeling_checkin'
  | 'goal_followup'
  | 'missed_yesterday'
  | 'birthday';

export type ProactiveConversationPrompt = {
  kind: ProactiveConversationKind;
  message: string;
  priority: number;
  shouldShowOnHome: boolean;
};

export type ProactiveInput = {
  profile: UserProfile;
  bundle: CompanionIntelligenceBundle;
  goals: Goal[];
  reminders: Reminder[];
  lastConversationAt?: string;
  now?: Date;
};

/** Daily proactive prompts — Home/chat only, no push yet. */
export class ProactiveConversationService {
  evaluate(input: ProactiveInput): ProactiveConversationPrompt | null {
    const now = input.now ?? new Date();
    const hour = now.getHours();
    const name = input.profile.displayName.split(' ')[0];
    const candidates: ProactiveConversationPrompt[] = [];

    if (hour >= 6 && hour < 11) {
      candidates.push({
        kind: 'good_morning',
        message: `Good morning, ${name}. How did you sleep?`,
        priority: 40,
        shouldShowOnHome: true,
      });
    }

    if (hour >= 21 || hour < 5) {
      candidates.push({
        kind: 'good_night',
        message: `Good night, ${name}. Rest well — I'm here if you need me.`,
        priority: 35,
        shouldShowOnHome: true,
      });
    }

    const interview = input.reminders.find((r) => /interview|presentation|meeting prep/i.test(r.title));
    if (interview) {
      const hoursUntil = (new Date(interview.scheduledAt).getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntil >= 0 && hoursUntil <= 24) {
        candidates.push({
          kind: 'interview_today',
          message: `Interview today? You've got this. Want to practice?`,
          priority: 90,
          shouldShowOnHome: true,
        });
      }
    }

    const gym = input.reminders.find((r) => /gym|workout|exercise/i.test(r.title));
    if (gym) {
      candidates.push({
        kind: 'gym_checkin',
        message: 'How was the gym?',
        priority: 50,
        shouldShowOnHome: true,
      });
    }

    const activeGoal = input.goals.find((g) => g.status === 'active' && g.progress > 0);
    if (activeGoal) {
      candidates.push({
        kind: 'goal_followup',
        message: `Did you finish "${activeGoal.title}" yet?`,
        priority: 55,
        shouldShowOnHome: true,
      });
    }

    if (input.lastConversationAt) {
      const daysSince =
        (now.getTime() - new Date(input.lastConversationAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince >= 1.5) {
        candidates.push({
          kind: 'missed_yesterday',
          message: `Miss talking yesterday. How are you feeling?`,
          priority: 60,
          shouldShowOnHome: true,
        });
      }
    } else if (input.bundle.relationship.conversationCount === 0) {
      candidates.push({
        kind: 'feeling_checkin',
        message: `Hey ${name}. How are you feeling today?`,
        priority: 45,
        shouldShowOnHome: true,
      });
    }

    const today = now.toISOString().slice(5, 10);
    const birthday = input.bundle.profile.importantDates.find(
      (d) => d.category === 'birthday' && d.date?.slice(5, 10) === today,
    );
    if (birthday) {
      candidates.push({
        kind: 'birthday',
        message: `Happy birthday, ${name}!`,
        priority: 100,
        shouldShowOnHome: true,
      });
    }

    if (candidates.length === 0) return null;
    return candidates.sort((a, b) => b.priority - a.priority)[0];
  }
}

export const proactiveConversationService = new ProactiveConversationService();
