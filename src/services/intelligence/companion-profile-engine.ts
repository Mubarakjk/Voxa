import { MEMORY_CATEGORY_LABELS } from '../../constants/memory-categories';
import {
  CompanionIntelligenceProfile,
  ImportantDate,
  ImportantPerson,
  MoodTrendPoint,
} from '../../types/companion-intelligence';
import { Goal, Memory, Reminder, UserProfile } from '../../types';
import { nowIso } from '../../types';

export type ProfileUpdateInput = {
  profile: UserProfile;
  intelligence: CompanionIntelligenceProfile;
  memories: Memory[];
  goals: Goal[];
  reminders: Reminder[];
  userMessage: string;
  voxaReply: string;
  mode: import('../../types').CompanionModeId;
};

const MAX_LIST = 12;
const MAX_MOOD_POINTS = 30;

export class CompanionProfileEngine {
  update(input: ProfileUpdateInput): CompanionIntelligenceProfile {
    const next: CompanionIntelligenceProfile = {
      ...input.intelligence,
      updatedAt: nowIso(),
      preferredMode: input.mode,
    };

    this.mergeOnboarding(next, input.profile);
    this.mergeFromGoals(next, input.goals);
    this.mergeFromMemories(next, input.memories);
    this.mergeFromExchange(next, input.userMessage, input.voxaReply);
    this.inferMood(next, input.userMessage, input.memories);
    this.inferCommunicationStyle(next, input.userMessage);

    return next;
  }

  private mergeOnboarding(target: CompanionIntelligenceProfile, profile: UserProfile) {
    if (profile.onboarding?.favoriteTopics?.length) {
      target.favouriteTopics = unique([...target.favouriteTopics, ...profile.onboarding.favoriteTopics]).slice(
        0,
        MAX_LIST,
      );
      target.interests = unique([...target.interests, ...profile.onboarding.favoriteTopics]).slice(0, MAX_LIST);
    }
    if (profile.onboarding?.sleepSchedule) {
      target.sleepSchedule = profile.onboarding.sleepSchedule;
    }
    if (profile.mainReason) {
      pushUnique(target.currentChallenges, profile.mainReason);
    }
    target.preferredMode = profile.companion.defaultMode ?? target.preferredMode;
  }

  private mergeFromGoals(target: CompanionIntelligenceProfile, goals: Goal[]) {
    const active = goals.filter((g) => g.status === 'active');
    target.goals = active.map((g) => g.title).slice(0, MAX_LIST);

    for (const goal of active) {
      if (goal.category === 'fitness') pushUnique(target.fitnessProgress, `${goal.title} (${goal.progress}%)`);
      if (goal.category === 'study') pushUnique(target.studyProgress, `${goal.title} (${goal.progress}%)`);
      if (goal.category === 'productivity' || goal.category === 'business') {
        pushUnique(target.productivityPatterns, goal.title);
      }
      if (goal.progress >= 100) pushUnique(target.recentAchievements, `Completed: ${goal.title}`);
    }
  }

  private mergeFromMemories(target: CompanionIntelligenceProfile, memories: Memory[]) {
    for (const memory of memories.slice(0, 20)) {
      const label = MEMORY_CATEGORY_LABELS[memory.category] ?? memory.category;

      if (memory.category === 'people') {
        this.addPerson(target, memory.title, memory.content);
      }
      if (memory.category === 'birthdays') {
        this.addImportantDate(target, memory.title, memory.content, 'birthday');
      }
      if (memory.category === 'routines') pushUnique(target.routines, memory.title);
      if (memory.category === 'habits') pushUnique(target.habits, memory.title);
      if (memory.category === 'favourites' || memory.category === 'preferences') {
        pushUnique(target.favouriteTopics, memory.title);
        pushUnique(target.interests, memory.content.slice(0, 80));
      }
      if (memory.category === 'fitness') pushUnique(target.fitnessProgress, memory.title);
      if (memory.category === 'study') pushUnique(target.studyProgress, memory.title);
      if (memory.category === 'work' || memory.category === 'business') {
        pushUnique(target.productivityPatterns, memory.title);
      }
      if (memory.category === 'emotional' || memory.category === 'fears') {
        pushUnique(target.currentChallenges, `${label}: ${memory.title}`);
      }
      if (memory.category === 'future_plans') pushUnique(target.goals, memory.title);
      if (memory.importance >= 4) pushUnique(target.recentAchievements, memory.title);
    }
  }

  private mergeFromExchange(target: CompanionIntelligenceProfile, userMessage: string, voxaReply: string) {
    const lower = userMessage.toLowerCase();
    if (/every (day|morning|evening|night)|usually|routine|schedule/.test(lower)) {
      pushUnique(target.routines, userMessage.slice(0, 100));
    }
    if (/habit|trying to|working on/.test(lower)) {
      pushUnique(target.habits, userMessage.slice(0, 100));
    }
    if (/love|enjoy|interested in|into |fan of/.test(lower)) {
      pushUnique(target.interests, userMessage.slice(0, 80));
    }
    if (/stressed|anxious|overwhelmed|hard time|struggling/.test(lower)) {
      pushUnique(target.currentChallenges, userMessage.slice(0, 100));
    }
    if (/finished|completed|did it|achieved|proud/.test(lower)) {
      pushUnique(target.recentAchievements, userMessage.slice(0, 100));
    }
    if (/my (mom|dad|sister|brother|partner|friend|wife|husband|boss)/.test(lower)) {
      this.addPerson(target, 'Someone important', userMessage.slice(0, 120));
    }
    if (voxaReply.length > 0 && /great job|proud of you|well done/.test(voxaReply.toLowerCase())) {
      pushUnique(target.recentAchievements, 'Recent win discussed with Voxa');
    }
  }

  private inferMood(target: CompanionIntelligenceProfile, userMessage: string, memories: Memory[]) {
    const lower = userMessage.toLowerCase();
    let mood: MoodTrendPoint['mood'] = 'neutral';
    if (/happy|excited|great|amazing|love/.test(lower)) mood = 'joyful';
    else if (/sad|down|lonely|miss/.test(lower)) mood = 'reflective';
    else if (/stressed|anxious|worried|overwhelmed/.test(lower)) mood = 'stressed';
    else if (/motivated|ready|let's go|focused/.test(lower)) mood = 'motivated';
    else if (/calm|peaceful|relaxed|tired/.test(lower)) mood = 'calm';
    else if (memories[0]?.mood) mood = memories[0].mood;

    const point: MoodTrendPoint = { mood, at: nowIso(), source: 'conversation' };
    target.moodTrend = [point, ...target.moodTrend].slice(0, MAX_MOOD_POINTS);
  }

  private inferCommunicationStyle(target: CompanionIntelligenceProfile, userMessage: string) {
    const words = userMessage.split(/\s+/).length;
    if (words <= 6) target.communicationStyle = 'direct';
    else if (/feel|felt|emotion|heart|why/.test(userMessage.toLowerCase())) target.communicationStyle = 'reflective';
    else if (words > 20) target.communicationStyle = 'casual';
    else target.communicationStyle = 'mixed';
  }

  private addPerson(target: CompanionIntelligenceProfile, name: string, notes: string) {
    const existing = target.relationships.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      existing.notes = notes.slice(0, 200);
      return;
    }
    target.relationships = [{ name, notes: notes.slice(0, 200) }, ...target.relationships].slice(0, MAX_LIST);
  }

  private addImportantDate(
    target: CompanionIntelligenceProfile,
    label: string,
    content: string,
    category: ImportantDate['category'],
  ) {
    const entry: ImportantDate = { label, date: content, category };
    const exists = target.importantDates.some((d) => d.label === label);
    if (!exists) target.importantDates = [entry, ...target.importantDates].slice(0, MAX_LIST);
  }
}

function unique(items: string[]) {
  return [...new Set(items.map((i) => i.trim()).filter(Boolean))];
}

function pushUnique(list: string[], value: string) {
  const trimmed = value.trim();
  if (!trimmed) return;
  if (!list.includes(trimmed)) list.unshift(trimmed);
  if (list.length > MAX_LIST) list.length = MAX_LIST;
}

export const companionProfileEngine = new CompanionProfileEngine();
