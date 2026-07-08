import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BackButton } from '../components/ui/back-button';
import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { SectionHeader, VoxaText } from '../components/ui/voxa-text';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import {
  buildRecommendationFromHistory,
  getMusicLibraryService,
} from '../services/music/music-library-service';
import {
  getMusicRecognitionService,
  isAudDConfigured,
} from '../services/music/music-recognition-service';
import { getMusicDebugSnapshot, musicStepLabel } from '../services/music/music-debug-state';
import { MusicRecognitionResult, RecognizedSong } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Music'>;

export function MusicScreen({ navigation }: Props) {
  const { profile, services } = useVoxa();
  const [result, setResult] = useState<MusicRecognitionResult | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<RecognizedSong[]>([]);
  const [favorites, setFavorites] = useState<RecognizedSong[]>([]);
  const [lyricsNote, setLyricsNote] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<MusicRecognitionResult[]>([]);

  const [debugTick, setDebugTick] = useState(0);

  const musicService = getMusicRecognitionService();
  const library = getMusicLibraryService(services.storage);
  const musicDebug = getMusicDebugSnapshot();

  const loadLibrary = useCallback(async () => {
    if (!profile) return;
    setHistory(await musicService.listHistory(profile.id));
    setFavorites(await library.listFavorites(profile.id));
  }, [profile, musicService, library]);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    if (!isRecognizing) return;
    const id = setInterval(() => setDebugTick((v) => v + 1), 400);
    return () => clearInterval(id);
  }, [isRecognizing]);

  const recognize = useCallback(async () => {
    if (!profile) return;
    setIsRecognizing(true);
    setError(null);
    setResult(null);
    setLyricsNote(null);

    try {
      if (!musicService.isConfigured()) {
        setError('Add EXPO_PUBLIC_AUDD_API_TOKEN to enable song recognition.');
        return;
      }

      const recognition = await musicService.recordAndRecognize();
      if (!recognition) {
        setError('Could not identify this song. Try playing it louder or closer to the microphone.');
        return;
      }

      setResult(recognition);
      const saved = await musicService.saveToHistory({
        userId: profile.id,
        title: recognition.title,
        artist: recognition.artist,
        album: recognition.album,
        confidence: recognition.confidence,
        source: 'recognition',
        notes: recognition.provider,
      });
      setRecommendations(buildRecommendationFromHistory([saved, ...history]));
      await loadLibrary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recognition failed.');
    } finally {
      setIsRecognizing(false);
      setDebugTick((v) => v + 1);
    }
  }, [profile, musicService, history, loadLibrary]);

  const toggleFavorite = async (song: RecognizedSong) => {
    const isFav = favorites.some((f) => f.id === song.id);
    if (isFav) await library.removeFavorite(song.id);
    else await library.addFavorite(profile!.id, song);
    await loadLibrary();
  };

  const explainLyrics = () => {
    if (!result) return;
    setLyricsNote(library.buildLyricsExplanation(result.title, result.artist));
  };

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <VoxaText variant="title">Music</VoxaText>
          <VoxaText variant="body" color="textSecondary">
            Identify songs, save favourites, and explore mood playlists.
          </VoxaText>
        </View>

        <GlassCard style={styles.debugCard}>
          <VoxaText variant="label" color="textMuted">
            Recognition debug
          </VoxaText>
          <VoxaText variant="caption" color="textSecondary">
            AudD: {isAudDConfigured() ? 'Yes' : 'No'} · Step: {musicStepLabel(musicDebug.step)}
          </VoxaText>
          {musicDebug.lastError !== 'None' ? (
            <VoxaText variant="caption" color="danger">
              {musicDebug.lastError}
            </VoxaText>
          ) : null}
          {musicDebug.lastResponseStatus !== '—' ? (
            <VoxaText variant="caption" color="textMuted">
              Response: {musicDebug.lastResponseStatus}
            </VoxaText>
          ) : null}
        </GlassCard>

        <GlassCard variant="highlight" style={styles.hero}>
          <Ionicons name="musical-notes-outline" size={40} color={colors.primarySoft} />
          <VoxaText variant="subtitle">What song is this?</VoxaText>
          <VoxaText variant="caption" color="textMuted" style={styles.provider}>
            AudD configured: {isAudDConfigured() ? 'Yes' : 'No'} · Provider: {musicService.getActiveProvider()}
          </VoxaText>
          {isRecognizing ? (
            <View style={styles.recording}>
              <ActivityIndicator color={colors.primarySoft} />
              <VoxaText variant="caption" color="textSecondary">
                Listening for 10 seconds… hold near the music
              </VoxaText>
            </View>
          ) : (
            <PrimaryButton label="Identify song" onPress={recognize} />
          )}
          {error ? (
            <VoxaText variant="caption" color="danger">
              {error}
            </VoxaText>
          ) : null}
        </GlassCard>

        {result ? (
          <GlassCard style={styles.result}>
            {result.artworkUrl ? (
              <Image source={{ uri: result.artworkUrl }} style={styles.artwork} />
            ) : (
              <View style={styles.artworkPlaceholder}>
                <Ionicons name="disc-outline" size={48} color={colors.primarySoft} />
              </View>
            )}
            <VoxaText variant="subtitle">{result.title}</VoxaText>
            <VoxaText variant="body" color="textSecondary">
              {result.artist ?? 'Unknown artist'}
            </VoxaText>
            {result.album ? (
              <VoxaText variant="caption" color="textMuted">
                {result.album}
              </VoxaText>
            ) : null}
            <View style={styles.metaRow}>
              {result.releaseYear ? (
                <VoxaText variant="caption" color="textMuted">
                  {result.releaseYear}
                </VoxaText>
              ) : null}
              {result.genre ? (
                <VoxaText variant="caption" color="textMuted">
                  {result.genre}
                </VoxaText>
              ) : null}
            </View>
            <View style={styles.actionRow}>
              <Pressable style={styles.actionBtn} onPress={explainLyrics}>
                <Ionicons name="text-outline" size={16} color={colors.primarySoft} />
                <VoxaText variant="caption" color="primarySoft">
                  Explain lyrics
                </VoxaText>
              </Pressable>
            </View>
            <View style={styles.linkRow}>
              {result.streamingLinks?.spotify ? (
                <Pressable onPress={() => void Linking.openURL(result.streamingLinks!.spotify!)}>
                  <VoxaText variant="caption" color="primarySoft">
                    Spotify
                  </VoxaText>
                </Pressable>
              ) : null}
              {result.streamingLinks?.appleMusic ? (
                <Pressable onPress={() => void Linking.openURL(result.streamingLinks!.appleMusic!)}>
                  <VoxaText variant="caption" color="primarySoft">
                    Apple Music
                  </VoxaText>
                </Pressable>
              ) : null}
              {result.streamingLinks?.youtube ? (
                <Pressable onPress={() => void Linking.openURL(result.streamingLinks!.youtube!)}>
                  <VoxaText variant="caption" color="primarySoft">
                    YouTube
                  </VoxaText>
                </Pressable>
              ) : null}
            </View>
            {lyricsNote ? (
              <VoxaText variant="caption" color="textSecondary">
                {lyricsNote}
              </VoxaText>
            ) : null}
          </GlassCard>
        ) : null}

        {recommendations.length > 0 ? (
          <>
            <SectionHeader title="Recommended for you" />
            {recommendations.map((rec) => (
              <GlassCard key={`${rec.title}-${rec.artist}`} style={styles.recCard}>
                <VoxaText variant="body">{rec.title}</VoxaText>
                <VoxaText variant="caption" color="textMuted">
                  {rec.artist}
                </VoxaText>
              </GlassCard>
            ))}
          </>
        ) : null}

        {favorites.length > 0 ? (
          <>
            <SectionHeader title="Favourites" />
            {favorites.slice(0, 5).map((song) => (
              <GlassCard key={song.id} style={styles.recCard}>
                <VoxaText variant="body">{song.title}</VoxaText>
                <VoxaText variant="caption" color="textMuted">
                  {song.artist}
                </VoxaText>
              </GlassCard>
            ))}
          </>
        ) : null}

        {history.length > 0 ? (
          <>
            <SectionHeader title="Recent tracks" />
            {history.slice(0, 8).map((song) => (
              <Pressable key={song.id} onPress={() => void toggleFavorite(song)}>
                <GlassCard style={styles.historyRow}>
                  <View style={styles.historyCopy}>
                    <VoxaText variant="body">{song.title}</VoxaText>
                    <VoxaText variant="caption" color="textMuted">
                      {song.artist} · {new Date(song.recognizedAt).toLocaleDateString()}
                    </VoxaText>
                  </View>
                  <Ionicons
                    name={favorites.some((f) => f.id === song.id) ? 'heart' : 'heart-outline'}
                    size={18}
                    color={colors.primarySoft}
                  />
                </GlassCard>
              </Pressable>
            ))}
          </>
        ) : null}

        <SectionHeader title="Mood playlists" />
        <GlassCard style={styles.card}>
          {library.getMoodRecommendations('calm').map((name) => (
            <VoxaText key={name} variant="caption" color="textMuted">
              · {name}
            </VoxaText>
          ))}
          <VoxaText variant="caption" color="textSecondary" style={styles.comingSoon}>
            Full playlist creation coming soon — identify songs to build your library.
          </VoxaText>
        </GlassCard>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: { gap: spacing.sm, marginBottom: spacing.sm },
  debugCard: { gap: spacing.xs, paddingVertical: spacing.md },
  hero: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  provider: { marginTop: -spacing.sm },
  recording: { alignItems: 'center', gap: spacing.sm },
  result: { alignItems: 'center', gap: spacing.sm },
  artwork: { width: 120, height: 120, borderRadius: radius.md },
  artworkPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: { flexDirection: 'row', gap: spacing.md },
  actionRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  linkRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recCard: { gap: 4, marginBottom: spacing.sm },
  historyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  historyCopy: { flex: 1, gap: 2 },
  card: { gap: spacing.sm },
  comingSoon: { marginTop: spacing.sm },
});
