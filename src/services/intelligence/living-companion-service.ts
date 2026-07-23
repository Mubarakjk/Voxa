import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { Goal, Memory, UserProfile } from '../../types';
import { LivingCompanionExpression, LivingCompanionState } from '../../types/phase4-intelligence';
import { TodayRoutineSummary } from '../../types/routine';
import { conversationQualityEngine } from '../intelligence/conversation-quality-engine';
import { dailyPersonalityEngine } from '../personality/daily-personality-engine';
import { LifeOSData } from '../life-os/life-os-service';
import { CompanionJournalEntry } from '../journal/companion-journal-service';

export type BuildLivingCompanionInput = {
  profile: UserProfile;
  bundle: CompanionIntelligenceBundle;
  memories: Memory[];
  goals: Goal[];
  routine?: TodayRoutineSummary | null;
  lifeOS?: LifeOSData;
  journal?: CompanionJournalEntry | null;
  daysAway?: number;
  streakDays?: number;
  now?: Date;
};

export class LivingCompanionService {
  build(input: BuildLivingCompanionInput): LivingCompanionState {
    const now = input.now ?? new Date();
    const firstName = input.profile.displayName.split(' ')[0];
    const hour = now.getHours();
    const dayKey = now.toISOString().slice(0, 10);
    const personality = dailyPersonalityEngine.resolve(now);
    const quality = input.bundle.conversationQuality;

    let mood: LivingCompanionExpression = 'warm';
    let energy: LivingCompanionState['energy'] = 'medium';

    if (hour < 7 || hour >= 23) {
      mood = 'gentle';
      energy = 'low';
    } else if (personality.productivityFocus >= 0.7) {
      mood = 'focused';
      energy = 'high';
    } else if (personality.energy >= 0.7) {
      mood = 'bright';
      energy = 'high';
    } else if (input.bundle.adaptive.emotionalBaseline.recentTrend === 'declining') {
      mood = 'gentle';
      energy = 'low';
    } else if ((input.streakDays ?? 0) >= 7) {
      mood = 'proud';
    }

    const thinkingAbout = this.pickThinkingAbout(input);
    const greeting = this.pickGreeting(firstName, input, hour, quality);
    const subline = this.pickSubline(firstName, input, thinkingAbout);
    const conversationStarter = this.pickStarter(input, thinkingAbout, hour);

    return {
      greeting,
      subline,
      mood,
      energy,
      conversationStarter,
      thinkingAbout,
      daySignature: `${dayKey}-${input.profile.id.slice(0, 6)}-${mood}`,
    };
  }

  private pickThinkingAbout(input: BuildLivingCompanionInput): string | null {
    const topGoal = input.goals.find((g) => g.status === 'active');
    if (topGoal && topGoal.progress > 0) return topGoal.title;

    const startup = input.memories.find((m) => /startup|business|company|voxa/i.test(`${m.title} ${m.content}`));
    if (startup) return startup.title;

    const bucket = input.lifeOS?.bucketList[0];
    if (bucket) return bucket.title;

    const vision = input.lifeOS?.visionBoard[0];
    if (vision) return vision.title;

    const journal = input.journal?.body?.slice(0, 40);
    if (journal) return 'what you wrote today';

    const memory = input.memories.find((m) => (m.emotionalSignificance ?? 0) >= 4);
    if (memory) return `something you said about ${memory.title.toLowerCase()}`;

    if (input.routine && input.routine.streakDays >= 3) return 'your routine streak';

    return null;
  }

  private pickGreeting(
    firstName: string,
    input: BuildLivingCompanionInput,
    hour: number,
    quality: import('../../types/companion-intelligence').ConversationQualityState,
  ): string {
    const candidates: string[] = [];

    if ((input.daysAway ?? 0) >= 1) {
      candidates.push(`I've missed talking with you, ${firstName}.`);
    }
    if (input.routine && input.routine.streakDays >= 5) {
      candidates.push(`You've been really consistent lately, ${firstName}.`);
    }
    if (input.memories[0]) {
      candidates.push(`I found myself remembering something you said.`);
    }
    const business = input.goals.find((g) => g.category === 'business');
    if (business) candidates.push(`I've been thinking about ${business.title.toLowerCase()}.`);

    if (hour < 12) candidates.push(`Morning, ${firstName}.`);
    else if (hour < 17) candidates.push(`Hey ${firstName}.`);
    else candidates.push(`Evening, ${firstName}.`);

    return conversationQualityEngine.pickVariedOpener(quality, candidates);
  }

  private pickSubline(firstName: string, input: BuildLivingCompanionInput, thinkingAbout: string | null): string {
    if (thinkingAbout) return `I've been thinking about ${thinkingAbout}.`;
    if (input.bundle.relationship.conversationCount >= 20) {
      return `We've built something real here, ${firstName}.`;
    }
    if (input.journal?.body) return 'Want to pick up a thread from today?';
    return "I'm here — no script, just us.";
  }

  private pickStarter(input: BuildLivingCompanionInput, thinkingAbout: string | null, hour: number): string {
    if (thinkingAbout) return `Let's talk about ${thinkingAbout}`;
    if (input.routine?.nextBlock) return `Help me with ${input.routine.nextBlock.title}`;
    if (hour < 12) return 'What should today look like?';
    return 'What is on your mind?';
  }
}

export const livingCompanionService = new LivingCompanionService();
