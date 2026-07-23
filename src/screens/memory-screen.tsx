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
import { isFeatureVisible } from '../config/feature-status';
import { colors, layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { Memory } from '../types';
import { isMemoryPinned, withMemoryPinned } from '../utils/memory-pinned';
import { MemoryConfidenceBadge } from '../components/phase4/memory-confidence-badge';
import { memoryConfidenceService } from '../services/memory/memory-confidence-service';

type Props = NativeStackScreenProps<RootStackParamList, 'Memory'>;

export function MemoryScreen({ navigation }: Props) {
  const { profile, companion, services, refreshProfile } = useVoxa();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMemories = useCallback(async () => {
    if (!profile) return;
    setIsLoading(true);
    setError(null);
    try {
      const items = await companion.listMemories(profile.id);
      setMemories(items.sort((a, b) => Number(isMemoryPinned(b)) - Number(isMemoryPinned(a))));
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

  const togglePin = async (memory: Memory) => {
    if (!isFeatureVisible('pinnedMemories')) return;
    try {
      const pinned = !isMemoryPinned(memory);
      const updated = withMemoryPinned(memory, pinned);
      await services.repositories.memories.updateMemory(memory.id, {
        pinned,
        tags: updated.tags,
      });
      await loadMemories();
    } catch (err) {
      Alert.alert('Could not update', err instanceof Error ? err.message : 'Try again.');
    }
  };

  const correctMemory = (memory: Memory) => {
    Alert.prompt('Correct memory', 'Update what Voxa should remember:', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save',
        onPress: async (text?: string) => {
          if (!text?.trim()) return;
          try {
            await services.repositories.memories.updateMemory(memory.id, {
              content: text.trim(),
              confidence: 0.9,
            });
            await loadMemories();
          } catch (err) {
            Alert.alert('Update failed', err instanceof Error ? err.message : 'Try again.');
          }
        },
      },
    ], 'plain-text', memory.content);
  };

  const confirmDelete = (memory: Memory) => {
    Alert.alert('Delete memory?', memory.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await companion.deleteMemory(memory.id);
            await loadMemories();
            await refreshProfile();
          } catch (err) {
            Alert.alert('Delete failed', err instanceof Error ? err.message : 'Try again.');
          }
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
          try {
            await companion.clearAllMemories(profile.id);
            await loadMemories();
            await refreshProfile();
          } catch (err) {
            Alert.alert('Clear failed', err instanceof Error ? err.message : 'Try again.');
          }
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
          memories.map((memory) => {
            const confidence = memoryConfidenceService.level(memory);
            const confidencePct = Math.round((memory.confidence ?? memoryConfidenceService.inferConfidence(memory)) * 100);
            return (
            <GlassCard key={memory.id} style={styles.card}>
              <View style={styles.cardTop}>
                <VoxaText variant="label" color="primarySoft">
                  {MEMORY_CATEGORY_LABELS[memory.category] ?? memory.category}
                </VoxaText>
                <MemoryConfidenceBadge level={confidence} percent={confidencePct} />
              </View>
              <VoxaText variant="subtitle">{memory.title}</VoxaText>
              <VoxaText variant="body" color="textSecondary">
                {memory.content}
              </VoxaText>
              <View style={styles.metaRow}>
                <VoxaText variant="caption" color="textMuted">
                  {isMemoryPinned(memory) ? 'Pinned · ' : ''}Used {memory.useCount ?? 0}×
                </VoxaText>
                <View style={styles.actions}>
                  <Pressable onPress={() => correctMemory(memory)}>
                    <VoxaText variant="caption" color="primarySoft">
                      Correct
                    </VoxaText>
                  </Pressable>
                  {isFeatureVisible('pinnedMemories') ? (
                    <Pressable onPress={() => void togglePin(memory)}>
                      <VoxaText variant="caption" color="primarySoft">
                        {isMemoryPinned(memory) ? 'Unpin' : 'Pin'}
                      </VoxaText>
                    </Pressable>
                  ) : null}
                  <Pressable onPress={() => confirmDelete(memory)}>
                    <VoxaText variant="caption" style={{ color: colors.danger }}>
                      Forget
                    </VoxaText>
                  </Pressable>
                </View>
              </View>
            </GlassCard>
          )})
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
  actions: { flexDirection: 'row', gap: spacing.md },
  footer: { marginTop: spacing.lg },
});
