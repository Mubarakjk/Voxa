import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { FadeIn, SectionCard } from '../components/premium/premium-ui';
import { BackButton } from '../components/ui/back-button';
import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { SectionHeader, VoxaText } from '../components/ui/voxa-text';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getRoutineCoachService } from '../services/routine/routine-coach-service';
import { recordRoutineSyncStatus } from '../utils/chat-debug-state';
import {
  ROUTINE_KIND_LABELS,
  RoutineBlock,
  RoutineBlockKind,
  TodayRoutineSummary,
} from '../types/routine';
import { formatTime12Hour } from '../utils/time-parse';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const KINDS: RoutineBlockKind[] = ['wake', 'study', 'gym', 'work', 'meal', 'prayer', 'wind_down', 'custom'];

export function RoutineCoachScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, services } = useVoxa();
  const coach = getRoutineCoachService(services.storage, services.repositories);

  const [schedule, setSchedule] = useState<TodayRoutineSummary | null>(null);
  const [blocks, setBlocks] = useState<RoutineBlock[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');
  const [kind, setKind] = useState<RoutineBlockKind>('custom');
  const [repeatDays, setRepeatDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const [today, all] = await Promise.all([
        coach.getTodaySchedule(profile.id),
        coach.listBlocks(profile.id),
      ]);
      setSchedule(today);
      setBlocks(all);
      recordRoutineSyncStatus(`OK · ${today.completedCount}/${today.totalCount}`);
    } catch (err) {
      recordRoutineSyncStatus(err instanceof Error ? err.message : 'Failed');
    }
  }, [coach, profile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openCreate = () => {
    setEditingId(null);
    setTitle('');
    setTime('09:00');
    setKind('custom');
    setRepeatDays([1, 2, 3, 4, 5]);
    setEditorOpen(true);
  };

  const openEdit = (block: RoutineBlock) => {
    setEditingId(block.id);
    setTitle(block.title);
    setTime(block.time);
    setKind(block.kind);
    setRepeatDays(block.repeatDays);
    setEditorOpen(true);
  };

  const saveBlock = async () => {
    if (!profile || !title.trim()) return;
    try {
      if (editingId) {
        await coach.updateBlock(editingId, { title: title.trim(), time, kind, repeatDays });
      } else {
        await coach.createBlock({
          userId: profile.id,
          title: title.trim(),
          time,
          kind,
          repeatDays,
        });
      }
      setEditorOpen(false);
      await load();
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Try again.');
    }
  };

  const deleteBlock = (block: RoutineBlock) => {
    Alert.alert('Delete routine?', block.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void coach.deleteBlock(block.id).then(load);
        },
      },
    ]);
  };

  const mark = async (blockId: string, status: 'completed' | 'skipped' | 'snoozed') => {
    if (!profile) return;
    try {
      await coach.markBlock(profile.id, blockId, status);
      await load();
    } catch (err) {
      Alert.alert('Could not update', err instanceof Error ? err.message : 'Try again.');
    }
  };

  const toggleDay = (day: number) => {
    setRepeatDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    );
  };

  if (!profile) return null;

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeIn>
          <View style={styles.header}>
            <BackButton onPress={() => navigation.goBack()} />
            <VoxaText variant="title">Routine Coach</VoxaText>
            <VoxaText variant="body" color="textSecondary">
              Build your day — one block at a time.
            </VoxaText>
          </View>
        </FadeIn>

        {schedule ? (
          <GlassCard variant="highlight" style={styles.summary}>
            <VoxaText variant="label" color="primarySoft">
              Today
            </VoxaText>
            <VoxaText variant="subtitle">
              {schedule.completionPercent}% complete · {schedule.streakDays} day streak
            </VoxaText>
            {schedule.nextBlock ? (
              <VoxaText variant="caption" color="textSecondary">
                Next: {schedule.nextBlock.title} at{' '}
                {formatTime12Hour(
                  Number(schedule.nextBlock.time.split(':')[0]),
                  Number(schedule.nextBlock.time.split(':')[1]),
                )}
              </VoxaText>
            ) : (
              <VoxaText variant="caption" color="textMuted">
                All done for today — nice work.
              </VoxaText>
            )}
          </GlassCard>
        ) : null}

        <SectionHeader title="Today's timeline" />
        {schedule?.blocks.length ? (
          schedule.blocks.map((block) => {
            const [h, m] = block.time.split(':').map(Number);
            const status = block.completion?.status;
            const done = status === 'completed';
            return (
              <GlassCard key={block.id} style={styles.blockCard}>
                <View style={styles.blockRow}>
                  <Pressable style={styles.blockMain} onPress={() => !done && void mark(block.id, 'completed')}>
                    <VoxaText variant="body">
                      {done ? '✓ ' : status === 'skipped' ? '– ' : status === 'snoozed' ? '⏸ ' : '○ '}
                      {block.title}
                    </VoxaText>
                    <VoxaText variant="caption" color="textMuted">
                      {formatTime12Hour(h, m)} · {ROUTINE_KIND_LABELS[block.kind]}
                    </VoxaText>
                  </Pressable>
                  <Pressable onPress={() => openEdit(block)}>
                    <Ionicons name="create-outline" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
                {!done ? (
                  <View style={styles.blockActions}>
                    <Pressable onPress={() => void mark(block.id, 'skipped')}>
                      <VoxaText variant="caption" color="textMuted">
                        Skip
                      </VoxaText>
                    </Pressable>
                    <Pressable onPress={() => void mark(block.id, 'snoozed')}>
                      <VoxaText variant="caption" color="textMuted">
                        Snooze
                      </VoxaText>
                    </Pressable>
                    <Pressable onPress={() => deleteBlock(block)}>
                      <VoxaText variant="caption" color="danger">
                        Delete
                      </VoxaText>
                    </Pressable>
                  </View>
                ) : null}
              </GlassCard>
            );
          })
        ) : (
          <SectionCard title="No routine yet" subtitle="Add your first block below" />
        )}

        <PrimaryButton label="Add routine block" onPress={openCreate} />

        {blocks.length > 0 ? (
          <>
            <SectionHeader title="All blocks" />
            {blocks.map((block) => (
              <Pressable key={`all-${block.id}`} onPress={() => openEdit(block)}>
                <GlassCard style={styles.miniCard}>
                  <VoxaText variant="body">{block.title}</VoxaText>
                  <VoxaText variant="caption" color="textMuted">
                    {block.time} · {block.repeatDays.map((d) => DAY_LABELS[d]).join(', ')}
                  </VoxaText>
                </GlassCard>
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>

      <Modal visible={editorOpen} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setEditorOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <VoxaText variant="subtitle">{editingId ? 'Edit block' : 'New block'}</VoxaText>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Title e.g. Morning walk"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <TextInput
              value={time}
              onChangeText={setTime}
              placeholder="Time HH:mm"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {KINDS.map((k) => (
                <Pressable
                  key={k}
                  onPress={() => setKind(k)}
                  style={[styles.chip, kind === k && styles.chipActive]}>
                  <VoxaText variant="caption" color={kind === k ? 'primarySoft' : 'textMuted'}>
                    {ROUTINE_KIND_LABELS[k]}
                  </VoxaText>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.dayRow}>
              {DAY_LABELS.map((label, index) => (
                <Pressable
                  key={label}
                  onPress={() => toggleDay(index)}
                  style={[styles.dayChip, repeatDays.includes(index) && styles.chipActive]}>
                  <VoxaText variant="caption" color={repeatDays.includes(index) ? 'primarySoft' : 'textMuted'}>
                    {label}
                  </VoxaText>
                </Pressable>
              ))}
            </View>
            <PrimaryButton label="Save" onPress={() => void saveBlock()} />
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: layout.tabBarHeight + spacing.xxl,
    gap: spacing.md,
  },
  header: { gap: spacing.xs, marginBottom: spacing.sm },
  summary: { gap: spacing.sm, marginBottom: spacing.md },
  blockCard: { gap: spacing.sm },
  blockRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  blockMain: { flex: 1, gap: 4 },
  blockActions: { flexDirection: 'row', gap: spacing.lg },
  miniCard: { gap: 4, marginBottom: spacing.sm },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#12121E',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  chipRow: { gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  chipActive: {
    borderColor: colors.primarySoft,
    backgroundColor: 'rgba(45, 212, 191, 0.15)',
  },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dayChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
});
