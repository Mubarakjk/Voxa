import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '../components/ui/buttons';
import { ErrorState, LoadingState } from '../components/ui/screen-state';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { SectionHeader, VoxaText } from '../components/ui/voxa-text';
import { MEMORY_CATEGORY_LABELS } from '../constants/memory-categories';
import { colors, layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { Memory } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Memory'>;

export function MemoryScreen({ navigation }: Props) {
  const { profile, companion, refreshProfile } = useVoxa();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMemories = useCallback(async () => {
    if (!profile) return;
    setIsLoading(true);
    setError(null);
    try {
      const items = await companion.listMemories(profile.id);
      setMemories(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memories.');
    } finally {
      setIsLoading(false);
    }
  }, [companion, profile]);

  useFocusEffect(
    useCallback(() => {
      loadMemories();
    }, [loadMemories]),
  );

  const confirmDelete = (memory: Memory) => {
    Alert.alert('Delete memory?', memory.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await companion.deleteMemory(memory.id);
          await loadMemories();
          await refreshProfile();
        },
      },
    ]);
  };

  const confirmClearAll = () => {
    if (!profile) return;
    Alert.alert('Clear all memories?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all',
        style: 'destructive',
        onPress: async () => {
          await companion.clearAllMemories(profile.id);
          await loadMemories();
          await refreshProfile();
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <ScreenShell padded={false}>
        <LoadingState label="Loading memories..." />
      </ScreenShell>
    );
  }

  if (error) {
    return (
      <ScreenShell padded={false}>
        <ErrorState message={error} onRetry={loadMemories} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <VoxaText variant="title">Memories</VoxaText>
          <VoxaText variant="caption" color="textSecondary">
            {memories.length} saved locally
          </VoxaText>
        </View>

        {memories.length === 0 ? (
          <GlassCard style={styles.empty}>
            <VoxaText variant="body" color="textSecondary">
              No memories yet. Chat with Voxa and she will learn what matters to you.
            </VoxaText>
          </GlassCard>
        ) : (
          memories.map((memory) => (
            <GlassCard key={memory.id} style={styles.card}>
              <View style={styles.cardTop}>
                <VoxaText variant="label" color="primarySoft">
                  {MEMORY_CATEGORY_LABELS[memory.category] ?? memory.category}
                </VoxaText>
                <VoxaText variant="caption" color="textMuted">
                  Importance {memory.importance}/5
                </VoxaText>
              </View>
              <VoxaText variant="subtitle">{memory.title}</VoxaText>
              <VoxaText variant="body" color="textSecondary">
                {memory.content}
              </VoxaText>
              <View style={styles.metaRow}>
                <VoxaText variant="caption" color="textMuted">
                  Used {memory.useCount ?? 0}×
                </VoxaText>
                <Pressable onPress={() => confirmDelete(memory)}>
                  <VoxaText variant="caption" style={{ color: colors.danger }}>
                    Delete
                  </VoxaText>
                </Pressable>
              </View>
            </GlassCard>
          ))
        )}

        {memories.length > 0 ? (
          <View style={styles.footer}>
            <PrimaryButton label="Clear all memories" variant="ghost" onPress={confirmClearAll} />
          </View>
        ) : null}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl,
  },
  header: { gap: spacing.sm, marginBottom: spacing.lg },
  back: { marginBottom: spacing.sm, alignSelf: 'flex-start' },
  empty: { gap: spacing.sm },
  card: { gap: spacing.sm, marginBottom: spacing.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footer: { marginTop: spacing.lg },
});
