import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { VoxaText } from '../ui/voxa-text';
import { TypingDots } from '../premium/premium-ui';

type Props = {
  voxaName: string;
  tint: string;
  streamingText?: string | null;
  thinkingLabel?: string;
};

export function TypingIndicator({ voxaName, tint, streamingText, thinkingLabel }: Props) {
  return (
    <View style={styles.row}>
      <View style={[styles.bubble, { borderColor: `${tint}33` }]}>
        {streamingText ? (
          <VoxaText variant="body" color="textSecondary">
            {streamingText}
          </VoxaText>
        ) : (
          <View style={styles.thinkingRow}>
            <TypingDots tint={tint} />
            <VoxaText variant="caption" color="textMuted">
              {thinkingLabel ?? `${voxaName} is thinking`}
            </VoxaText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '82%',
    borderRadius: radius.lg,
    borderBottomLeftRadius: 6,
    padding: spacing.md,
    backgroundColor: colors.chatVoxa,
    borderWidth: 1,
  },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
