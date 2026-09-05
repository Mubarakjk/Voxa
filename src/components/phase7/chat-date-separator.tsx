import { StyleSheet, View } from 'react-native';

import { VoxaText } from '../ui/voxa-text';
import { spacing } from '../../constants/theme';

export function formatChatDateLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function ChatDateSeparator({ label }: { label: string }) {
  return (
    <View style={styles.wrap}>
      <VoxaText variant="caption" color="textMuted" style={styles.label}>
        {label}
      </VoxaText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.4,
    opacity: 0.75,
  },
});
