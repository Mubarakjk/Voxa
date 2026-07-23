import { Goal, Memory } from '../../types';
import { createUuid, nowIso } from '../../types/common';
import {
  BucketListItemV5,
  DreamEntry,
  LifeBookChapter,
  SavedDecision,
  VisionBoardItemV5,
} from '../../types/phase5-life-os';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function generateLifeBookChapter(input: {
  userId: string;
  year: number;
  month: number;
  goals: Goal[];
  memories: Memory[];
  dreams: DreamEntry[];
  bucket: BucketListItemV5[];
  vision: VisionBoardItemV5[];
  decisions: SavedDecision[];
}): LifeBookChapter {
  const monthStart = new Date(input.year, input.month - 1, 1);
  const monthEnd = new Date(input.year, input.month, 0, 23, 59, 59);

  const inMonth = <T extends { createdAt?: string; savedAt?: string }>(items: T[]) =>
    items.filter((item) => {
      const date = new Date(item.savedAt ?? item.createdAt ?? '');
      return date >= monthStart && date <= monthEnd;
    });

  const monthGoals = inMonth(input.goals);
  const monthMemories = inMonth(input.memories);
  const monthDreams = inMonth(input.dreams);
  const monthBucket = input.bucket.filter((b) => {
    if (b.status !== 'completed') return false;
    const date = new Date(b.updatedAt);
    return date >= monthStart && date <= monthEnd;
  });
  const monthVision = input.vision.filter((v) => v.progress > 0);
  const monthDecisions = inMonth(input.decisions);

  const wins = monthGoals.filter((g) => g.status === 'completed');
  const biggestWin = wins[0]?.title ?? monthBucket[0]?.title ?? monthMemories[0]?.title;
  const biggestChallenge = monthGoals.find((g) => g.status === 'paused')?.title;

  const dreamThemes = [...new Set(monthDreams.flatMap((d) => d.themes))].slice(0, 5);
  const favourite = monthMemories.sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))[0];

  const hasContent =
    monthMemories.length > 0 ||
    monthGoals.length > 0 ||
    monthDreams.length > 0 ||
    monthBucket.length > 0;

  return {
    id: createUuid(),
    userId: input.userId,
    monthLabel: `${MONTH_NAMES[input.month - 1]} ${input.year}`,
    year: input.year,
    month: input.month,
    summary: hasContent
      ? `A month with ${monthMemories.length} memories, ${monthGoals.length} goal updates, and ${monthDreams.length} dreams.`
      : undefined,
    biggestWin,
    biggestChallenge,
    goals: monthGoals.map((g) => g.title).slice(0, 6),
    journalExcerpts: monthMemories.map((m) => m.content.slice(0, 120)).slice(0, 4),
    dreamThemes,
    decisions: monthDecisions.map((d) => d.question).slice(0, 3),
    bucketProgress: monthBucket.map((b) => b.title),
    visionProgress: monthVision.map((v) => `${v.title} (${v.progress}%)`).slice(0, 4),
    favouriteMemory: favourite?.title,
    voxaNoticed: hasContent
      ? 'You showed up consistently — even small moments count.'
      : undefined,
    nextFocus: monthGoals.find((g) => g.status === 'active')?.title,
    isPrivate: false,
    generatedAt: nowIso(),
  };
}
