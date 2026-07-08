import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { FadeInView, StudioSectionCard } from '../components/companion-studio/studio-components';
import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { SectionHeader, VoxaText } from '../components/ui/voxa-text';
import { LiveCompanionOrb } from '../components/live-companion/live-companion-orb';
import { getAccentCount } from '../constants/voice-accents-extended';
import { VOXA_AVATARS } from '../constants/companion-identity';
import { colors, layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { buildCompanionStudioSnapshot } from '../services/companion-studio/companion-studio-service';
import { previewVoxaVoice } from '../services/voice/voice-preview-service';
import { getVoxaAvatarTint, getVoxaDisplayName } from '../utils/companion-display';

export function CompanionStudioScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, services } = useVoxa();
  const [isPreviewing, setIsPreviewing] = useState(false);

  const snapshot = profile ? buildCompanionStudioSnapshot(profile) : null;
  const tint = getVoxaAvatarTint(profile);
  const voxaName = getVoxaDisplayName(profile);

  const relationshipSummary =
    profile && services
      ? 'Your companion learns your rhythm, remembers what matters, and grows with every conversation.'
      : 'Start chatting to build your relationship with Voxa.';

  const handlePreview = useCallback(async () => {
    if (!profile) return;
    try {
      setIsPreviewing(true);
      await previewVoxaVoice(profile);
    } catch {
      Alert.alert('Preview unavailable', 'Voice preview could not play. Check microphone and audio settings.');
    } finally {
      setIsPreviewing(false);
    }
  }, [profile]);

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={colors.primarySoft} />
          <VoxaText variant="caption" color="primarySoft">
            Back
          </VoxaText>
        </Pressable>

        <FadeInView>
          <VoxaText variant="title" style={styles.title}>
            Companion Studio
          </VoxaText>
          <VoxaText variant="body" color="textSecondary" style={styles.subtitle}>
            Create the Voxa that feels uniquely yours.
          </VoxaText>
        </FadeInView>

        <FadeInView delay={80}>
          <GlassCard variant="highlight" style={styles.hero}>
            <LiveCompanionOrb size={120} tint={tint} active state="idle" mood="calm" />
            <VoxaText variant="subtitle" style={styles.heroName}>
              {voxaName}
            </VoxaText>
            <VoxaText variant="caption" color="textMuted">
              {snapshot?.speakingStyleLabel} · {snapshot?.accentLabel}
            </VoxaText>
            <PrimaryButton
              label={isPreviewing ? 'Playing…' : 'Preview Voice'}
              variant="ghost"
              onPress={handlePreview}
              disabled={isPreviewing}
            />
          </GlassCard>
        </FadeInView>

        <SectionHeader title="Your companion" />
        <FadeInView delay={120}>
          <StudioSectionCard
            title="Voice"
            subtitle={`${snapshot?.voiceLabel ?? '—'} · ${snapshot?.accentLabel ?? '—'}`}
            actionLabel="Edit"
            onPress={() => navigation.navigate('CompanionStudioVoice')}
          />
          <StudioSectionCard
            title="Personality"
            subtitle={`${snapshot?.personalityLabel ?? 'Warm'} personality`}
            actionLabel="Edit"
            onPress={() => navigation.navigate('CompanionStudioPersonality')}
          />
          <StudioSectionCard
            title="Appearance"
            subtitle={VOXA_AVATARS.find((a) => a.id === snapshot?.avatarAccent)?.label ?? 'Amethyst'}
            actionLabel="Edit"
            onPress={() => navigation.navigate('CompanionStudioAppearance')}
          />
          <StudioSectionCard
            title="Companion style"
            subtitle={`Laugh, energy, wake phrase · ${getAccentCount()}+ accents`}
            actionLabel="Edit"
            onPress={() => navigation.navigate('CompanionStudioExtended')}
          />
        </FadeInView>

        <SectionHeader title="Relationship" />
        <FadeInView delay={160}>
          <GlassCard style={styles.relationship}>
            <VoxaText variant="body" color="textSecondary">
              {relationshipSummary}
            </VoxaText>
          </GlassCard>
        </FadeInView>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: layout.tabBarHeight + spacing.xxl,
    gap: spacing.lg,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  title: { marginTop: spacing.sm },
  subtitle: { marginBottom: spacing.sm },
  hero: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  heroName: { marginTop: spacing.sm },
  relationship: { gap: spacing.sm },
});

// Stop preview when leaving
CompanionStudioScreen.displayName = 'CompanionStudioScreen';
