import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { FadeInView } from '../components/companion-studio/studio-components';
import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import {
  CONVERSATION_FREQUENCIES,
  CompanionStudioExtendedPrefs,
  ENERGY_LEVELS,
  GREETING_STYLES,
  LAUGH_STYLES,
  RELATIONSHIP_STYLES,
  createDefaultStudioExtendedPrefs,
} from '../constants/companion-studio-extended';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { colors, layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';

export function CompanionStudioExtendedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { services } = useVoxa();
  const [prefs, setPrefs] = useState<CompanionStudioExtendedPrefs>(createDefaultStudioExtendedPrefs());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      const stored = await services.storage.getItem<CompanionStudioExtendedPrefs>(
        STORAGE_KEYS.companionStudioPrefs,
      );
      if (stored) setPrefs(stored);
    })();
  }, [services.storage]);

  const save = useCallback(async () => {
    await services.storage.setItem(STORAGE_KEYS.companionStudioPrefs, prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [prefs, services.storage]);

  const chip = <T extends string>(
    options: Array<{ id: T; label: string }>,
    field: keyof CompanionStudioExtendedPrefs,
    value: T,
  ) => (
    <View style={styles.chipRow}>
      {options.map((opt) => (
        <Pressable
          key={opt.id}
          style={[styles.chip, value === opt.id && styles.chipActive]}
          onPress={() => setPrefs((p) => ({ ...p, [field]: opt.id }))}>
          <VoxaText variant="caption" color={value === opt.id ? 'primarySoft' : 'textMuted'}>
            {opt.label}
          </VoxaText>
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
            Back
          </VoxaText>
        </Pressable>

        <VoxaText variant="title">Companion style</VoxaText>
        <VoxaText variant="body" color="textSecondary">
          Fine-tune how Voxa shows up in your life.
        </VoxaText>

        <FadeInView delay={60}>
          <GlassCard style={styles.section}>
            <VoxaText variant="subtitle">Laugh style</VoxaText>
            {chip(LAUGH_STYLES.map((l) => ({ id: l.id, label: l.label })), 'laughStyle', prefs.laughStyle)}
          </GlassCard>
        </FadeInView>

        <FadeInView delay={80}>
          <GlassCard style={styles.section}>
            <VoxaText variant="subtitle">Greeting style</VoxaText>
            {chip(GREETING_STYLES.map((g) => ({ id: g.id, label: g.label })), 'greetingStyle', prefs.greetingStyle)}
          </GlassCard>
        </FadeInView>

        <FadeInView delay={100}>
          <GlassCard style={styles.section}>
            <VoxaText variant="subtitle">Energy</VoxaText>
            {chip(ENERGY_LEVELS, 'energyLevel', prefs.energyLevel)}
          </GlassCard>
        </FadeInView>

        <FadeInView delay={120}>
          <GlassCard style={styles.section}>
            <VoxaText variant="subtitle">Relationship style</VoxaText>
            {chip(RELATIONSHIP_STYLES.map((r) => ({ id: r.id, label: r.label })), 'relationshipStyle', prefs.relationshipStyle)}
          </GlassCard>
        </FadeInView>

        <FadeInView delay={140}>
          <GlassCard style={styles.section}>
            <VoxaText variant="subtitle">Check-in frequency</VoxaText>
            {chip(CONVERSATION_FREQUENCIES, 'conversationFrequency', prefs.conversationFrequency)}
          </GlassCard>
        </FadeInView>

        <FadeInView delay={160}>
          <GlassCard style={styles.section}>
            <VoxaText variant="subtitle">Wake phrase</VoxaText>
            <TextInput
              style={styles.input}
              value={prefs.wakePhrase}
              onChangeText={(wakePhrase) => setPrefs((p) => ({ ...p, wakePhrase }))}
              placeholder="Hey Voxa"
              placeholderTextColor={colors.textMuted}
            />
          </GlassCard>
        </FadeInView>

        <FadeInView delay={180}>
          <GlassCard style={styles.section}>
            <VoxaText variant="subtitle">Nickname</VoxaText>
            <TextInput
              style={styles.input}
              value={prefs.nickname}
              onChangeText={(nickname) => setPrefs((p) => ({ ...p, nickname }))}
              placeholder="What should Voxa call you?"
              placeholderTextColor={colors.textMuted}
            />
          </GlassCard>
        </FadeInView>

        <PrimaryButton label={saved ? 'Saved ✓' : 'Save preferences'} onPress={save} />
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
  section: { gap: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primarySoft, backgroundColor: 'rgba(139, 124, 246, 0.12)' },
  input: {
    color: colors.text,
    fontSize: 15,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surface,
  },
});
