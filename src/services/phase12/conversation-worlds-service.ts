import { STORAGE_KEYS } from '../../constants/storage-keys';
import { EntityId, nowIso } from '../../types';
import { ConversationWorld, WorldId, WorldPreference } from '../../types/phase12-experiences';
import { IStorageService } from '../contracts';

export const CONVERSATION_WORLDS: ConversationWorld[] = [
  { id: 'coffee_shop', name: 'Coffee Shop', description: 'Warm, casual catch-up energy', gradient: ['#2a1f3d', '#1a1028'], accentColor: '#c4a882', starters: ['What\'s on your mind over coffee?'], suitableActivities: ['chat', 'reflect'], moodHint: 'calm' },
  { id: 'park_walk', name: 'Walk in the Park', description: 'Fresh air and open conversation', gradient: ['#1a2e1a', '#0f1a12'], accentColor: '#7ec89b', starters: ['Walk with me — how\'s your week?'], suitableActivities: ['chat', 'plan'], moodHint: 'happy' },
  { id: 'rainy_evening', name: 'Rainy Evening', description: 'Cozy, introspective mood', gradient: ['#1a2233', '#121820'], accentColor: '#8ba4c7', starters: ['Rain outside — want to talk?'], suitableActivities: ['reflect', 'journal'], moodHint: 'calm' },
  { id: 'beach_sunset', name: 'Beach Sunset', description: 'Golden hour unwind', gradient: ['#3d2a1a', '#1a1520'], accentColor: '#f0a060', starters: ['Sun\'s going down — what felt good today?'], suitableActivities: ['reflect'], moodHint: 'relaxed' },
  { id: 'late_night_drive', name: 'Late-Night Drive', description: 'Deep talks after dark', gradient: ['#0a0a18', '#1a1030'], accentColor: '#9080ff', starters: ['Night drive thoughts?'], suitableActivities: ['chat', 'reflect'], moodHint: 'thinking' },
  { id: 'study_room', name: 'Study Room', description: 'Focused, structured energy', gradient: ['#1a1a2e', '#12121e'], accentColor: '#a0b4ff', starters: ['What are we studying today?'], suitableActivities: ['study', 'plan'], moodHint: 'focused' },
  { id: 'startup_office', name: 'Startup Office', description: 'Build mode activated', gradient: ['#1e1a2a', '#0e0e18'], accentColor: '#b388ff', starters: ['What\'s the one thing to ship?'], suitableActivities: ['coach', 'plan'], moodHint: 'focused' },
  { id: 'gym_corner', name: 'Gym Corner', description: 'Accountability and effort', gradient: ['#1a2020', '#0e1214'], accentColor: '#66d9a0', starters: ['How was the workout?'], suitableActivities: ['coach'], moodHint: 'excited' },
  { id: 'airport_lounge', name: 'Airport Lounge', description: 'Between-here-and-there energy', gradient: ['#1a2230', '#101820'], accentColor: '#90caf9', starters: ['Where are you headed — literally or figuratively?'], suitableActivities: ['chat', 'plan'], moodHint: 'curious' },
  { id: 'rooftop_night', name: 'Rooftop at Night', description: 'City lights, big picture', gradient: ['#0a0818', '#201030'], accentColor: '#ce93d8', starters: ['Look at the view — what matters right now?'], suitableActivities: ['reflect', 'chat'], moodHint: 'calm' },
  { id: 'quiet_library', name: 'Quiet Library', description: 'Soft, thoughtful pacing', gradient: ['#181820', '#0e0e14'], accentColor: '#bcaaa4', starters: ['Whisper mode — what\'s worth thinking through?'], suitableActivities: ['study', 'reflect'], moodHint: 'focused' },
  { id: 'gaming_room', name: 'Gaming Room', description: 'Playful, low-stakes banter', gradient: ['#1a1030', '#0a0820'], accentColor: '#80deea', starters: ['Game on — what should we play with today?'], suitableActivities: ['play', 'chat'], moodHint: 'excited' },
];

export class ConversationWorldsService {
  constructor(private readonly storage: IStorageService) {}

  async getPreferences(userId: EntityId): Promise<WorldPreference> {
    const map = (await this.storage.getItem<Record<string, WorldPreference>>(STORAGE_KEYS.worldPreferences)) ?? {};
    return map[userId] ?? { userId, favouriteWorldIds: [], reducedMotion: false };
  }

  async enter(userId: EntityId, worldId: WorldId): Promise<WorldPreference> {
    const prefs = await this.getPreferences(userId);
    const updated: WorldPreference = {
      ...prefs,
      lastUsedWorldId: worldId,
      lastUsedAt: nowIso(),
    };
    const map = (await this.storage.getItem<Record<string, WorldPreference>>(STORAGE_KEYS.worldPreferences)) ?? {};
    map[userId] = updated;
    await this.storage.setItem(STORAGE_KEYS.worldPreferences, map);
    return updated;
  }

  async toggleFavourite(userId: EntityId, worldId: WorldId): Promise<WorldPreference> {
    const prefs = await this.getPreferences(userId);
    const favs = prefs.favouriteWorldIds.includes(worldId)
      ? prefs.favouriteWorldIds.filter((id) => id !== worldId)
      : [...prefs.favouriteWorldIds, worldId];
    const updated = { ...prefs, favouriteWorldIds: favs };
    const map = (await this.storage.getItem<Record<string, WorldPreference>>(STORAGE_KEYS.worldPreferences)) ?? {};
    map[userId] = updated;
    await this.storage.setItem(STORAGE_KEYS.worldPreferences, map);
    return updated;
  }

  getWorld(id: WorldId): ConversationWorld | undefined {
    return CONVERSATION_WORLDS.find((w) => w.id === id);
  }

  promptTone(worldId: WorldId): string {
    const w = this.getWorld(worldId);
    if (!w) return '';
    return `Conversation world: ${w.name} — ${w.description}. Keep pacing ${w.moodHint}; do not override safety or user preferences.`;
  }
}

let instance: ConversationWorldsService | null = null;

export function getConversationWorldsService(storage: IStorageService) {
  if (!instance) instance = new ConversationWorldsService(storage);
  return instance;
}
