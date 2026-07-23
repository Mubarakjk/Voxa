import { STORAGE_KEYS } from '../../constants/storage-keys';
import { EntityId, createUuid, nowIso } from '../../types';
import {
  MoodIntelligenceLabel,
  MoodSnapshot,
  MoodTimelineEntry,
  MoodTimelineSource,
  moodLabelDisplay,
} from '../../types/mood-intelligence';
import { MoodEntry } from '../../types/phase12-experiences';
import { IStorageService } from '../contracts';
import { MoodHistoryEntry, getDailyCheckInService } from '../check-in/daily-check-in-service';
import { moodDetectionEngine } from './mood-detection-engine';
import { getMoodAdaptationService } from './mood-adaptation-service';
import { MemoryMood } from '../../types';

function moodLabelToMemoryMood(mood: MoodIntelligenceLabel): MemoryMood {
  switch (mood) {
    case 'happy':
    case 'excited':
      return 'joyful';
    case 'motivated':
      return 'motivated';
    case 'calm':
      return 'calm';
    case 'sad':
    case 'lonely':
      return 'reflective';
    case 'angry':
    case 'stressed':
    case 'anxious':
    case 'burned_out':
      return 'stressed';
    default:
      return 'neutral';
  }
}

function timelineSourceToHistorySource(
  source: MoodTimelineSource,
): MoodHistoryEntry['source'] {
  if (source === 'check_in') return 'check_in';
  if (source === 'journal') return 'journal';
  if (source === 'voice') return 'voice';
  if (source === 'conversation') return 'conversation';
  return 'inferred';
}

const MAX_TIMELINE = 500;

export class MoodIntelligenceService {
  constructor(private readonly storage: IStorageService) {}

  private async readTimelineMap(): Promise<Record<string, MoodTimelineEntry[]>> {
    return (await this.storage.getItem<Record<string, MoodTimelineEntry[]>>(STORAGE_KEYS.moodTimeline)) ?? {};
  }

  private async writeTimeline(userId: EntityId, entries: MoodTimelineEntry[]) {
    const map = await this.readTimelineMap();
    map[userId] = entries.slice(0, MAX_TIMELINE);
    await this.storage.setItem(STORAGE_KEYS.moodTimeline, map);
  }

  async recordDetection(input: {
    userId: EntityId;
    mood: MoodIntelligenceLabel;
    confidence: number;
    source: MoodTimelineSource;
    snippet?: string;
    label?: string;
  }): Promise<MoodTimelineEntry> {
    const map = await this.readTimelineMap();
    const existing = map[input.userId] ?? [];
    const entry: MoodTimelineEntry = {
      id: createUuid(),
      userId: input.userId,
      mood: input.mood,
      confidence: input.confidence,
      source: input.source,
      label: input.label ?? moodLabelDisplay(input.mood),
      snippet: input.snippet?.slice(0, 160),
      detectedAt: nowIso(),
    };
    await this.writeTimeline(input.userId, [entry, ...existing]);
    return entry;
  }

  async detectAndRecord(input: {
    userId: EntityId;
    text: string;
    source: MoodTimelineSource;
  }): Promise<MoodTimelineEntry | null> {
    const detected = moodDetectionEngine.detectFromText(input.text);
    if (!detected || detected.confidence < 0.6) return null;
    return this.recordDetection({
      userId: input.userId,
      mood: detected.mood,
      confidence: detected.confidence,
      source: input.source,
      snippet: input.text.slice(0, 160),
      label: moodLabelDisplay(detected.mood),
    });
  }

  async recordJournalEntry(userId: EntityId, entry: MoodEntry): Promise<MoodTimelineEntry | null> {
    const detected = moodDetectionEngine.inferFromJournal(entry);
    if (!detected) return null;
    return this.recordDetection({
      userId,
      mood: detected.mood,
      confidence: detected.confidence,
      source: 'journal',
      label: `Journal · ${moodLabelDisplay(detected.mood)}`,
    });
  }

  async getTimeline(userId: EntityId, days = 90): Promise<MoodTimelineEntry[]> {
    const map = await this.readTimelineMap();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return (map[userId] ?? [])
      .filter((entry) => new Date(entry.detectedAt) >= cutoff)
      .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  }

  async getCurrentMood(userId: EntityId): Promise<MoodSnapshot> {
    const latest = (await this.getTimeline(userId, 14))[0];
    if (!latest) return { current: null, confidence: 0 };
    return {
      current: latest.mood,
      confidence: latest.confidence,
      detectedAt: latest.detectedAt,
      source: latest.source,
    };
  }

  async getUnifiedMoodHistory(userId: EntityId): Promise<MoodHistoryEntry[]> {
    const [timeline, checkIns] = await Promise.all([
      this.getTimeline(userId, 30),
      getDailyCheckInService(this.storage).listMoodHistory(),
    ]);

    const fromTimeline: MoodHistoryEntry[] = timeline.map((entry) => ({
      date: entry.detectedAt.slice(0, 10),
      mood: moodLabelToMemoryMood(entry.mood),
      label: entry.label,
      source: timelineSourceToHistorySource(entry.source),
      savedAt: entry.detectedAt,
    }));

    const merged = [...fromTimeline, ...checkIns];
    const seen = new Set<string>();
    return merged.filter((entry) => {
      const key = `${entry.date}:${entry.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async buildAdaptationBlock(userId: EntityId, userMessage: string): Promise<string> {
    const detected = moodDetectionEngine.detectFromText(userMessage);
    const snapshot = await this.getCurrentMood(userId);
    const mood = detected?.mood ?? snapshot.current;
    if (!mood) return '';
    return getMoodAdaptationService(this.storage).buildAdaptationBlock(userId, mood);
  }
}

let moodIntelligenceInstance: MoodIntelligenceService | null = null;

export function getMoodIntelligenceService(storage: IStorageService) {
  if (!moodIntelligenceInstance) moodIntelligenceInstance = new MoodIntelligenceService(storage);
  return moodIntelligenceInstance;
}

export function resetMoodIntelligenceService() {
  moodIntelligenceInstance = null;
}
