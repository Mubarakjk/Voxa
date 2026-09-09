import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../constants/theme';
import { VoxaText } from '../ui/voxa-text';

type Props = {
  text: string;
  tint?: string;
  selectable?: boolean;
};

/** Lightweight markdown-ish rendering for assistant replies. */
export function ChatMarkdownText({ text, tint = colors.text, selectable }: Props) {
  const blocks = text.split(/\n\n+/);

  return (
    <View style={styles.wrap}>
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith('```')) {
          const code = trimmed.replace(/^```\w*\n?/, '').replace(/```$/, '');
          return (
            <View key={i} style={styles.code}>
              <VoxaText variant="caption" selectable={selectable} style={{ color: colors.primarySoft, fontFamily: 'Menlo' }}>{code}</VoxaText>
            </View>
          );
        }

        if (/^[-*]\s/m.test(trimmed)) {
          const items = trimmed.split('\n').filter((l) => /^[-*]\s/.test(l));
          return (
            <View key={i} style={styles.list}>
              {items.map((item, j) => (
                <VoxaText key={j} variant="body" selectable={selectable} style={{ color: tint }}>• {item.replace(/^[-*]\s/, '')}</VoxaText>
              ))}
            </View>
          );
        }

        if (/^\d+\.\s/m.test(trimmed)) {
          const items = trimmed.split('\n').filter((l) => /^\d+\.\s/.test(l));
          return (
            <View key={i} style={styles.list}>
              {items.map((item, j) => (
                <VoxaText key={j} variant="body" selectable={selectable} style={{ color: tint }}>{item}</VoxaText>
              ))}
            </View>
          );
        }

        if (trimmed.startsWith('|') && trimmed.includes('|')) {
          const rows = trimmed.split('\n').filter((r) => r.includes('|'));
          return (
            <View key={i} style={styles.table}>
              {rows.slice(0, 6).map((row, j) => (
                <VoxaText key={j} variant="caption" selectable={selectable} style={{ color: tint }}>{row.replace(/\|/g, ' · ')}</VoxaText>
              ))}
            </View>
          );
        }

        return (
          <VoxaText key={i} variant="body" selectable={selectable} style={{ color: tint }}>{trimmed}</VoxaText>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  code: {
    backgroundColor: colors.surfaceStrong,
    borderRadius: 8,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  list: { gap: spacing.xs, paddingLeft: spacing.xs },
  table: { gap: 2, padding: spacing.sm, backgroundColor: colors.surfaceStrong, borderRadius: 8 },
});
