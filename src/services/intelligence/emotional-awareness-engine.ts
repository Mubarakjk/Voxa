import { CompanionIntelligenceProfile } from '../../types/companion-intelligence';
import { Memory, nowIso } from '../../types';
import { EmotionalBaseline } from '../../types/phase3-intelligence';
import { MoodHistoryEntry } from '../check-in/daily-check-in-service';

const CHECK_IN_COOLDOWN_DAYS = 5;
const MAX_CHECK_INS_STORED = 8;

export type EmotionalAwarenessResult = {
  baseline: EmotionalBaseline;
  insight: string | null;
  checkInOffer: string | null;
};

export class EmotionalAwarenessEngine {
  analyze(input: {
    profile: CompanionIntelligenceProfile;
    moodHistory: MoodHistoryEntry[];
    baseline: EmotionalBaseline;
    userMessage: string;
  }): EmotionalAwarenessResult {
    const baseline = this.updateBaseline(input.profile, input.moodHistory, input.baseline);
    const insight = this.buildInsight(baseline, input.moodHistory);
    const checkInOffer = this.maybeOfferCheckIn(baseline, input.userMessage, insight);

    return { baseline, insight, checkInOffer };
  }

  private updateBaseline(
    profile: CompanionIntelligenceProfile,
    moodHistory: MoodHistoryEntry[],
    existing: EmotionalBaseline,
  ): EmotionalBaseline {
    const recent = moodHistory.slice(0, 7);
    const older = moodHistory.slice(7, 21);

    let recentTrend: EmotionalBaseline['recentTrend'] = 'steady';
    if (recent.length >= 3 && older.length >= 3) {
      const recentStress = this.stressRatio(recent);
      const olderStress = this.stressRatio(older);
      if (recentStress > olderStress + 0.2) recentTrend = 'declining';
      else if (recentStress < olderStress - 0.2) recentTrend = 'improving';
    } else if (profile.moodTrend.length >= 2) {
      const latest = profile.moodTrend[0]?.mood?.toLowerCase() ?? '';
      const prior = profile.moodTrend[1]?.mood?.toLowerCase() ?? '';
      if (this.isNegativeMood(latest) && !this.isNegativeMood(prior)) recentTrend = 'declining';
      if (!this.isNegativeMood(latest) && this.isNegativeMood(prior)) recentTrend = 'improving';
    }

    const averageMood = recent[0]?.label
      ? this.labelToMood(recent[0].label)
      : profile.moodTrend[0]?.mood ?? 'neutral';

    const lastShiftDetectedAt =
      recentTrend !== existing.recentTrend && recentTrend !== 'steady'
        ? nowIso()
        : existing.lastShiftDetectedAt;

    return {
      ...existing,
      averageMood,
      recentTrend,
      lastShiftDetectedAt,
    };
  }

  private buildInsight(baseline: EmotionalBaseline, moodHistory: MoodHistoryEntry[]): string | null {
    if (baseline.recentTrend === 'declining' && moodHistory.length >= 3) {
      return 'Your mood has dipped a little this week — Voxa will stay gentle and present.';
    }
    if (baseline.recentTrend === 'improving' && moodHistory.length >= 3) {
      return 'A steadier, brighter stretch lately — worth noticing.';
    }
    return null;
  }

  private maybeOfferCheckIn(
    baseline: EmotionalBaseline,
    userMessage: string,
    insight: string | null,
  ): string | null {
    if (!insight || baseline.recentTrend !== 'declining') return null;

    const lower = userMessage.toLowerCase();
    if (VENTING.test(lower)) return null;

    const now = Date.now();
    const recentOffers = baseline.checkInsOfferedAt.filter(
      (iso) => now - new Date(iso).getTime() < CHECK_IN_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
    );
    if (recentOffers.length > 0) return null;

    const lines = [
      "I've noticed things feel heavier lately — no pressure, but I'm here if you want to talk.",
      "It seems like a tougher stretch — want to unpack it together, or just sit with it?",
      "You have been carrying a lot — I am listening whenever you are ready.",
    ];
    const index = Math.floor(Math.random() * lines.length);
    return lines[index] ?? lines[0];
  }

  recordCheckInOffered(baseline: EmotionalBaseline): EmotionalBaseline {
    const offered = [nowIso(), ...baseline.checkInsOfferedAt].slice(0, MAX_CHECK_INS_STORED);
    return { ...baseline, checkInsOfferedAt: offered };
  }

  private stressRatio(entries: MoodHistoryEntry[]): number {
    if (entries.length === 0) return 0;
    const stressed = entries.filter((e) => this.isNegativeLabel(e.label)).length;
    return stressed / entries.length;
  }

  private isNegativeLabel(label: string): boolean {
    const lower = label.toLowerCase();
    return ['stress', 'sad', 'low', 'anxious', 'tired', 'overwhelm'].some((w) => lower.includes(w));
  }

  private isNegativeMood(mood: string): boolean {
    return ['stressed', 'sad', 'low', 'anxious', 'tired'].some((w) => mood.includes(w));
  }

  private labelToMood(label: string): import('../../types/memory').MemoryMood {
    const lower = label.toLowerCase();
    if (lower.includes('happy') || lower.includes('good')) return 'joyful';
    if (lower.includes('motivat')) return 'motivated';
    if (lower.includes('calm')) return 'calm';
    if (lower.includes('stress')) return 'stressed';
    if (lower.includes('sad') || lower.includes('low')) return 'reflective';
    return 'neutral';
  }
}

const VENTING = /\b(fine|don't worry|i'm ok|i'm okay|not now|later)\b/i;

export const emotionalAwarenessEngine = new EmotionalAwarenessEngine();
