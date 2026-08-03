import { MemoryMood } from '../types';
import { MoodIntelligenceLabel } from '../types/mood-intelligence';

export const DAILY_MOOD_CHIPS = [
  { id: 'great', label: 'Great', mood: 'motivated' as MemoryMood },
  { id: 'good', label: 'Good', mood: 'warm' as MemoryMood },
  { id: 'okay', label: 'Okay', mood: 'calm' as MemoryMood },
  { id: 'stressed', label: 'Stressed', mood: 'stressed' as MemoryMood },
  { id: 'tired', label: 'Tired', mood: 'stressed' as MemoryMood },
  { id: 'motivated', label: 'Motivated', mood: 'motivated' as MemoryMood },
  { id: 'custom', label: 'Custom', mood: null },
] as const;

export type DailyMoodChipId = (typeof DAILY_MOOD_CHIPS)[number]['id'];

export function memoryMoodToIntelligence(mood: MemoryMood): MoodIntelligenceLabel {
  switch (mood) {
    case 'motivated':
      return 'motivated';
    case 'calm':
      return 'calm';
    case 'stressed':
      return 'stressed';
    case 'warm':
      return 'happy';
    case 'reflective':
      return 'calm';
    case 'neutral':
    default:
      return 'calm';
  }
}

export function buildTodayCheckInPromptBlock(input: {
  period: 'morning' | 'evening';
  moodLabel?: string;
  focus?: string;
  worrying?: string;
  smiled?: string;
}): string {
  const lines = [
    '## Today\'s check-in (use naturally — do not recite)',
    `Period: ${input.period}`,
  ];
  if (input.moodLabel?.trim()) lines.push(`Feeling: ${input.moodLabel.trim()}`);
  if (input.focus?.trim()) lines.push(`Focus: ${input.focus.trim()}`);
  if (input.worrying?.trim()) lines.push(`On their mind: ${input.worrying.trim()}`);
  if (input.smiled?.trim()) lines.push(`Bright spot: ${input.smiled.trim()}`);
  lines.push('Acknowledge lightly if relevant. Avoid guilt or pressure.');
  return lines.join('\n');
}
