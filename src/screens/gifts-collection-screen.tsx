import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { ScreenHeader } from '../components/premium/premium-ui';
import { LoadingState } from '../components/ui/screen-state';
import { layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getCosmeticRewardsService } from '../services/phase12/cosmetic-rewards-service';
import { CosmeticReward } from '../types/phase12-experiences';

type Props = NativeStackScreenProps<RootStackParamList, 'GiftsCollection'>;

export function GiftsCollectionScreen(_props: Props) {
  const { profile, services } = useVoxa();
  const svc = getCosmeticRewardsService(services.storage);
  const [rewards, setRewards] = useState<CosmeticReward[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    await svc.seedDefaults(profile.id);
    setRewards(await svc.list(profile.id));
    setLoading(false);
  }, [profile, svc]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const equip = async (reward: CosmeticReward) => {
    if (!profile) return;
    await svc.equip(profile.id, reward.id, reward.kind);
    void load();
  };

  if (loading) {
    return (
      <ScreenShell>
        <LoadingState label="Loading collection..." />
      </ScreenShell>
    );
  }

  const unlocked = rewards.filter((r) => r.unlockedAt);
  const locked = rewards.filter((r) => !r.unlockedAt);

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader showBack title="Gifts & collection" subtitle="Cosmetic rewards from real milestones — no pay-to-win." />
        <VoxaText variant="caption" color="primarySoft">Unlocked</VoxaText>
        {unlocked.map((r) => (
          <Pressable key={r.id} onPress={() => void equip(r)}>
            <GlassCard style={styles.card}>
              <View style={[styles.swatch, { backgroundColor: r.previewColor ?? '#8b7cf6' }]} />
              <VoxaText variant="subtitle">{r.title}{r.equipped ? ' · Equipped' : ''}</VoxaText>
              <VoxaText variant="caption" color="textMuted">{r.unlockReason ?? r.description}</VoxaText>
            </GlassCard>
          </Pressable>
        ))}
        {locked.length ? <VoxaText variant="caption" color="textMuted">More unlock through milestones and play.</VoxaText> : null}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: layout.screenPadding, paddingBottom: spacing.xxl, gap: spacing.sm },
  card: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  swatch: { width: 40, height: 40, borderRadius: 20 },
});
