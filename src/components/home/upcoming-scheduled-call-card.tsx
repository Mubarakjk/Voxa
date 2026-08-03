import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { ScheduledCompanionCall } from '../../types/scheduled-companion-call';
import { VoxaText } from '../ui/voxa-text';

type Props = {
  call: ScheduledCompanionCall | null;
  companionName: string;
  onPressSchedule: () => void;
  onPressEdit?: () => void;
  onPressCallNow?: () => void;
  onPressCancel?: () => void;
};

function formatCountdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Soon';
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `in ${hours} hr`;
  return new Date(iso).toLocaleString([], {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function UpcomingScheduledCallCard({
  call,
  companionName,
  onPressSchedule,
  onPressEdit,
  onPressCallNow,
  onPressCancel,
}: Props) {
  if (!call) {
    return (
      <Pressable
        style={styles.card}
        onPress={onPressSchedule}
        accessibilityRole="button"
        accessibilityLabel={`Schedule a call from ${companionName}`}>
        <View style={styles.iconWrap} accessible={false}>
          <Ionicons name="call-outline" size={20} color={colors.primarySoft} />
        </View>
        <View style={styles.copy}>
          <VoxaText variant="subtitle">Schedule a call from {companionName}</VoxaText>
          <VoxaText variant="caption" color="textSecondary">
            Choose a time for a companion check-in alert
          </VoxaText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>
    );
  }

  return (
    <View
      style={styles.card}
      accessibilityRole="summary"
      accessibilityLabel={`Upcoming call: ${call.title}, ${formatCountdown(call.nextScheduledAt)}`}>
      <View style={styles.iconWrap} accessible={false}>
        <Ionicons name="call" size={20} color={colors.primarySoft} />
      </View>
      <View style={styles.copy}>
        <VoxaText variant="subtitle">Upcoming call</VoxaText>
        <VoxaText variant="caption" color="textSecondary">
          {call.title} · {formatCountdown(call.nextScheduledAt)}
        </VoxaText>
        <VoxaText variant="caption" color="textMuted">
          {new Date(call.nextScheduledAt).toLocaleString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </VoxaText>
        <View style={styles.actions}>
          {onPressEdit ? (
            <Pressable onPress={onPressEdit} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit scheduled call">
              <VoxaText variant="caption" color="primarySoft">
                Edit
              </VoxaText>
            </Pressable>
          ) : null}
          {onPressCallNow ? (
            <Pressable onPress={onPressCallNow} hitSlop={8} accessibilityRole="button" accessibilityLabel="Call now">
              <VoxaText variant="caption" color="primarySoft">
                Call now
              </VoxaText>
            </Pressable>
          ) : null}
          {onPressCancel ? (
            <Pressable onPress={onPressCancel} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cancel scheduled call">
              <VoxaText variant="caption" color="danger">
                Cancel
              </VoxaText>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
  },
  copy: { flex: 1, gap: 4 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: 4 },
});
