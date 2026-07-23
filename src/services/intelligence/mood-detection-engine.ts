import { MoodIntelligenceLabel } from '../../types/mood-intelligence';
import { MoodEntry } from '../../types/phase12-experiences';

export type MoodDetectionResult = {
  mood: MoodIntelligenceLabel;
  confidence: number;
  matched: string;
};

type MoodPattern = {
  mood: MoodIntelligenceLabel;
  patterns: RegExp[];
  weight: number;
};

const MOOD_PATTERNS: MoodPattern[] = [
  {
    mood: 'excited',
    weight: 0.9,
    patterns: [/\b(excited|thrilled|pumped|stoked|can't wait|amazing news|so hyped)\b/i],
  },
  {
    mood: 'happy',
    weight: 0.85,
    patterns: [/\b(happy|glad|good day|feeling good|joyful|content|pleased)\b/i],
  },
  {
    mood: 'motivated',
    weight: 0.88,
    patterns: [/\b(motivated|determined|ready to|let's go|focused on|discipline|grind)\b/i],
  },
  {
    mood: 'calm',
    weight: 0.8,
    patterns: [/\b(calm|peaceful|relaxed|steady|balanced|at ease|okay actually)\b/i],
  },
  {
    mood: 'lonely',
    weight: 0.9,
    patterns: [/\b(lonely|alone|isolated|no one|by myself|miss people|miss you)\b/i],
  },
  {
    mood: 'sad',
    weight: 0.88,
    patterns: [/\b(sad|down|depressed|heartbroken|crying|miserable|blue)\b/i],
  },
  {
    mood: 'angry',
    weight: 0.9,
    patterns: [/\b(angry|furious|mad|irritated|rage|pissed|annoyed)\b/i],
  },
  {
    mood: 'burned_out',
    weight: 0.92,
    patterns: [/\b(burned out|burnt out|burnout|done with everything|can't anymore|empty inside)\b/i],
  },
  {
    mood: 'anxious',
    weight: 0.9,
    patterns: [/\b(anxious|anxiety|worried|panic|nervous|on edge|what if)\b/i],
  },
  {
    mood: 'stressed',
    weight: 0.86,
    patterns: [/\b(stressed|overwhelmed|pressure|too much|swamped|frazzled)\b/i],
  },
];

export class MoodDetectionEngine {
  detectFromText(text: string): MoodDetectionResult | null {
    const trimmed = text.trim();
    if (!trimmed) return null;

    let best: MoodDetectionResult | null = null;
    for (const entry of MOOD_PATTERNS) {
      for (const pattern of entry.patterns) {
        const match = trimmed.match(pattern);
        if (!match) continue;
        const confidence = entry.weight;
        if (!best || confidence > best.confidence) {
          best = { mood: entry.mood, confidence, matched: match[0] };
        }
      }
    }
    return best;
  }

  inferFromJournal(entry: MoodEntry): MoodDetectionResult | null {
    if (entry.stress >= 4 && entry.energy <= 2) {
      return { mood: 'burned_out', confidence: 0.75, matched: 'journal:stress+energy' };
    }
    if (entry.stress >= 4) {
      return { mood: 'stressed', confidence: 0.7, matched: 'journal:stress' };
    }
    if (entry.mood >= 4 && entry.energy >= 4) {
      return { mood: entry.confidence >= 4 ? 'motivated' : 'happy', confidence: 0.72, matched: 'journal:mood+energy' };
    }
    if (entry.mood >= 4) {
      return { mood: 'happy', confidence: 0.68, matched: 'journal:mood' };
    }
    if (entry.mood <= 2 && entry.energy <= 2) {
      return { mood: 'sad', confidence: 0.7, matched: 'journal:low-mood' };
    }
    if (entry.mood <= 2) {
      return { mood: 'sad', confidence: 0.62, matched: 'journal:mood' };
    }
    return { mood: 'calm', confidence: 0.55, matched: 'journal:neutral' };
  }
}

export const moodDetectionEngine = new MoodDetectionEngine();
