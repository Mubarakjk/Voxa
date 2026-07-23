import { StyleSheet, View } from 'react-native';

import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { colors, radius, spacing } from '../../constants/theme';
import { ResponseBlock } from '../../types/phase6-premium';
import { blockKindLabel } from '../../services/phase6/rich-response-parser';

type Props = {
  blocks: ResponseBlock[];
};

export function ResponseBlocks({ blocks }: Props) {
  if (blocks.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {blocks.map((block) => (
        <GlassCard key={block.id} style={block.kind === 'caution' ? styles.cautionCard : styles.card}>
          <VoxaText variant="caption" color={block.kind === 'caution' ? 'danger' : 'primarySoft'}>
            {block.title ?? blockKindLabel(block.kind)}
          </VoxaText>
          {block.body ? (
            <VoxaText variant="body" color="textSecondary">{block.body}</VoxaText>
          ) : null}
          {block.items?.map((item) => (
            <VoxaText key={item} variant="body" color="textSecondary">· {item}</VoxaText>
          ))}
          {block.pros?.length ? (
            <VoxaText variant="caption" color="textMuted">For: {block.pros.join('; ')}</VoxaText>
          ) : null}
          {block.cons?.length ? (
            <VoxaText variant="caption" color="textMuted">Against: {block.cons.join('; ')}</VoxaText>
          ) : null}
        </GlassCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.sm },
  card: { gap: spacing.xs, padding: spacing.md },
  cautionCard: { gap: spacing.xs, padding: spacing.md, borderColor: colors.danger, borderWidth: 1 },
});
