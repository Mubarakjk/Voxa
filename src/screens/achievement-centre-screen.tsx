import { FlatList, StyleSheet, View } from 'react-native';
import { useCallback, useState } from 'react';

import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { GlassCard } from '../components/ui/glass-card';
import { FadeIn, ScreenHeader } from '../components/premium/premium-ui';
import { layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { getAchievementService } from '../services/phase10/achievement-service';
import { Achievement } from '../types/phase10-play';

export function AchievementCentreScreen() {
  const { profile, services } = useVoxa();
  const [items, setItems] = useState<Achievement[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    setItems(await getAchievementService(services.storage).listWithStatus(profile.id));
  }, [profile, services.storage]);

  return (
    <ScreenShell padded={false}>
      <View style={styles.headerWrap}>
        <ScreenHeader title="Achievement Centre" subtitle="Your trophy cabinet" />
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onLayout={() => void load()}
        renderItem={({ item, index }) => (
          <FadeIn delay={index * 25}>
            <GlassCard style={{ ...styles.card, ...(item.unlockedAt ? {} : styles.locked) }}>
              <VoxaText variant="subtitle">{item.emoji} {item.title}</VoxaText>
              <VoxaText variant="caption" color="textMuted">{item.description}</VoxaText>
              <VoxaText variant="caption" color={item.unlockedAt ? 'primarySoft' : 'textMuted'}>
                {item.unlockedAt ? `Unlocked · ${item.rarity}` : `Locked · ${item.rarity}`}
              </VoxaText>
            </GlassCard>
          </FadeIn>
        )}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.lg },
  list: { padding: layout.screenPadding, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { gap: spacing.xs },
  locked: { opacity: 0.55 },
});
