import { STORAGE_KEYS } from '../../constants/storage-keys';
import { MoodIntelligenceLabel } from '../../types/mood-intelligence';
import { IStorageService } from '../contracts';

type MoodAdaptationProfile = {
  tone: string;
  empathy: 'low' | 'medium' | 'high';
  length: 'brief' | 'balanced';
  openings: string[];
  guidance: string[];
};

const PROFILES: Record<MoodIntelligenceLabel, MoodAdaptationProfile> = {
  happy: {
    tone: 'warm and upbeat',
    empathy: 'medium',
    length: 'balanced',
    openings: [
      'Match their good energy without overdoing it.',
      'Celebrate lightly — one sincere note is enough.',
      'Keep the momentum positive and natural.',
    ],
    guidance: [
      'Reflect their positive mood briefly before adding value.',
      'Avoid lecturing when they are in a good place.',
    ],
  },
  excited: {
    tone: 'enthusiastic but grounded',
    empathy: 'medium',
    length: 'balanced',
    openings: [
      'Share their excitement — mirror it, do not steal the spotlight.',
      'Ask one curious follow-up about what has them pumped.',
      'Keep pace energetic but still clear.',
    ],
    guidance: ['Help channel excitement into a next step if they want it.'],
  },
  motivated: {
    tone: 'focused and encouraging',
    empathy: 'medium',
    length: 'balanced',
    openings: [
      'Affirm the momentum — they are already moving.',
      'Offer one practical next step, not a full plan.',
      'Stay coach-like without sounding corporate.',
    ],
    guidance: ['Keep advice actionable and short.'],
  },
  calm: {
    tone: 'steady and unhurried',
    empathy: 'medium',
    length: 'balanced',
    openings: [
      'Meet them at their pace — no rush.',
      'Keep language soft and spacious.',
      'One thoughtful question beats three.',
    ],
    guidance: ['Do not manufacture urgency.'],
  },
  sad: {
    tone: 'gentle and present',
    empathy: 'high',
    length: 'brief',
    openings: [
      'Lead with presence, not fixes.',
      'Validate before suggesting anything.',
      'Keep it human — short sentences, no platitudes.',
    ],
    guidance: [
      'Avoid toxic positivity or "look on the bright side".',
      'Offer to listen more than to solve.',
    ],
  },
  lonely: {
    tone: 'warm and connected',
    empathy: 'high',
    length: 'brief',
    openings: [
      'Remind them they are not talking into a void.',
      'Be companion-like — present, not performative.',
      'Ask one gentle question that invites sharing.',
    ],
    guidance: ['Do not guilt them for feeling alone.'],
  },
  angry: {
    tone: 'steady and non-defensive',
    empathy: 'high',
    length: 'brief',
    openings: [
      'Acknowledge the frustration without escalating.',
      'Stay calm — do not match intensity.',
      'Validate the feeling before problem-solving.',
    ],
    guidance: ['Never dismiss or argue. Offer space to vent.'],
  },
  stressed: {
    tone: 'calm and practical',
    empathy: 'high',
    length: 'brief',
    openings: [
      'Reduce cognitive load — simplify your reply.',
      'One small relief step is better than a list.',
      'Sound like a steady friend, not a productivity bot.',
    ],
    guidance: ['Break things down. Avoid adding more pressure.'],
  },
  burned_out: {
    tone: 'soft and restorative',
    empathy: 'high',
    length: 'brief',
    openings: [
      'Permission to rest matters more than advice right now.',
      'Keep demands at zero — no homework unless they ask.',
      'Normalize needing a pause.',
    ],
    guidance: [
      'Do not push goals or routines.',
      'Suggest rest, boundaries, or one tiny ease step only if natural.',
    ],
  },
  anxious: {
    tone: 'reassuring and clear',
    empathy: 'high',
    length: 'brief',
    openings: [
      'Ground the moment — clear, simple language.',
      'One calming breath of a reply, not a wall of text.',
      'Reflect worry without amplifying it.',
    ],
    guidance: [
      'Avoid catastrophizing or rapid-fire questions.',
      'Offer gentle structure if they want help thinking it through.',
    ],
  },
};

export class MoodAdaptationService {
  constructor(private readonly storage: IStorageService) {}

  private async usedPhrases(userId: string): Promise<Set<string>> {
    const map =
      (await this.storage.getItem<Record<string, string[]>>(STORAGE_KEYS.moodAdaptationHistory)) ?? {};
    return new Set(map[userId] ?? []);
  }

  private async rememberPhrase(userId: string, phrase: string) {
    const map =
      (await this.storage.getItem<Record<string, string[]>>(STORAGE_KEYS.moodAdaptationHistory)) ?? {};
    const list = map[userId] ?? [];
    map[userId] = [phrase, ...list.filter((item) => item !== phrase)].slice(0, 80);
    await this.storage.setItem(STORAGE_KEYS.moodAdaptationHistory, map);
  }

  private pickUnused(userId: string, options: string[], used: Set<string>): string {
    const fresh = options.filter((item) => !used.has(item));
    const pool = fresh.length ? fresh : options;
    return pool[Math.floor(Math.random() * pool.length)] ?? options[0] ?? '';
  }

  async buildAdaptationBlock(userId: string, mood: MoodIntelligenceLabel): Promise<string> {
    const profile = PROFILES[mood];
    const used = await this.usedPhrases(userId);
    const opening = this.pickUnused(userId, profile.openings, used);
    await this.rememberPhrase(userId, opening);

    const guidance = profile.guidance
      .map((line, index) => (used.has(line) ? null : line))
      .filter(Boolean)
      .slice(0, 2)
      .join('\n- ');

    return [
      '## Mood intelligence (adapt naturally — do not mention detecting mood)',
      `Detected emotional state: ${mood.replace('_', ' ')}`,
      `Tone: ${profile.tone}`,
      `Empathy: ${profile.empathy}`,
      `Length: ${profile.length}`,
      `Opening approach: ${opening}`,
      guidance ? `- ${guidance}` : null,
      'Vary wording from recent replies. Never repeat the same opener twice in a row.',
    ]
      .filter(Boolean)
      .join('\n');
  }
}

let adaptationInstance: MoodAdaptationService | null = null;

export function getMoodAdaptationService(storage: IStorageService) {
  if (!adaptationInstance) adaptationInstance = new MoodAdaptationService(storage);
  return adaptationInstance;
}

export function mapMoodToOrb(mood: MoodIntelligenceLabel): import('../../components/live-companion/live-companion-orb').CompanionOrbMood {
  switch (mood) {
    case 'happy':
    case 'motivated':
      return 'happy';
    case 'excited':
      return 'excited';
    case 'calm':
      return 'calm';
    case 'sad':
    case 'lonely':
      return 'concerned';
    case 'angry':
    case 'stressed':
    case 'anxious':
      return 'focused';
    case 'burned_out':
      return 'sleepy';
    default:
      return 'calm';
  }
}
