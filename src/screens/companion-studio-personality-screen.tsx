import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PersonalitySlider } from '../components/companion-studio/studio-components';
import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { SectionHeader, VoxaText } from '../components/ui/voxa-text';
import { PERSONALITY_STYLES, REPLY_LENGTH_OPTIONS } from '../constants/companion-identity';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { buildStudioSavePayload } from '../services/companion-studio/companion-studio-service';
import {
  CompanionControlPreferences,
  PERSONALITY_SLIDER_KEYS,
  createDefaultCompanionControls,
} from '../types/relationship-personality';
import { getCompanionIdentity } from '../utils/companion-display';
import { PersonalityStyleId } from '../constants/companion-identity';
import { ReplyLengthPreference } from '../constants/companion-identity';

export function CompanionStudioPersonalityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, services, refreshProfile } = useVoxa();
  const identity = profile ? getCompanionIdentity(profile) : null;
  const initial = profile?.preferences.companionControls ?? createDefaultCompanionControls();

  const [personalityStyle, setPersonalityStyle] = useState<PersonalityStyleId>(
    identity?.personalityStyle ?? 'warm',
  );
  const [replyLength, setReplyLength] = useState<ReplyLengthPreference>(identity?.replyLength ?? 'balanced');
  const [controls, setControls] = useState<CompanionControlPreferences>(initial);
  const [isSaving, setIsSaving] = useState(false);

  const setSlider = (key: keyof CompanionControlPreferences, value: number) => {
    setControls((c) => ({ ...c, [key]: value }));
  };

  const save = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const payload = buildStudioSavePayload({
        profile,
        personalityStyle,
        replyLength,
        companionControls: controls,
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

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={colors.primarySoft} />
          <VoxaText variant="caption" color="primarySoft">
            Companion Studio
          </VoxaText>
        </Pressable>

        <VoxaText variant="title">Personality</VoxaText>
        <VoxaText variant="body" color="textSecondary">
          Fine-tune how Voxa thinks, feels, and responds.
        </VoxaText>

        <SectionHeader title="Style" />
        <GlassCard style={styles.card}>
          {PERSONALITY_STYLES.map((style) => (
            <Pressable
              key={style.id}
              style={[styles.option, personalityStyle === style.id && styles.optionActive]}
              onPress={() => setPersonalityStyle(style.id)}>
              <VoxaText variant="body">{style.label}</VoxaText>
              <VoxaText variant="caption" color="textMuted">
                {style.description}
              </VoxaText>
            </Pressable>
          ))}
        </GlassCard>

        <SectionHeader title="Reply length" />
        <GlassCard style={styles.card}>
          <View style={styles.chipRow}>
            {REPLY_LENGTH_OPTIONS.map((opt) => (
              <Pressable
                key={opt.id}
                style={[styles.chip, replyLength === opt.id && styles.chipActive]}
                onPress={() => setReplyLength(opt.id)}>
                <VoxaText variant="caption">{opt.label}</VoxaText>
              </Pressable>
            ))}
          </View>
        </GlassCard>

        <SectionHeader title="Personality sliders" />
        <GlassCard style={styles.card}>
          {PERSONALITY_SLIDER_KEYS.map((item) => (
            <PersonalitySlider
              key={item.key}
              label={item.label}
              description={item.description}
              value={controls[item.key] as number}
              onValueChange={(v) => setSlider(item.key, v)}
            />
          ))}
        </GlassCard>

        <PrimaryButton label={isSaving ? 'Saving…' : 'Save personality'} onPress={save} disabled={isSaving} loading={isSaving} />
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
  card: { gap: spacing.sm },
  option: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: 4,
    marginBottom: spacing.sm,
  },
  optionActive: { borderColor: colors.primary, backgroundColor: 'rgba(139, 124, 246, 0.1)' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: 'rgba(139, 124, 246, 0.12)' },
});
