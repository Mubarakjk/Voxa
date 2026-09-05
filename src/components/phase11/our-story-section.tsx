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
        <VoxaText variant="caption" color="primarySoft">
          Our Story
        </VoxaText>
        {entries.slice(0, 4).map((e) => (
          <View key={e.id} style={styles.row}>
            <VoxaText variant="subtitle" style={styles.title}>
              {e.milestone ? '✦ ' : ''}
              {e.title}
            </VoxaText>
            <VoxaText variant="caption" color="textMuted" style={styles.narrative}>
              {e.narrative}
            </VoxaText>
          </View>
        ))}
        {onOpenJourney ? (
          <Pressable onPress={onOpenJourney} style={styles.link} hitSlop={6}>
            <VoxaText variant="caption" color="primarySoft">
              See full story in Journey →
            </VoxaText>
          </Pressable>
        ) : null}
      </GlassCard>
    </StaggerFade>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  row: {
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  title: { lineHeight: 22 },
  narrative: { lineHeight: 18 },
  link: {
    paddingTop: spacing.xs,
    minHeight: 32,
    justifyContent: 'center',
  },
});
