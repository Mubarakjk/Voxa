import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { EmptyState, PremiumButton, ScreenHeader } from '../components/premium/premium-ui';
import { LoadingState } from '../components/ui/screen-state';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import {
  CHECK_IN_TEMPLATES,
  getScheduledCheckInService,
} from '../services/phase12/scheduled-check-in-service';
import { ScheduledCheckIn } from '../types/phase12-experiences';

type Props = NativeStackScreenProps<RootStackParamList, 'ScheduledCheckIns'>;

export function ScheduledCheckInsScreen({ navigation }: Props) {
  const { profile, services } = useVoxa();
  const svc = getScheduledCheckInService(services.storage);
  const [items, setItems] = useState<ScheduledCheckIn[]>([]);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const [list, perm] = await Promise.all([svc.list(profile.id), svc.getPermissionState()]);
      setItems(list);
      setPermission(perm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load check-ins.');
    } finally {
      setLoading(false);
    }
  }, [profile, svc]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const addQuick = async (template: typeof CHECK_IN_TEMPLATES[0]) => {
    if (!profile) return;
    const when = new Date();
    when.setHours(template.id === 'evening' ? 20 : 8, 0, 0, 0);
    if (when.getTime() < Date.now()) when.setDate(when.getDate() + 1);
    try {
      await svc.create(profile.id, {
        title: template.defaultTitle,
        template: template.id,
        style: 'friendly',
        scheduledAt: when.toISOString(),
        recurrence: template.id === 'morning' || template.id === 'evening' ? 'daily' : 'once',
        enabled: true,
        quietHoursRespect: true,
      });
      Alert.alert('Scheduled', 'Scheduled Voxa check-in created.');
      void load();
    } catch (err) {
      Alert.alert('Could not schedule', err instanceof Error ? err.message : 'Try again.');
    }
  };

  const toggle = async (item: ScheduledCheckIn) => {
    if (!profile) return;
    await svc.toggle(profile.id, item.id, !item.enabled);
    void load();
  };

  const remove = (item: ScheduledCheckIn) => {
    if (!profile) return;
    Alert.alert('Delete check-in?', item.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void svc.delete(profile.id, item.id).then(() => load());
        },
      },
    ]);
  };

  const openTalk = (item: ScheduledCheckIn) => {
    const msg = svc.buildOpeningMessage(item);
    navigation.navigate('MainTabs', { screen: 'Talk', params: { starterPrompt: msg } });
  };

  if (loading) {
    return (
      <ScreenShell>
        <LoadingState label="Loading check-ins..." />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          showBack
          eyebrow="Not a phone call"
          title="Scheduled check-ins"
          subtitle="Local notifications that open Talk with context — labelled clearly as Scheduled Voxa check-in."
        />

        {permission === 'denied' ? (
          <GlassCard style={styles.banner}>
            <VoxaText variant="body" color="textSecondary" style={styles.bannerCopy}>
              Notifications are off. Check-ins will still save — enable notifications in system settings for reminders.
            </VoxaText>
          </GlassCard>
        ) : null}

        <GlassCard style={styles.proactiveCard}>
          <VoxaText variant="body" color="textSecondary" style={styles.bannerCopy}>
            Want Voxa to notice when you have been quiet? Configure inactivity-based proactive check-ins.
          </VoxaText>
          <PremiumButton
            label="Proactive check-ins"
            onPress={() => navigation.navigate('ProactiveCheckIns')}
            variant="ghost"
          />
        </GlassCard>

        {error ? (
          <GlassCard style={styles.banner}>
            <VoxaText variant="body" color="textSecondary" style={styles.bannerCopy}>
              {error}
            </VoxaText>
            <PremiumButton label="Retry" onPress={() => void load()} variant="ghost" />
          </GlassCard>
        ) : null}

        <VoxaText variant="caption" color="primarySoft" style={styles.quickLabel}>
          Quick schedule
        </VoxaText>
        <View style={styles.templates}>
          {CHECK_IN_TEMPLATES.slice(0, 4).map((t) => (
            <Pressable key={t.id} style={styles.templateChip} onPress={() => void addQuick(t)}>
              <VoxaText variant="caption" color="primarySoft" style={styles.templateLabel} numberOfLines={2}>
                {t.label}
              </VoxaText>
            </Pressable>
          ))}
        </View>

        {items.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <EmptyState
              icon="notifications-outline"
              title="No check-ins yet"
              message="Schedule when Voxa should reach out with a personalised notification."
            />
          </GlassCard>
        ) : (
          items.map((item) => (
            <GlassCard key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <VoxaText variant="subtitle" style={styles.cardTitle}>
                  {item.title}
                </VoxaText>
                <Switch value={item.enabled} onValueChange={() => void toggle(item)} />
              </View>
              <VoxaText variant="caption" color="textMuted" style={styles.cardMeta}>
                {new Date(item.scheduledAt).toLocaleString()} · {item.recurrence} · {item.style}
              </VoxaText>
              <View style={styles.actions}>
                <PremiumButton label="Open in Talk" onPress={() => openTalk(item)} />
                <Pressable onPress={() => remove(item)} hitSlop={8} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            </GlassCard>
          ))
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: layout.screenPadding,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  banner: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  proactiveCard: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  bannerCopy: { lineHeight: 22 },
  quickLabel: { marginTop: spacing.xs },
  templates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  templateChip: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 0,
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateLabel: { textAlign: 'center', lineHeight: 18 },
  emptyCard: {
    padding: 0,
  },
  card: {
    gap: spacing.md12,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  cardTitle: { flex: 1, minWidth: 0, lineHeight: 22 },
  cardMeta: { lineHeight: 18 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
