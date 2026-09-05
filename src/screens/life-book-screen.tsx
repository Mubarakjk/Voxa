import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EmptyState, FadeIn, ScreenHeader, StaggerFade } from '../components/premium/premium-ui';
import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { LoadingState } from '../components/ui/screen-state';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, layout, radius, semantic, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { LifeBookChapter } from '../types/phase5-life-os';
import { getPhase5LifeOSService } from '../services/life-os/phase5-life-os-service';
import {
  buildLifeBookVolume,
  LifeBookVolumeChapter,
} from '../services/life-os/life-book-volume-service';
import { getRelationshipGrowthService } from '../services/relationship/relationship-growth-service';
import { areAllFeaturesUnlocked } from '../config/launch-mode';
import { navigateToPaywall } from '../utils/paywall-navigation';
import { hapticLight, hapticSelection } from '../utils/haptics';

export function LifeBookScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, companion, services } = useVoxa();
  const service = useMemo(
    () => getPhase5LifeOSService(services.storage, services.repositories),
    [services.storage, services.repositories],
  );
  const [monthly, setMonthly] = useState<LifeBookChapter[]>([]);
  const [volume, setVolume] = useState<LifeBookVolumeChapter[]>([]);
  const [selectedVolume, setSelectedVolume] = useState<LifeBookVolumeChapter | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<LifeBookChapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);

  const openProPaywall = useCallback(() => {
    navigateToPaywall(navigation, 'life-book');
  }, [navigation]);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const now = new Date();
      const [monthChapter, memories, goals, growth, pro] = await Promise.all([
        service.getOrGenerateChapter(profile.id, now.getFullYear(), now.getMonth() + 1),
        companion.listMemories(profile.id),
        services.repositories.goals.listGoals(profile.id),
        getRelationshipGrowthService(services.storage, services.repositories)
          .getSnapshot(profile.id)
          .catch(() => null),
        services.entitlementAccess.isPro(profile.id),
      ]);
      setIsPro(pro || areAllFeaturesUnlocked());
      const unlocked = pro || areAllFeaturesUnlocked();
      const chapters = await service.listLifeBookChapters(profile.id);
      setMonthly(unlocked ? chapters : chapters.slice(0, 1));
      const built = buildLifeBookVolume({
        profile,
        memories,
        goals,
        growthLine: growth?.familiarityLine,
        monthlySummary: monthChapter.summary ?? chapters[0]?.summary,
      });
      setVolume(unlocked ? built : built.slice(0, 1));
    } finally {
      setLoading(false);
    }
  }, [companion, profile, service, services.entitlementAccess, services.repositories, services.storage]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const exportChapter = (title: string, paragraphs: string[]) => {
    void Share.share({
      message: `${title}\n\n${paragraphs.join('\n\n') || 'No content yet.'}`,
    });
  };

  if (loading) {
    return (
      <ScreenShell>
        <LoadingState label="Opening Life Book…" />
      </ScreenShell>
    );
  }

  const reading = selectedVolume ?? null;
  const monthReading = selectedMonth;

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeIn>
          <ScreenHeader showBack
            eyebrow="Your story"
            title="Life Book"
            subtitle="Chapters organised from real moments — never invented."
          />
        </FadeIn>

        {!isPro && !areAllFeaturesUnlocked() ? (
          <GlassCard style={styles.previewCard}>
            <VoxaText variant="subtitle">Free preview</VoxaText>
            <VoxaText variant="body" color="textSecondary">
              Free includes a limited Life Book preview. Upgrade to Voxa Pro for the full volume.
            </VoxaText>
            <PrimaryButton label="Upgrade to Voxa Pro" onPress={() => void openProPaywall()} />
          </GlassCard>
        ) : null}

        {reading ? (
          <StaggerFade index={0}>
            <GlassCard style={styles.reader} variant="elevated">
              <Pressable
                onPress={() => setSelectedVolume(null)}
                style={styles.readerBack}
                accessibilityRole="button"
                accessibilityLabel="Back to chapters">
                <Ionicons name="chevron-back" size={18} color={colors.primarySoft} />
                <VoxaText variant="caption" color="primarySoft">
                  Chapters
                </VoxaText>
              </Pressable>
              <VoxaText variant="label" color="textMuted">
                {reading.subtitle}
              </VoxaText>
              <VoxaText variant="title">{reading.title}</VoxaText>
              {reading.paragraphs.length === 0 ? (
                <VoxaText variant="body" color="textSecondary">
                  This chapter will fill as you save real moments.
                </VoxaText>
              ) : (
                reading.paragraphs.map((p) => (
                  <VoxaText key={p.slice(0, 40)} variant="body" color="textSecondary" style={styles.para}>
                    {p}
                  </VoxaText>
                ))
              )}
              <PrimaryButton
                label="Export chapter"
                variant="ghost"
                onPress={() => exportChapter(reading.title, reading.paragraphs)}
              />
            </GlassCard>
          </StaggerFade>
        ) : monthReading ? (
          <StaggerFade index={0}>
            <GlassCard style={styles.reader} variant="elevated">
              <Pressable
                onPress={() => setSelectedMonth(null)}
                style={styles.readerBack}
                accessibilityRole="button">
                <Ionicons name="chevron-back" size={18} color={colors.primarySoft} />
                <VoxaText variant="caption" color="primarySoft">
                  Monthly
                </VoxaText>
              </Pressable>
              <VoxaText variant="title">{monthReading.monthLabel}</VoxaText>
              {monthReading.summary ? (
                <VoxaText variant="body" color="textSecondary" style={styles.para}>
                  {monthReading.summary}
                </VoxaText>
              ) : null}
              {monthReading.biggestWin ? (
                <VoxaText variant="body" color="textSecondary" style={styles.para}>
                  Biggest win: {monthReading.biggestWin}
                </VoxaText>
              ) : null}
              {monthReading.favouriteMemory ? (
                <VoxaText variant="body" color="textSecondary" style={styles.para}>
                  Favourite memory: {monthReading.favouriteMemory}
                </VoxaText>
              ) : null}
              {monthReading.voxaNoticed ? (
                <VoxaText variant="caption" color="primarySoft" style={styles.para}>
                  Voxa noticed: {monthReading.voxaNoticed}
                </VoxaText>
              ) : null}
            </GlassCard>
          </StaggerFade>
        ) : (
          <>
            <VoxaText variant="subtitle">Reading chapters</VoxaText>
            {volume.map((chapter, index) => (
              <StaggerFade key={chapter.id} index={index}>
                <Pressable
                  onPress={() => {
                    void hapticSelection();
                    setSelectedVolume(chapter);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${chapter.title}`}>
                  <GlassCard
                    style={{
                      ...styles.chapterCard,
                      ...(chapter.hasContent ? { borderColor: semantic.journey + '33' } : styles.chapterEmpty),
                    }}>
                    <View style={styles.chapterTop}>
                      <VoxaText variant="subtitle">{chapter.title}</VoxaText>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </View>
                    <VoxaText variant="caption" color="textMuted">
                      {chapter.hasContent
                        ? chapter.subtitle
                        : 'Waiting for real moments to fill this page'}
                    </VoxaText>
                  </GlassCard>
                </Pressable>
              </StaggerFade>
            ))}

            <VoxaText variant="subtitle" style={styles.monthTitle}>
              Monthly covers
            </VoxaText>
            {monthly.length === 0 ? (
              <EmptyState
                icon="book-outline"
                title="No monthly covers yet"
                message="Keep using Voxa — a cover generates when the month has real activity."
              />
            ) : (
              monthly.map((ch, index) => (
                <StaggerFade key={ch.id} index={index}>
                  <Pressable
                    onPress={() => {
                      void hapticLight();
                      setSelectedMonth(ch);
                    }}
                    accessibilityRole="button">
                    <GlassCard>
                      <VoxaText variant="subtitle">{ch.monthLabel}</VoxaText>
                      <VoxaText variant="caption" color="textMuted">
                        {ch.summary ?? 'Tap to read'}
                      </VoxaText>
                      {ch.biggestWin ? (
                        <VoxaText variant="caption" color="primarySoft">
                          Win: {ch.biggestWin}
                        </VoxaText>
                      ) : null}
                    </GlassCard>
                  </Pressable>
                </StaggerFade>
              ))
            )}
          </>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  previewCard: { gap: spacing.sm, padding: spacing.lg },
  chapterCard: { gap: spacing.xs },
  chapterEmpty: { opacity: 0.72 },
  chapterTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reader: { gap: spacing.md },
  readerBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  para: { lineHeight: 24 },
  monthTitle: { marginTop: spacing.md },
});
