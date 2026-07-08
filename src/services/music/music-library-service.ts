import { STORAGE_KEYS } from '../../constants/storage-keys';
import { MusicRecognitionResult, RecognizedSong, createUuid } from '../../types';
import { IStorageService } from '../contracts';

export type MoodPlaylist = {
  id: string;
  name: string;
  mood: string;
  songIds: string[];
  createdAt: string;
};

export type FavoriteSong = RecognizedSong & { favoritedAt: string };

export class MusicLibraryService {
  constructor(private readonly storage: IStorageService) {}

  private async readFavorites(): Promise<FavoriteSong[]> {
    return (await this.storage.getItem<FavoriteSong[]>(STORAGE_KEYS.musicFavorites)) ?? [];
  }

  private async readPlaylists(): Promise<MoodPlaylist[]> {
    return (await this.storage.getItem<MoodPlaylist[]>(STORAGE_KEYS.musicPlaylists)) ?? [];
  }

  async listFavorites(userId: string): Promise<FavoriteSong[]> {
    return (await this.readFavorites()).filter((s) => s.userId === userId);
  }

  async addFavorite(userId: string, song: RecognizedSong): Promise<FavoriteSong> {
    const all = await this.readFavorites();
    const existing = all.find((s) => s.id === song.id);
    if (existing) return existing;
    const favorite: FavoriteSong = { ...song, favoritedAt: new Date().toISOString() };
    await this.storage.setItem(STORAGE_KEYS.musicFavorites, [favorite, ...all].slice(0, 100));
    return favorite;
  }

  async removeFavorite(songId: string) {
    const all = await this.readFavorites();
    await this.storage.setItem(STORAGE_KEYS.musicFavorites, all.filter((s) => s.id !== songId));
  }

  async isFavorite(songId: string) {
    return (await this.readFavorites()).some((s) => s.id === songId);
  }

  async listPlaylists(userId: string): Promise<MoodPlaylist[]> {
    return (await this.readPlaylists()).filter((p) => p.id.startsWith(userId.slice(0, 8)));
  }

  async createMoodPlaylist(userId: string, mood: string, songs: RecognizedSong[]): Promise<MoodPlaylist> {
    const playlist: MoodPlaylist = {
      id: `${userId.slice(0, 8)}-${createUuid()}`,
      name: `${mood} vibes`,
      mood,
      songIds: songs.map((s) => s.id),
      createdAt: new Date().toISOString(),
    };
    const all = await this.readPlaylists();
    await this.storage.setItem(STORAGE_KEYS.musicPlaylists, [playlist, ...all].slice(0, 20));
    return playlist;
  }

  getMoodRecommendations(mood: string): string[] {
    const map: Record<string, string[]> = {
      calm: ['Lo-fi beats', 'Ambient piano', 'Acoustic folk'],
      happy: ['Upbeat pop', 'Feel-good classics', 'Dance hits'],
      focused: ['Instrumental focus', 'Minimal electronic', 'Classical study'],
      sad: ['Gentle ballads', 'Healing playlists', 'Soft indie'],
      energetic: ['Workout anthems', 'High-energy pop', 'Electronic'],
    };
    return map[mood.toLowerCase()] ?? map.calm;
  }

  buildLyricsExplanation(title: string, artist?: string): string {
    return `I'd love to walk through the lyrics of "${title}"${artist ? ` by ${artist}` : ''} with you. Share what resonates and we'll unpack it together.`;
  }
}

let libraryService: MusicLibraryService | null = null;

export function getMusicLibraryService(storage: IStorageService): MusicLibraryService {
  if (!libraryService) libraryService = new MusicLibraryService(storage);
  return libraryService;
}

export function buildRecommendationFromHistory(history: RecognizedSong[]): MusicRecognitionResult[] {
  const artists = [...new Set(history.map((s) => s.artist).filter(Boolean))];
  return artists.slice(0, 3).map((artist) => ({
    title: `More from ${artist}`,
    artist,
    confidence: 0.6,
    provider: 'recommendation',
  }));
}
