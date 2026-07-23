import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { EmptyState } from '../components/premium/premium-ui';
import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { BucketListItemV5 } from '../types/phase5-life-os';
import { getPhase5LifeOSService } from '../services/life-os/phase5-life-os-service';
import { LifeOSScreenShell } from '../components/phase5/life-os-screen-shell';

export function BucketListScreen() {
  const { profile, services } = useVoxa();
  const service = getPhase5LifeOSService(services.storage, services.repositories);
  const [items, setItems] = useState<BucketListItemV5[]>([]);
  const [title, setTitle] = useState('');

  const load = useCallback(async () => {
    if (!profile) return;
    setItems(await service.listBucketItems(profile.id));
  }, [profile, service]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const add = async () => {
    if (!profile || !title.trim()) return;
    await service.addBucketItem(profile.id, { title: title.trim() });
    setTitle('');
    void load();
  };

  return (
    <LifeOSScreenShell title="Bucket List" subtitle="Dreams and experiences — say “Add Japan to my bucket list” in chat.">
      <GlassCard style={styles.field}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Something to experience someday…"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <PrimaryButton label="Add dream" onPress={() => void add()} />
      </GlassCard>

      {items.length === 0 ? (
        <EmptyState icon="earth-outline" title="No dreams yet" message="Tell Voxa what you want to experience." />
      ) : (
        items.map((item) => (
          <GlassCard key={item.id} style={styles.card}>
            <VoxaText variant="subtitle">{item.title}</VoxaText>
            <VoxaText variant="caption" color="textMuted">{item.status} · P{item.priority}</VoxaText>
            {item.personalMeaning ? (
              <VoxaText variant="body" color="textSecondary">{item.personalMeaning}</VoxaText>
            ) : null}
            <View style={styles.row}>
              <Pressable onPress={() => void service.convertBucketToGoal(profile!.id, item.id).then(() => Alert.alert('Converted', 'Now a goal with plan.'))}>
                <VoxaText variant="caption" color="primarySoft">→ Goal</VoxaText>
              </Pressable>
              {item.status !== 'completed' ? (
                <Pressable onPress={() => void service.completeBucketItem(profile!.id, item.id, `Completed: ${item.title}`).then(load)}>
                  <VoxaText variant="caption" color="primarySoft">Complete</VoxaText>
                </Pressable>
              ) : null}
              <Pressable onPress={() => void service.deleteBucketItem(profile!.id, item.id).then(load)}>
                <VoxaText variant="caption" color="danger">Delete</VoxaText>
              </Pressable>
            </View>
          </GlassCard>
        ))
      )}
    </LifeOSScreenShell>
  );
}

const styles = StyleSheet.create({
  field: { padding: spacing.md, gap: spacing.sm },
  input: { color: colors.text },
  card: { padding: spacing.md, gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
});
