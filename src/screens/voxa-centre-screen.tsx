import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CompanionActionRow } from '../components/companion/companion-action-row';
import { FadeIn, HeroOrb, ScreenHeader, StaggerFade } from '../components/premium/premium-ui';
import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { PERSONALITY_STYLES } from '../constants/companion-identity';
import { colors, layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { getDailyCheckInService } from '../services/check-in/daily-check-in-service';
import { buildCompanionInsights } from '../services/companion/companion-insights-service';
import { getCompanionFocusState } from '../services/companion/companion-focus-state';
import { getRelationshipGrowthService } from '../services/relationship/relationship-growth-service';
import { getVoiceOption } from '../constants/voice-options';
import { createDefaultCompanionControls } from '../types/relationship-personality';
import {
  getCompanionIdentity,
  getVoxaAvatarTint,
  getVoxaDisplayName,
} from '../utils/companion-display';
import { hapticLight } from '../utils/haptics';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Voxa'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function VoxaCentreScreen({ navigation }: Props) {
  const stackNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, companion, services } = useVoxa();
  const [statusLine, setStatusLine] = useState('Here when you need me');
  const [insightText, setInsightText] = useState<string | null>(null);
  const [goalLine, setGoalLine] = useState<string | null>(null);
  const [bondLine, setBondLine] = useState<string | null>(null);

  const voxaName = getVoxaDisplayName(profile);
  const voxaTint = getVoxaAvatarTint(profile);
  const identity = profile ? getCompanionIdentity(profile) : null;
  const personalityLabel =
    PERSONALITY_STYLES.find((s) => s.id === identity?.personalityStyle)?.label ?? 'Supportive';
  const voiceLabel = profile
    ? getVoiceOption(profile.preferences.selectedVoiceOptionId).displayName
    : 'Companion voice';
  const showInsights =
    (profile?.preferences.companionControls ?? createDefaultCompanionControls())
      .showRelationshipInsights !== false;

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const [focus, growth, memories, goals, moodHistory, entries, dash] = await Promise.all([
        getCompanionFocusState(profile.id).catch(() => null),
        getRelationshipGrowthService(services.storage, services.repositories)
          .getSnapshot(profile.id)
          .catch(() => null),
        companion.listMemories(profile.id).catch(() => []),
        services.repositories.goals.listGoals(profile.id).catch(() => []),
        getDailyCheckInService(services.storage).listMoodHistory().catch(() => []),
        getDailyCheckInService(services.storage).listEntries().catch(() => []),
        companion.getHomeDashboard(profile.id).catch(() => null),
      ]);

      const activeGoal =
        goals.find((g) => g.status === 'active') ?? dash?.dailyBriefing?.activeGoals?.[0] ?? null;
      setGoalLine(activeGoal?.title ?? focus?.focus ?? null);

      if (growth) {
        setBondLine(`${growth.daysTogether} days together · ${growth.levelLabel}`);
        setStatusLine(
          growth.familiarityLine?.slice(0, 90) ||
            (focus?.focus ? `Focused on ${focus.focus}` : 'Here when you need me'),
        );
      } else if (focus?.focus) {
        setStatusLine(`Focused on ${focus.focus}`);
        setBondLine(null);
      } else {
        setStatusLine('Here when you need me');
        setBondLine(null);
      }

      if (showInsights) {
        const insights = buildCompanionInsights({
          memories,
          goals,
          moodHistory,
          growth,
          checkInsCompleted: entries.filter((e) => !e.skipped).length,
          routineStreakDays: dash?.routineSummary?.streakDays,
        });
        setInsightText(insights[0]?.text ?? null);
      } else {
        setInsightText(null);
      }
    } catch {
      setStatusLine('Here when you need me');
    }
  }, [companion, profile, services.repositories, services.storage, showInsights]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openTalk = () => {
    void hapticLight();
    navigation.navigate('Talk');
  };

  return (
    <ScreenShell padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews>
        <FadeIn>
          <ScreenHeader
            eyebrow="Your companion"
            title={voxaName}
            subtitle={`${personalityLabel} · ${voiceLabel}`}
          />
          <VoxaText variant="caption" color="textMuted" style={styles.status}>
            {statusLine}
          </VoxaText>
        </FadeIn>

        <StaggerFade index={0}>
          <View style={styles.hero}>
            <HeroOrb
              tint={voxaTint}
              size={168}
              active
              orbState="idle"
              orbMood="calm"
              intensity={0.45}
              onPress={openTalk}
              label={voxaName}
            />
          </View>
        </StaggerFade>

        <StaggerFade index={1}>
          <PrimaryButton label={`Talk to ${voxaName}`} onPress={openTalk} icon="chatbubbles" />
        </StaggerFade>

        <StaggerFade index={2}>
          <GlassCard style={styles.actionsCard}>
            <CompanionActionRow
              icon="musical-notes-outline"
              label="Change voice"
              detail={voiceLabel}
              onPress={() => {
                void hapticLight();
                stackNav.navigate('VoicePicker');
              }}
            />
            <CompanionActionRow
              icon="color-palette-outline"
              label="Customise companion"
              detail="Voice, personality & look"
              onPress={() => {
                void hapticLight();
                stackNav.navigate('CompanionStudio');
              }}
            />
            <CompanionActionRow
              icon="heart-outline"
              label="My Companion"
              detail="Bond & relationship"
              onPress={() => {
                void hapticLight();
                stackNav.navigate('MyCompanion');
              }}
            />
            <CompanionActionRow
              icon="bookmark-outline"
              label="Saved moments"
              detail="Memories Voxa keeps"
              onPress={() => {
                void hapticLight();
                stackNav.navigate('Memory');
              }}
              isLast
            />
          </GlassCard>
        </StaggerFade>

        {insightText || bondLine || goalLine ? (
          <StaggerFade index={3}>
            <GlassCard style={styles.card} variant="elevated">
              {bondLine ? (
                <VoxaText variant="caption" color="primarySoft">
                  {bondLine}
                </VoxaText>
              ) : null}
              {goalLine ? (
                <View style={styles.block}>
                  <VoxaText variant="caption" color="textMuted">
                    Helping with
                  </VoxaText>
                  <VoxaText variant="body">{goalLine}</VoxaText>
                </View>
              ) : null}
              {insightText ? (
                <View style={styles.block}>
                  <VoxaText variant="caption" color="textMuted">
                    Noticed
                  </VoxaText>
                  <VoxaText variant="body" color="textSecondary">
                    {insightText}
                  </VoxaText>
                </View>
              ) : null}
            </GlassCard>
          </StaggerFade>
        ) : null}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: layout.tabBarHeight + spacing.xxl,
    gap: spacing.lg,
  },
  status: { marginTop: -spacing.sm, marginBottom: spacing.xs },
  hero: { alignItems: 'center', paddingVertical: spacing.lg },
  actionsCard: { paddingVertical: spacing.xs, paddingHorizontal: spacing.lg },
  card: { gap: spacing.md },
  block: { gap: spacing.xs },
});
