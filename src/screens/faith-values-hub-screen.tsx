import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { FadeIn, ScreenHeader, StaggerFade } from '../components/premium/premium-ui';
import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { isFeatureVisible } from '../config/feature-status';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { getFaithValuesService } from '../services/faith/faith-values-service';
import { reflectionPromptsForMode } from '../services/faith/faith-values-context-service';
import { FaithValuesMode, faithModeLabel } from '../types/faith-values';
import { hapticLight } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'FaithValuesHub'>;

type HubAction = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  screen: keyof RootStackParamList;
  params?: object;
};

export function FaithValuesHubScreen({ navigation }: Props) {
  const { profile, services } = useVoxa();
  const [mode, setMode] = useState<FaithValuesMode>('off');
  const [intention, setIntention] = useState<string | null>(null);
  const [reflectionCount, setReflectionCount] = useState(0);
  const [duaCount, setDuaCount] = useState(0);

  const load = useCallback(async () => {
    if (!profile) return;
    const service = getFaithValuesService(services.storage);
    const prefs = await service.getPreferences(profile.id);
    if (!prefs.enabled || prefs.mode === 'off') {
      navigation.replace('FaithValuesSetup');
      return;
    }
    setMode(prefs.mode);
    const [today, reflections, duas] = await Promise.all([
      service.getTodayIntention(profile.id),
      service.listReflections(profile.id, 100),
      service.listDuas(profile.id),
    ]);
    setIntention(today?.text ?? null);
    setReflectionCount(reflections.length);
    setDuaCount(duas.length);
  }, [navigation, profile, services.storage]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!isFeatureVisible('faithValues') || !profile) {
    return (
      <ScreenShell>
        <VoxaText variant="body" color="textSecondary">
          Faith & Values is not available in this build.
        </VoxaText>
      </ScreenShell>
    );
  }

  const generalActions: HubAction[] = [
    {
      icon: 'sunny-outline',
      title: "Today's intention",
      subtitle: intention?.trim() ? intention : 'Set a gentle focus for today',
      screen: 'FaithValuesIntention',
    },
    {
      icon: 'heart-outline',
      title: 'Gratitude reflection',
      subtitle: 'Private — not saved to AI memory by default',
      screen: 'FaithReflection',
      params: { prompt: reflectionPromptsForMode('general')[0] },
    },
    {
      icon: 'leaf-outline',
      title: 'Private reflection',
      subtitle: `${reflectionCount} saved privately`,
      screen: 'FaithReflection',
    },
  ];

  const islamActions: HubAction[] = [
    {
      icon: 'moon-outline',
      title: "Today's intention",
      subtitle: intention?.trim() ? intention : 'Set your niyyah for today',
      screen: 'FaithValuesIntention',
    },
    {
      icon: 'heart-outline',
      title: 'Gratitude to Allah',
      subtitle: 'Private reflection',
      screen: 'FaithReflection',
      params: { prompt: reflectionPromptsForMode('islam')[0] },
    },
    {
      icon: 'checkbox-outline',
      title: 'Prayer routine',
      subtitle: 'Manual tracking — no prayer times',
      screen: 'PrayerRoutine',
    },
    {
      icon: 'bookmark-outline',
      title: 'Saved duas',
      subtitle: duaCount ? `${duaCount} saved privately` : 'Save your own duas',
      screen: 'SavedDuas',
    },
    {
      icon: 'chatbubble-ellipses-outline',
      title: 'Ask a faith question',
      subtitle: 'Thoughtful support — not religious rulings',
      screen: 'MainTabs',
      params: {
        screen: 'Talk',
        params: {
          starterPrompt:
            'I have a faith-related question. Please help me think it through carefully, without inventing Quran verses or hadith, and remind me to consult a qualified scholar for personal rulings.',
        },
      },
    },
  ];

  const personalActions: HubAction[] = [
    ...generalActions.slice(0, 2),
    {
      icon: 'sparkles-outline',
      title: 'Spiritual reflection',
      subtitle: 'Your private space',
      screen: 'FaithReflection',
    },
  ];

  const actions =
    mode === 'islam' ? islamActions : mode === 'personal' ? personalActions : generalActions;

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeIn>
          <ScreenHeader
            eyebrow="Private space"
            title="Faith & Values"
            subtitle={faithModeLabel(mode)}
            right={
              <Pressable
                onPress={() => navigation.navigate('FaithValuesSetup')}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Faith and values settings">
                <Ionicons name="settings-outline" size={22} color={colors.textMuted} />
              </Pressable>
            }
          />
        </FadeIn>

        <GlassCard style={styles.privacyCard}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.primarySoft} />
          <VoxaText variant="caption" color="textSecondary" style={styles.privacyCopy}>
            Your faith and values entries are private. Voxa only uses them in conversations when you
            choose to allow it.
          </VoxaText>
        </GlassCard>

        {actions.map((action, index) => (
          <StaggerFade key={action.title} index={index}>
            <Pressable
              style={styles.actionRow}
              onPress={() => {
                void hapticLight();
                if (action.screen === 'MainTabs') {
                  navigation.navigate('MainTabs', {
                    screen: 'Talk',
                    params: {
                      starterPrompt:
                        'I have a faith-related question. Please help me think it through carefully, without inventing Quran verses or hadith, and remind me to consult a qualified scholar for personal rulings.',
                    },
                  });
                  return;
                }
                const route = action.screen as Extract<
                  keyof RootStackParamList,
                  | 'FaithReflection'
                  | 'FaithValuesIntention'
                  | 'PrayerRoutine'
                  | 'SavedDuas'
                >;
                navigation.navigate(route, action.params as never);
              }}
              accessibilityRole="button"
              accessibilityLabel={action.title}>
              <View style={styles.actionIcon}>
                <Ionicons name={action.icon} size={20} color={colors.primarySoft} />
              </View>
              <View style={styles.actionCopy}>
                <VoxaText variant="subtitle">{action.title}</VoxaText>
                <VoxaText variant="caption" color="textMuted" numberOfLines={2}>
                  {action.subtitle}
                </VoxaText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          </StaggerFade>
        ))}

        <StaggerFade index={actions.length}>
          <VoxaText variant="caption" color="textMuted" style={styles.footerNote}>
            Your faith journey is personal. This is here only to help you reflect and stay organised.
          </VoxaText>
        </StaggerFade>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: layout.tabBarHeight + spacing.xxl,
    gap: spacing.md,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  privacyCopy: { flex: 1, lineHeight: 20 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: layout.minTapTarget + 8,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
  },
  actionCopy: { flex: 1, gap: 2 },
  footerNote: { textAlign: 'center', lineHeight: 20, marginTop: spacing.md },
});
