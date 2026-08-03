import { CompanionIntelligenceBundle } from '../../types/companion-intelligence';
import { Goal, Memory, UserProfile, VoiceSession } from '../../types';
import { asArray, asStringArray } from '../../utils/as-array';

export type FriendRelationshipProfile = {
  daysTogether: number;
  hoursTalked: number;
  voiceMinutes: number;
  insideJokes: string[];
  favouriteFood: string[];
  favouriteMusic: string[];
  favouriteMovies: string[];
  favouriteGames: string[];
  importantPeople: string[];
  dreams: string[];
  birthdays: string[];
  importantDates: string[];
  achievementsTogether: string[];
  relationshipScore: number;
  naturalRecallLines: string[];
};

export type BuildFriendProfileInput = {
  profile: UserProfile;
  bundle: CompanionIntelligenceBundle;
  memories: Memory[];
  goals: Goal[];
  voiceSessions: VoiceSession[];
};

export function buildFriendRelationshipProfile(input: BuildFriendProfileInput): FriendRelationshipProfile {
  const bundle = input.bundle;
  const memories = asArray<Memory>(input.memories);
  const goals = asArray<Goal>(input.goals);
  const voiceSessions = asArray<VoiceSession>(input.voiceSessions);
  const rel = bundle.relationship;
  const ip = bundle.profile;

  const daysTogether = Math.max(
    1,
    Math.floor((Date.now() - new Date(rel.relationshipStartedAt).getTime()) / (1000 * 60 * 60 * 24)),
  );

  const voiceMinutes = voiceSessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0) / 60;
  const hoursTalked = rel.conversationCount * 0.05 + voiceMinutes / 60;

  const favouriteFood = memories.filter((m) => /food|eat|restaurant|meal/i.test(m.content)).map((m) => m.title);
  const favouriteMusic = memories.filter((m) => /music|song|artist|album/i.test(m.content)).map((m) => m.title);
  const favouriteMovies = memories.filter((m) => /movie|film|watch/i.test(m.content)).map((m) => m.title);
  const favouriteGames = memories.filter((m) => /game|play|gaming/i.test(m.content)).map((m) => m.title);
  const dreams = memories.filter((m) => /dream|hope|wish|someday/i.test(m.content)).map((m) => m.title);

  const insideJokes = asArray<{ label: string }>(bundle.insideJokes).map((j) => j.label);
  const importantPeople = asArray<{ name: string }>(ip.relationships).map((r) => r.name);
  const importantDateItems = asArray<{ category: string; label: string }>(ip.importantDates);
  const birthdays = importantDateItems.filter((d) => d.category === 'birthday').map((d) => d.label);
  const importantDates = importantDateItems.map((d) => d.label);
  const achievementsTogether = [
    ...asArray<{ label: string }>(rel.milestones).map((m) => m.label),
    ...goals.filter((g) => g.progress >= 100).map((g) => g.title),
    ...asStringArray(ip.recentAchievements),
  ];

  const relationshipScore = Math.min(
    100,
    Math.round(
      rel.conversationCount * 0.5 +
        rel.sharedMemoryCount * 2 +
        rel.goalsAchievedTogether * 5 +
        insideJokes.length * 3 +
        daysTogether * 0.3,
    ),
  );

  const naturalRecallLines: string[] = [];
  if (memories[0]) {
    naturalRecallLines.push(`Remember when you told me about "${memories[0].title}"?`);
  }
  if (insideJokes[0]) {
    naturalRecallLines.push(`Still thinking about ${insideJokes[0]}.`);
  }
  const midGoal = goals.find((g) => g.progress >= 50);
  if (midGoal) {
    naturalRecallLines.push(`Last week you were working on "${midGoal.title}" — how's that going?`);
  }
  if (importantPeople[0]) {
    naturalRecallLines.push(`You mentioned ${importantPeople[0]} before — everything okay there?`);
  }

  return {
    daysTogether,
    hoursTalked: Math.round(hoursTalked * 10) / 10,
    voiceMinutes: Math.round(voiceMinutes),
    insideJokes,
    favouriteFood,
    favouriteMusic,
    favouriteMovies,
    favouriteGames,
    importantPeople,
    dreams,
    birthdays,
    importantDates,
    achievementsTogether,
    relationshipScore,
    naturalRecallLines,
  };
}

export function buildFriendRecallPromptBlock(friend: FriendRelationshipProfile): string {
  const lines: string[] = ['## Your shared history (use naturally, never list)'];
  if (friend.naturalRecallLines[0]) lines.push(`- ${friend.naturalRecallLines[0]}`);
  if (friend.insideJokes[0]) lines.push(`- Inside joke: ${friend.insideJokes[0]}`);
  if (friend.favouriteFood[0]) lines.push(`- They like: ${friend.favouriteFood[0]}`);
  if (friend.importantPeople[0]) lines.push(`- Important person: ${friend.importantPeople[0]}`);
  lines.push(`- Bond score: ${friend.relationshipScore}/100 · ${friend.daysTogether} days together`);
  return lines.join('\n');
}
