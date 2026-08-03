import { Goal, Memory, UserProfile } from '../../types';
import { MEMORY_CATEGORY_LABELS } from '../../constants/memory-categories';
import { isMemoryPinned } from '../../utils/memory-pinned';

export type LifeBookVolumeChapterId =
  | 'about_me'
  | 'goals'
  | 'achievements'
  | 'favourite_moments'
  | 'lessons'
  | 'memories'
  | 'quotes'
  | 'growth'
  | 'monthly';

export type LifeBookVolumeChapter = {
  id: LifeBookVolumeChapterId;
  title: string;
  subtitle: string;
  paragraphs: string[];
  /** True when chapter has real content to show */
  hasContent: boolean;
};

/**
 * Organises existing stored life data into reading chapters.
 * Never invents — empty chapters stay empty.
 */
export function buildLifeBookVolume(input: {
  profile: UserProfile;
  memories: Memory[];
  goals: Goal[];
  growthLine?: string | null;
  monthlySummary?: string | null;
}): LifeBookVolumeChapter[] {
  const { profile, memories, goals, growthLine, monthlySummary } = input;
  const favourites = memories.filter((m) => (m.importance ?? 0) >= 4 || isMemoryPinned(m));
  const aboutCats = new Set(['preferences', 'favourites', 'people', 'habits']);
  const about = memories.filter((m) => aboutCats.has(m.category));
  const lessons = memories.filter(
    (m) =>
      m.category === 'emotional' ||
      /lesson|learned|realis|realize|growth/i.test(`${m.title} ${m.content} ${m.tags.join(' ')}`),
  );
  const quotes = memories.filter(
    (m) =>
      m.tags.includes('remember-this') ||
      m.tags.includes('quote') ||
      /“|"|said|quote/i.test(m.content),
  );
  const completed = goals.filter((g) => g.status === 'completed');
  const active = goals.filter((g) => g.status === 'active');

  const chapters: LifeBookVolumeChapter[] = [
    {
      id: 'about_me',
      title: 'About Me',
      subtitle: 'Who you are, from what you’ve shared',
      hasContent: about.length > 0 || Boolean(profile.mainReason),
      paragraphs: [
        profile.mainReason ? `You came to Voxa for: ${profile.mainReason}` : '',
        ...about.slice(0, 6).map((m) => `${m.title}: ${m.content.slice(0, 160)}`),
      ].filter(Boolean),
    },
    {
      id: 'goals',
      title: 'My Goals',
      subtitle: 'What you’re building toward',
      hasContent: goals.length > 0,
      paragraphs: [
        ...active.slice(0, 6).map((g) => `Active · ${g.title}${typeof g.progress === 'number' ? ` (${g.progress}%)` : ''}`),
        ...completed.slice(0, 4).map((g) => `Done · ${g.title}`),
      ],
    },
    {
      id: 'achievements',
      title: 'Achievements',
      subtitle: 'Wins already in the record',
      hasContent: completed.length > 0,
      paragraphs: completed.slice(0, 10).map((g) => g.title),
    },
    {
      id: 'favourite_moments',
      title: 'Favourite Moments',
      subtitle: 'Pinned and high-importance memories',
      hasContent: favourites.length > 0,
      paragraphs: favourites.slice(0, 8).map((m) => `${m.title} — ${m.content.slice(0, 140)}`),
    },
    {
      id: 'lessons',
      title: 'Lessons Learned',
      subtitle: 'Reflections that stuck',
      hasContent: lessons.length > 0,
      paragraphs: lessons.slice(0, 8).map((m) => m.content.slice(0, 180)),
    },
    {
      id: 'memories',
      title: 'Memories',
      subtitle: 'Recent chapters of your story',
      hasContent: memories.length > 0,
      paragraphs: memories.slice(0, 10).map((m) => {
        const cat = MEMORY_CATEGORY_LABELS[m.category] ?? m.category;
        return `[${cat}] ${m.title}: ${m.content.slice(0, 120)}`;
      }),
    },
    {
      id: 'quotes',
      title: 'Quotes',
      subtitle: 'Lines worth keeping',
      hasContent: quotes.length > 0,
      paragraphs: quotes.slice(0, 8).map((m) => m.content.slice(0, 200)),
    },
    {
      id: 'growth',
      title: 'Growth',
      subtitle: 'How things are shifting',
      hasContent: Boolean(growthLine?.trim()) || completed.length > 0,
      paragraphs: [
        growthLine?.trim() ?? '',
        completed.length > 0 ? `${completed.length} goals completed over time.` : '',
        memories.length > 0 ? `${memories.length} moments saved with Voxa.` : '',
      ].filter(Boolean),
    },
    {
      id: 'monthly',
      title: 'Monthly Chapters',
      subtitle: 'Auto-generated month covers',
      hasContent: Boolean(monthlySummary?.trim()),
      paragraphs: monthlySummary?.trim() ? [monthlySummary.trim()] : [],
    },
  ];

  return chapters;
}
