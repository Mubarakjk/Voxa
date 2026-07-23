import { StyleSheet, View } from 'react-native';

import { VoxaText } from '../ui/voxa-text';
import { colors, spacing } from '../../constants/theme';
import { SharedTimelineEntry } from '../../types/phase8-retention';
import { TimelineItem } from '../premium/premium-ui';

type Props = {
  entries: SharedTimelineEntry[];
};

export function SharedTimelineSection({ entries }: Props) {
  if (entries.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <VoxaText variant="subtitle">Our story</VoxaText>
      <VoxaText variant="caption" color="textMuted">Memories we built together</VoxaText>
      {entries.slice(0, 6).map((entry, index) => (
        <TimelineItem
          key={entry.id}
          title={entry.title}
          subtitle={entry.narrative}
          date={new Date(entry.occurredAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          isLast={index === Math.min(entries.length, 6) - 1}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md, paddingVertical: spacing.sm },
});
