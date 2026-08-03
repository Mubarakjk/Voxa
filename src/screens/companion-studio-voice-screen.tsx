import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AccentCard } from '../components/companion-studio/studio-components';
import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { SectionHeader, VoxaText } from '../components/ui/voxa-text';
import { ACCENT_REGIONS } from '../constants/voice-accents';
import { getAllAccentsByRegion } from '../constants/voice-accents-extended';
import {
  SPEAKING_STYLES,
  SPEECH_SPEED_OPTIONS,
  VOICE_AGE_OPTIONS,
  VOICE_GENDER_OPTIONS,
  WARMTH_OPTIONS,
} from '../constants/voice-speaking-styles';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { buildStudioSavePayload } from '../services/companion-studio/companion-studio-service';
import { previewVoxaVoice } from '../services/voice/voice-preview-service';
import { VoiceIdentity } from '../types/voice-identity';
import { getCompanionIdentity } from '../utils/companion-display';

export function CompanionStudioVoiceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, services, refreshProfile } = useVoxa();
  const identity = profile ? getCompanionIdentity(profile) : null;
  const initial = identity?.voiceIdentity;

  const [gender, setGender] = useState<VoiceIdentity['gender']>(initial?.gender ?? 'female');
  const [ageStyle, setAgeStyle] = useState<VoiceIdentity['ageStyle']>(initial?.ageStyle ?? 'young_adult');
  const [speakingStyle, setSpeakingStyle] = useState<VoiceIdentity['speakingStyle']>(
    initial?.speakingStyle ?? 'calm',
  );
  const [speechSpeed, setSpeechSpeed] = useState<VoiceIdentity['speechSpeed']>(initial?.speechSpeed ?? 'normal');
  const [warmth, setWarmth] = useState<VoiceIdentity['warmth']>(initial?.warmth ?? 'warm');
  const [accentId, setAccentId] = useState(initial?.accentId ?? 'international_english');
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewAccent, setPreviewAccent] = useState<string | null>(null);

  const save = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const payload = buildStudioSavePayload({
        profile,
        voiceIdentity: { gender, ageStyle, speakingStyle, speechSpeed, warmth, accentId },
      });
      await services.repositories.userProfile.updateProfile(payload);
      await refreshProfile();
      navigation.goBack();
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const previewWithAccent = async (accent: string) => {
    if (!profile) return;
    setPreviewAccent(accent);
    setIsPreviewing(true);
    try {
      const previewProfile = {
        ...profile,
        companionIdentity: {
          ...getCompanionIdentity(profile),
          voiceIdentity: { gender, ageStyle, speakingStyle, speechSpeed, warmth, accentId: accent },
        },
      };
      await previewVoxaVoice(previewProfile);
    } finally {
      setIsPreviewing(false);
      setPreviewAccent(null);
    }
  };

  const ChipRow = ({
    options,
    selected,
    onSelect,
  }: {
    options: Array<{ id: string; label: string; futureOnly?: boolean }>;
    selected: string;
    onSelect: (id: string) => void;
  }) => (
    <View style={styles.chipRow}>
      {options.map((opt) => (
        <Pressable
          key={opt.id}
          style={[styles.chip, selected === opt.id && styles.chipActive, opt.futureOnly && styles.chipFuture]}
          onPress={() => !opt.futureOnly && onSelect(opt.id)}
          disabled={opt.futureOnly}>
          <VoxaText variant="caption">{opt.label}</VoxaText>
          {opt.futureOnly ? (
            <VoxaText variant="caption" color="textMuted">
              Soon
            </VoxaText>
          ) : null}
        </Pressable>
      ))}
    </View>
  );

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={colors.primarySoft} />
          <VoxaText variant="caption" color="primarySoft">
            Companion Studio
          </VoxaText>
        </Pressable>

        <VoxaText variant="title">Voice Identity</VoxaText>
        <VoxaText variant="body" color="textSecondary">
          Shape how Voxa sounds — gender, style, accent, and warmth.
        </VoxaText>

        <SectionHeader title="Gender" />
        <GlassCard style={styles.card}>
          <ChipRow options={VOICE_GENDER_OPTIONS} selected={gender} onSelect={(id) => setGender(id as VoiceIdentity['gender'])} />
        </GlassCard>

        <SectionHeader title="Age style" />
        <GlassCard style={styles.card}>
          <ChipRow options={VOICE_AGE_OPTIONS} selected={ageStyle} onSelect={(id) => setAgeStyle(id as VoiceIdentity['ageStyle'])} />
        </GlassCard>

        <SectionHeader title="Speaking style" />
        <GlassCard style={styles.card}>
          <ChipRow
            options={SPEAKING_STYLES}
            selected={speakingStyle}
            onSelect={(id) => setSpeakingStyle(id as VoiceIdentity['speakingStyle'])}
          />
        </GlassCard>

        <SectionHeader title="Speech speed" />
        <GlassCard style={styles.card}>
          <ChipRow
            options={SPEECH_SPEED_OPTIONS}
            selected={speechSpeed}
            onSelect={(id) => setSpeechSpeed(id as VoiceIdentity['speechSpeed'])}
          />
        </GlassCard>

        <SectionHeader title="Warmth" />
        <GlassCard style={styles.card}>
          <ChipRow options={WARMTH_OPTIONS} selected={warmth} onSelect={(id) => setWarmth(id as VoiceIdentity['warmth'])} />
        </GlassCard>

        <SectionHeader title="Accents" />
        {ACCENT_REGIONS.map((region) => (
          <View key={region.id}>
            <VoxaText variant="caption" color="textSecondary" style={styles.regionLabel}>
              {region.label}
            </VoxaText>
            {getAllAccentsByRegion(region.id).map((accent) => (
              <AccentCard
                key={accent.id}
                flag={accent.flag}
                label={accent.label}
                description={accent.description}
                selected={accentId === accent.id}
                available={accent.available}
                isPremium={accent.isPremium}
                futureSupport={accent.futureSupport}
                onPress={() => setAccentId(accent.id)}
                onPreview={() => previewWithAccent(accent.id)}
                isPreviewing={isPreviewing && previewAccent === accent.id}
              />
            ))}
          </View>
        ))}

        <PrimaryButton
          label={isSaving ? 'Saving…' : 'Save voice'}
          onPress={save}
          disabled={isSaving}
          loading={isSaving}
        />
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: layout.tabBarHeight + spacing.xxl,
    gap: spacing.md,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  card: { gap: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: 2,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: 'rgba(45, 212, 191, 0.12)' },
  chipFuture: { opacity: 0.5 },
  regionLabel: { marginTop: spacing.md, marginBottom: spacing.sm },
});
