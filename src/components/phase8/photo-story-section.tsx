import { ScrollView, StyleSheet, View } from 'react-native';

import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { colors, radius, spacing } from '../../constants/theme';
import { PhotoStoryItem } from '../../types/phase8-retention';

type Props = {
  items: PhotoStoryItem[];
};

export function PhotoStorySection({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <VoxaText variant="subtitle">Photo story</VoxaText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((item) => (
          <GlassCard key={item.id} style={styles.tile}>
            <VoxaText variant="caption" color="primarySoft">{item.category}</VoxaText>
            <VoxaText variant="body" numberOfLines={2}>{item.title}</VoxaText>
            <VoxaText variant="caption" color="textMuted" numberOfLines={2}>{item.summary}</VoxaText>
          </GlassCard>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { gap: spacing.md, paddingVertical: spacing.xs },
  tile: { width: 160, gap: spacing.xs, padding: spacing.md, borderColor: `${colors.primarySoft}22` },
});
