import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';

import { EmptyState, FadeIn, StaggerFade } from '../components/premium/premium-ui';
import { PrimaryButton } from '../components/ui/buttons';
import { ErrorState, LoadingState } from '../components/ui/screen-state';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { MEMORY_CATEGORY_LABELS } from '../constants/memory-categories';
import { isFeatureVisible } from '../config/feature-status';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { Memory, MemoryCategory } from '../types';
import { isMemoryPinned, withMemoryPinned } from '../utils/memory-pinned';
import { MemoryConfidenceBadge } from '../components/phase4/memory-confidence-badge';
import { memoryConfidenceService } from '../services/memory/memory-confidence-service';
import { findNearDuplicatePairs, mergeMemoryContent, mergeTags, resolveImportance } from '../services/memory/memory-deduplication';
import { explainWhyRemembered } from '../utils/memory-why';
import { hapticLight, hapticSelection, hapticWarning } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Memory'>;
type MemoryFilter = 'all' | 'pinned' | 'favourites' | 'recent' | MemoryCategory;

export function MemoryScreen({ navigation }: Props) {
  const { profile, companion, services, refreshProfile } = useVoxa();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedWhy, setExpandedWhy] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MemoryFilter>('all');

  const loadMemories = useCallback(async () => {
    if (!profile) return;
    setIsLoading(true);
    setError(null);
    try {
      const items = await companion.listMemories(profile.id);
      setMemories(
        items.sort((a, b) => {
          const pin = Number(isMemoryPinned(b)) - Number(isMemoryPinned(a));
          if (pin !== 0) return pin;
          return (b.importance ?? 3) - (a.importance ?? 3);
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memories.');
    } finally {
      setIsLoading(false);
    }
  }, [companion, profile]);

  useFocusEffect(
    useCallback(() => {
      void loadMemories();
    }, [loadMemories]),
  );

  const mergeSuggestions = useMemo(() => findNearDuplicatePairs(memories), [memories]);

  const categoryOptions = useMemo(() => {
    const present = new Set(memories.map((m) => m.category));
    return (Object.keys(MEMORY_CATEGORY_LABELS) as MemoryCategory[]).filter((c) => present.has(c));
  }, [memories]);

  const visibleMemories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return memories.filter((memory) => {
      if (filter === 'pinned' && !isMemoryPinned(memory)) return false;
      if (filter === 'favourites' && memory.importance < 4) return false;
      if (filter === 'recent') {
        const age = Date.now() - new Date(memory.updatedAt).getTime();
        if (age > 14 * 86_400_000) return false;
      }
      if (filter !== 'all' && filter !== 'pinned' && filter !== 'favourites' && filter !== 'recent') {
        if (memory.category !== filter) return false;
      }
      if (!q) return true;
      const hay = `${memory.title} ${memory.content} ${memory.tags.join(' ')} ${memory.category}`.toLowerCase();
      return hay.includes(q);
    });
  }, [memories, query, filter]);

  const exportSummary = () => {
    const lines = visibleMemories.slice(0, 40).map((m, i) => {
      const tags = m.tags.length ? ` [${m.tags.slice(0, 4).join(', ')}]` : '';
      return `${i + 1}. ${m.title}${tags}\n${m.content.slice(0, 180)}`;
    });
    void Share.share({
      message: `Voxa Saved Moments\n\n${lines.join('\n\n') || 'No moments in this view.'}`,
    });
  };

  const togglePin = async (memory: Memory) => {
    if (!isFeatureVisible('pinnedMemories')) return;
    try {
      void hapticSelection();
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

  const toggleImportant = async (memory: Memory) => {
    try {
      void hapticSelection();
      const next = (memory.importance >= 4 ? 3 : 5) as Memory['importance'];
      await services.repositories.memories.updateMemory(memory.id, { importance: next });
      await loadMemories();
    } catch (err) {
      Alert.alert('Could not update', err instanceof Error ? err.message : 'Try again.');
    }
  };

  const correctMemory = (memory: Memory) => {
    Alert.prompt(
      'Correct memory',
      'Update what Voxa should remember:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (text?: string) => {
            if (!text?.trim()) return;
            try {
              void hapticLight();
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
      ],
      'plain-text',
      memory.content,
    );
  };

  const mergePair = (a: Memory, b: Memory) => {
    Alert.alert(
      'Merge memories?',
      `Combine “${a.title}” and “${b.title}” into one. The second will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Merge',
          onPress: async () => {
            try {
              void hapticLight();
              await services.repositories.memories.updateMemory(a.id, {
                content: mergeMemoryContent(a.content, b.content),
                tags: mergeTags(a.tags, b.tags),
                importance: resolveImportance(a.importance, b.importance),
                confidence: Math.max(a.confidence ?? 0.5, b.confidence ?? 0.5),
                useCount: (a.useCount ?? 0) + (b.useCount ?? 0),
              });
              await companion.deleteMemory(b.id);
              await loadMemories();
              await refreshProfile();
            } catch (err) {
              Alert.alert('Merge failed', err instanceof Error ? err.message : 'Try again.');
            }
          },
        },
      ],
    );
  };

  const confirmDelete = (memory: Memory) => {
    Alert.alert('Delete memory?', memory.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            void hapticWarning();
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
            void hapticWarning();
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
        <FadeIn>
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityRole="button">
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </Pressable>
            <VoxaText variant="title">Saved Moments</VoxaText>
            <VoxaText variant="caption" color="textSecondary">
              Search, pin, favourite, and export — you stay in control.
            </VoxaText>
          </View>
        </FadeIn>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search moments, tags…"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          accessibilityLabel="Search saved moments"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {(
            [
              { id: 'all' as const, label: 'All' },
              { id: 'recent' as const, label: 'Recent' },
              { id: 'pinned' as const, label: 'Pinned' },
              { id: 'favourites' as const, label: 'Favourites' },
              ...categoryOptions.slice(0, 8).map((c) => ({
                id: c as MemoryFilter,
                label: MEMORY_CATEGORY_LABELS[c],
              })),
            ] as Array<{ id: MemoryFilter; label: string }>
          ).map((chip) => {
            const active = filter === chip.id;
            return (
              <Pressable
                key={String(chip.id)}
                onPress={() => {
                  void hapticSelection();
                  setFilter(chip.id);
                }}
                style={[styles.filterChip, active && styles.filterChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}>
                <VoxaText variant="caption" color={active ? 'primarySoft' : 'textMuted'}>
                  {chip.label}
                </VoxaText>
              </Pressable>
            );
          })}
        </ScrollView>

        {memories.length > 0 ? (
          <PrimaryButton label="Export summary" onPress={exportSummary} variant="ghost" />
        ) : null}

        {mergeSuggestions.length > 0 ? (
          <GlassCard style={styles.suggestCard}>
            <VoxaText variant="subtitle">Suggested merges</VoxaText>
            <VoxaText variant="caption" color="textMuted">
              Similar memories — combine to keep Voxa clearer.
            </VoxaText>
            {mergeSuggestions.slice(0, 3).map(({ a, b }) => (
              <Pressable
                key={`${a.id}-${b.id}`}
                style={styles.mergeRow}
                onPress={() => mergePair(a, b)}
                accessibilityRole="button"
                accessibilityLabel={`Merge ${a.title} and ${b.title}`}>
                <View style={{ flex: 1 }}>
                  <VoxaText variant="body" numberOfLines={1}>
                    {a.title}
                  </VoxaText>
                  <VoxaText variant="caption" color="textMuted" numberOfLines={1}>
                    + {b.title}
                  </VoxaText>
                </View>
                <VoxaText variant="caption" color="primarySoft">
                  Merge
                </VoxaText>
              </Pressable>
            ))}
          </GlassCard>
        ) : null}

        {memories.length === 0 ? (
          <EmptyState
            icon="heart-outline"
            title="No memories yet"
            message="Chat with Voxa about what matters — or save something from a note. You stay in control."
            actionLabel="Open Talk"
            onAction={() => navigation.navigate('MainTabs', { screen: 'Talk' })}
          />
        ) : visibleMemories.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No matches"
            message="Try another search or filter."
            actionLabel="Clear filters"
            onAction={() => {
              setQuery('');
              setFilter('all');
            }}
          />
        ) : (
          visibleMemories.map((memory, index) => {
            const confidence = memoryConfidenceService.level(memory);
            const confidencePct = Math.round(
              (memory.confidence ?? memoryConfidenceService.inferConfidence(memory)) * 100,
            );
            const whyOpen = expandedWhy === memory.id;
            const important = memory.importance >= 4;

            return (
              <StaggerFade key={memory.id} index={Math.min(index, 10)}>
                <GlassCard style={styles.card}>
                  <View style={styles.cardTop}>
                    <VoxaText variant="label" color="primarySoft">
                      {MEMORY_CATEGORY_LABELS[memory.category] ?? memory.category}
                    </VoxaText>
                    <MemoryConfidenceBadge level={confidence} percent={confidencePct} />
                  </View>
                  <View style={styles.titleRow}>
                    {isMemoryPinned(memory) ? (
                      <Ionicons name="pin" size={14} color={colors.primarySoft} />
                    ) : null}
                    {important ? <Ionicons name="star" size={14} color={colors.accentGold} /> : null}
                    <VoxaText variant="subtitle" style={{ flex: 1 }}>
                      {memory.title}
                    </VoxaText>
                  </View>
                  <VoxaText variant="body" color="textSecondary">
                    {memory.content}
                  </VoxaText>

                  <Pressable
                    onPress={() => {
                      void hapticSelection();
                      setExpandedWhy((id) => (id === memory.id ? null : memory.id));
                    }}
                    style={styles.whyBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Why Voxa remembers this">
                    <Ionicons name="help-circle-outline" size={16} color={colors.primarySoft} />
                    <VoxaText variant="caption" color="primarySoft">
                      Why do I remember this?
                    </VoxaText>
                  </Pressable>
                  {whyOpen ? (
                    <VoxaText variant="caption" color="textMuted" style={styles.whyText}>
                      {explainWhyRemembered(memory)}
                    </VoxaText>
                  ) : null}

                  <View style={styles.metaRow}>
                    <VoxaText variant="caption" color="textMuted">
                      Used {memory.useCount ?? 0}× · {new Date(memory.updatedAt).toLocaleDateString()}
                    </VoxaText>
                  </View>
                  <View style={styles.actions}>
                    <Action label="Edit" onPress={() => correctMemory(memory)} />
                    <Action
                      label={important ? 'Unmark' : 'Important'}
                      onPress={() => void toggleImportant(memory)}
                    />
                    {isFeatureVisible('pinnedMemories') ? (
                      <Action
                        label={isMemoryPinned(memory) ? 'Unpin' : 'Pin'}
                        onPress={() => void togglePin(memory)}
                      />
                    ) : null}
                    <Action label="Forget" danger onPress={() => confirmDelete(memory)} />
                  </View>
                </GlassCard>
              </StaggerFade>
            );
          })
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

function Action({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.actionBtn} accessibilityRole="button">
      <VoxaText variant="caption" color={danger ? 'danger' : 'primarySoft'}>
        {label}
      </VoxaText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  header: { gap: spacing.sm, marginBottom: spacing.md },
  back: { marginBottom: spacing.sm, alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  search: {
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
  },
  filters: { gap: spacing.sm, paddingVertical: 2 },
  filterChip: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surfaceStrong,
    justifyContent: 'center',
  },
  filterChipActive: { borderColor: colors.primarySoft },
  suggestCard: { gap: spacing.sm, marginBottom: spacing.sm },
  mergeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    minHeight: 52,
  },
  card: { gap: spacing.sm, marginBottom: spacing.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  whyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40 },
  whyText: { lineHeight: 18 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    minHeight: 36,
    justifyContent: 'center',
  },
  footer: { marginTop: spacing.lg },
});
