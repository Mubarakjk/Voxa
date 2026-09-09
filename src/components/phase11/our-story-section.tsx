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
        <VoxaText variant="caption" color="primarySoft" style={styles.eyebrow}>
          Our Story
        </VoxaText>
        {entries.slice(0, 4).map((e, index) => (
          <View key={e.id} style={[styles.row, index > 0 && styles.rowSpaced]}>
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
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  eyebrow: { marginBottom: spacing.xs },
  row: {
    gap: spacing.sm,
  },
  rowSpaced: {
    marginTop: spacing.md12,
    paddingTop: spacing.md12,
  },
  title: { lineHeight: 22 },
  narrative: { lineHeight: 19 },
  link: {
    paddingTop: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
});
