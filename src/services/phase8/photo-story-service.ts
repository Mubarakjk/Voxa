import { Memory } from '../../types';
import { PhotoStoryItem } from '../../types/phase8-retention';

const PHOTO_CATEGORIES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bgym\b|\bworkout\b|\bfitness\b/i, label: 'Gym progress' },
  { pattern: /\bholiday\b|\btravel\b|\btrip\b/i, label: 'Travel' },
  { pattern: /\bbirthday\b/i, label: 'Birthday' },
  { pattern: /\bfamily\b|\bmum\b|\bdad\b/i, label: 'Family' },
  { pattern: /\bpet\b|\bdog\b|\bcat\b/i, label: 'Pet' },
  { pattern: /\bfood\b|\bmeal\b|\bdinner\b/i, label: 'Food' },
  { pattern: /\bachieve\b|\bwin\b|\bgraduat/i, label: 'Achievement' },
];

function classifyPhoto(text: string): string {
  for (const { pattern, label } of PHOTO_CATEGORIES) {
    if (pattern.test(text)) return label;
  }
  return 'Moment';
}

export function buildPhotoStory(memories: Memory[], limit = 12): PhotoStoryItem[] {
  return memories
    .filter((m) => m.tags?.includes('photo-memory') || m.source === 'image')
    .map((m) => ({
      id: m.id,
      title: m.title,
      summary: m.content.slice(0, 120),
      category: classifyPhoto(`${m.title} ${m.content}`),
      savedAt: m.occurredAt ?? m.createdAt,
      imageUri: m.tags?.find((t) => t.startsWith('image:'))?.slice(6),
    }))
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    .slice(0, limit);
}
