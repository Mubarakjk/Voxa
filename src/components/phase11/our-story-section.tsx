import { Pressable, StyleSheet, View } from 'react-native';

import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { spacing } from '../../constants/theme';
import { OurStoryEntry } from '../../types/phase11-living-companion';
import { StaggerFade } from '../premium/premium-ui';

type Props = {
  entries: OurStoryEntry[];
  onOpenJourney?: () => void;
};

export function OurStorySection({ entries, onOpenJourney }: Props) {
  if (entries.length === 0) return null;

  return (
    <StaggerFade index={0}>
      <GlassCard style={styles.card}>
        <VoxaText variant="caption" color="primarySoft">Our Story</VoxaText>
        {entries.slice(0, 4).map((e) => (
          <View key={e.id} style={styles.row}>
            <VoxaText variant="subtitle">{e.milestone ? '✦ ' : ''}{e.title}</VoxaText>
            <VoxaText variant="caption" color="textMuted" numberOfLines={2}>{e.narrative}</VoxaText>
          </View>
        ))}
        {onOpenJourney ? (
          <Pressable onPress={onOpenJourney}>
            <VoxaText variant="caption" color="primarySoft">See full story in Journey →</VoxaText>
          </Pressable>
        ) : null}
      </GlassCard>
    </StaggerFade>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  row: { gap: spacing.xs },
});
