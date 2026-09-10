import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassCard } from '../ui/glass-card';
import { VoxaText } from '../ui/voxa-text';
import { StaggerFade } from '../premium/premium-ui';
import { colors, spacing } from '../../constants/theme';
import { DailyBriefing } from '../../types/daily-briefing';
import { Reminder } from '../../types';
import { Phase11DashboardData } from '../../types/phase11-living-companion';
import { Phase12DashboardData } from '../../types/phase12-experiences';
import { TodayRoutineSummary } from '../../types/routine';
import { WeatherBundle } from '../../types/weather';
import { areSimilarInsights } from '../../utils/home-hero-copy';
import { formatReminderDateTime } from '../../utils/reminders';

type Props = {
  dailyBriefing: DailyBriefing;
  phase11: Phase11DashboardData;
  phase12: Phase12DashboardData;
  upcomingReminder: Reminder | null;
  routineSummary: TodayRoutineSummary;
  reflectionPending: boolean;
  weatherBundle?: WeatherBundle | null;
  /** Kept for API compatibility — Home no longer surfaces friendship progress. */
  showRelationship?: boolean;
  onFollowUp: () => void;
  onReflection: () => void;
  onNews: () => void;
  onRelationship: () => void;
  onRoutine: () => void;
  onReminder?: () => void;
};

type BriefItem = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
};

/** Cap Home "Today" at three genuinely useful contextual rows. */
const MAX_HOME_BRIEF_ITEMS = 3;

export function HomeMorningBriefCard({
  dailyBriefing,
  phase11,
  phase12,
  upcomingReminder,
  reflectionPending,
  weatherBundle,
  onFollowUp,
  onReflection,
  onNews,
  onReminder,
}: Props) {
  const { followUp } = phase11;
  const digest = phase12.dailyNews;
  const focus = phase11.todayFocus?.trim() || '';
  const suggestion = dailyBriefing.suggestedAction?.trim() || '';
  const personal = dailyBriefing.personalMessage?.trim() || '';
  const digestLine = (digest?.companionTake || digest?.headline || '').trim();

  const showFollowUp = Boolean(followUp && followUp.prompt !== phase11.emotionalMessage);

  const headerMeta = weatherBundle?.current
    ? `${Math.round(weatherBundle.current.temperatureC)}° · ${weatherBundle.current.conditionLabel}`
    : null;

  const items = selectHomeBriefItems({
    focus,
    personal,
    suggestion,
    digestLine,
    showFollowUp,
    followUpPrompt: followUp?.prompt,
    followUpLabel: followUp?.dueLabel,
    upcomingReminder,
    reflectionPending,
    onFollowUp,
    onReflection,
    onNews,
    onReminder,
  });

  return (
    <StaggerFade index={1}>
      <GlassCard style={styles.card} variant="quiet">
        <View style={styles.header}>
          <VoxaText variant="label" color="textMuted" style={styles.headerLabel}>
            Today
          </VoxaText>
          {headerMeta ? (
            <View style={styles.headerMeta}>
              <VoxaText variant="caption" color="textMuted" style={styles.headerMetaText}>
                {headerMeta}
              </VoxaText>
            </View>
          ) : null}
        </View>

        {items.map((item) => (
          <BriefRow
            key={item.key}
            icon={item.icon}
            label={item.label}
            value={item.value}
            onPress={item.onPress}
          />
        ))}
      </GlassCard>
    </StaggerFade>
  );
}

function selectHomeBriefItems(input: {
  focus: string;
  personal: string;
  suggestion: string;
  digestLine: string;
  showFollowUp: boolean;
  followUpPrompt?: string;
  followUpLabel?: string;
  upcomingReminder: Reminder | null;
  reflectionPending: boolean;
  onFollowUp: () => void;
  onReflection: () => void;
  onNews: () => void;
  onReminder?: () => void;
}): BriefItem[] {
  const items: BriefItem[] = [];
  const seen: string[] = [];

  const push = (item: BriefItem) => {
    if (items.length >= MAX_HOME_BRIEF_ITEMS) return;
    if (!item.value.trim()) return;
    if (seen.some((existing) => areSimilarInsights(existing, item.value))) return;
    if (input.focus && areSimilarInsights(input.focus, item.value) && item.key !== 'focus') return;
    if (input.personal && areSimilarInsights(input.personal, item.value) && item.key !== 'focus') {
      // Skip suggestion/digest that merely restate the personal coaching line.
      if (item.key === 'suggestion' || item.key === 'digest') return;
    }
    seen.push(item.value);
    items.push(item);
  };

  if (input.focus) {
    push({
      key: 'focus',
      icon: 'compass-outline',
      label: 'Focus',
      value: input.focus,
    });
  }

  if (input.showFollowUp && input.followUpPrompt) {
    push({
      key: 'follow-up',
      icon: 'chatbubble-ellipses-outline',
      label: input.followUpLabel || 'Follow-up',
      value: input.followUpPrompt,
      onPress: input.onFollowUp,
    });
  } else if (input.upcomingReminder) {
    push({
      key: 'reminder',
      icon: 'alarm-outline',
      label: 'Coming up',
      value: `${input.upcomingReminder.title} · ${formatReminderDateTime(input.upcomingReminder.scheduledAt)}`,
      onPress: input.onReminder,
    });
  } else if (input.digestLine) {
    push({
      key: 'digest',
      icon: 'sparkles-outline',
      label: 'Worth noting',
      value: input.digestLine,
      onPress: input.onNews,
    });
  }

  if (input.reflectionPending) {
    push({
      key: 'reflection',
      icon: 'moon-outline',
      label: 'Evening reflection',
      value: 'What made you smile today?',
      onPress: input.onReflection,
    });
  } else if (input.suggestion) {
    push({
      key: 'suggestion',
      icon: 'chatbubbles-outline',
      label: 'Talk about',
      value: input.suggestion,
      onPress: input.onFollowUp,
    });
  } else if (!input.focus && input.personal) {
    push({
      key: 'personal',
      icon: 'sparkles-outline',
      label: 'For you',
      value: input.personal,
    });
  }

  return items;
}

function BriefRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={colors.primarySoft} style={styles.rowIcon} />
      <View style={styles.rowBody}>
        <VoxaText variant="caption" color="textMuted">
          {label}
        </VoxaText>
        <VoxaText variant="body" color="textSecondary" style={styles.rowValue}>
          {value}
        </VoxaText>
      </View>
      {onPress ? (
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={styles.rowChevron} />
      ) : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerLabel: { flexShrink: 0 },
  headerMeta: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  headerMetaText: {
    textAlign: 'right',
    flexShrink: 1,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  rowIcon: { flexShrink: 0, marginTop: 2 },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
  rowValue: { flexShrink: 1 },
  rowChevron: { flexShrink: 0, marginTop: 4 },
  pressed: { opacity: 0.85 },
});
