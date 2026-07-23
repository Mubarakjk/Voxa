import { Memory } from '../../types';
import { MemoryConfidenceLevel } from '../../types/phase4-intelligence';

export class MemoryConfidenceService {
  level(memory: Memory): MemoryConfidenceLevel {
    const score = memory.confidence ?? this.inferConfidence(memory);
    if (score >= 0.78) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }

  label(level: MemoryConfidenceLevel): string {
    switch (level) {
      case 'high':
        return 'High confidence';
      case 'medium':
        return 'Medium confidence';
      default:
        return 'Low confidence';
    }
  }

  describeForPrompt(memory: Memory): string {
    const level = this.level(memory);
    const pct = Math.round((memory.confidence ?? this.inferConfidence(memory)) * 100);
    if (level === 'low') return `uncertain memory (${pct}% — phrase as "I think I remember...")`;
    if (level === 'medium') return `moderate confidence (${pct}% — may be mistaken)`;
    return `high confidence (${pct}%)`;
  }

  inferConfidence(memory: Memory): number {
    let score = 0.72;
    if (memory.source === 'manual' || memory.source === 'check_in') score += 0.1;
    if (memory.pinned) score += 0.08;
    if ((memory.useCount ?? 0) >= 3) score += 0.06;
    if (memory.importance >= 4) score += 0.05;
    if (memory.emotionalSignificance && memory.emotionalSignificance >= 4) score += 0.04;
    if (memory.expiresAt && new Date(memory.expiresAt).getTime() < Date.now()) score -= 0.25;
    return Math.min(1, Math.max(0.2, score));
  }

  shouldAskBeforeStoring(confidence: number): boolean {
    return confidence < 0.55;
  }
}

export const memoryConfidenceService = new MemoryConfidenceService();
