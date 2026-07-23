import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { EmptyState, SectionCard } from '../components/premium/premium-ui';
import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { VisionBoardItemV5, VISION_CATEGORY_LABELS, VisionCategory } from '../types/phase5-life-os';
import { getPhase5LifeOSService } from '../services/life-os/phase5-life-os-service';
import { LifeOSScreenShell } from '../components/phase5/life-os-screen-shell';

const CATEGORIES: VisionCategory[] = ['career', 'fitness', 'travel', 'lifestyle', 'custom'];

export function VisionBoardScreen() {
  const { profile, services } = useVoxa();
  const service = getPhase5LifeOSService(services.storage, services.repositories);
  const [items, setItems] = useState<VisionBoardItemV5[]>([]);
  const [title, setTitle] = useState('');
  const [view, setView] = useState<'grid' | 'focus' | 'progress' | 'completed'>('grid');

  const load = useCallback(async () => {
    if (!profile) return;
    setItems(await service.listVisionItems(profile.id));
  }, [profile, service]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = items.filter((i) => {
    if (view === 'completed') return i.status === 'completed';
    if (view === 'progress') return i.progress > 0 && i.status === 'active';
    if (view === 'focus') return i.pinned;
    return i.status === 'active';
  });

  const add = async () => {
    if (!profile || !title.trim()) return;
    await service.addVisionItem(profile.id, { title: title.trim(), category: 'custom' });
    setTitle('');
    void load();
  };

  return (
    <LifeOSScreenShell title="Vision Board" subtitle="Dreams, photos, quotes & progress — linked to your goals.">
      <View style={styles.tabs}>
        {(['grid', 'focus', 'progress', 'completed'] as const).map((v) => (
          <Pressable key={v} onPress={() => setView(v)} style={[styles.tab, view === v && styles.tabActive]}>
            <VoxaText variant="caption" color={view === v ? 'primarySoft' : 'textMuted'}>{v}</VoxaText>
          </Pressable>
        ))}
      </View>

      <GlassCard style={styles.field}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Add a vision item…"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <PrimaryButton label="Add" onPress={() => void add()} />
      </GlassCard>

      {filtered.length === 0 ? (
        <EmptyState icon="images-outline" title="Your board is empty" message="Add text goals, quotes, or photos from chat." />
      ) : (
        <View style={styles.grid}>
          {filtered.map((item) => (
            <GlassCard key={item.id} style={styles.card}>
              <VoxaText variant="subtitle">{item.title}</VoxaText>
              <VoxaText variant="caption" color="textMuted">{VISION_CATEGORY_LABELS[item.category]}</VoxaText>
              <VoxaText variant="caption" color="primarySoft">{item.progress}%</VoxaText>
              <View style={styles.row}>
                <Pressable onPress={() => void service.updateVisionItem({ ...item, pinned: !item.pinned }).then(load)}>
                  <VoxaText variant="caption" color="primarySoft">{item.pinned ? 'Unpin' : 'Pin'}</VoxaText>
                </Pressable>
                <Pressable onPress={() => void service.convertVisionToGoal(profile!.id, item.id).then(() => Alert.alert('Converted', 'Added as a goal with plan.'))}>
                  <VoxaText variant="caption" color="primarySoft">→ Goal</VoxaText>
                </Pressable>
                <Pressable onPress={() => void service.deleteVisionItem(profile!.id, item.id).then(load)}>
                  <VoxaText variant="caption" color="danger">Delete</VoxaText>
                </Pressable>
              </View>
            </GlassCard>
          ))}
        </View>
      )}
    </LifeOSScreenShell>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tab: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 8, backgroundColor: colors.surface },
  tabActive: { borderWidth: 1, borderColor: colors.primarySoft },
  field: { padding: spacing.md, gap: spacing.sm },
  input: { color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { width: '47%', padding: spacing.md, gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
});
