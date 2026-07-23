import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { SectionCard } from '../components/premium/premium-ui';
import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { FutureSelfProfile } from '../types/phase5-life-os';
import { getPhase5LifeOSService } from '../services/life-os/phase5-life-os-service';
import { LifeOSScreenShell } from '../components/phase5/life-os-screen-shell';

export function FutureSelfScreen() {
  const { profile, services } = useVoxa();
  const service = getPhase5LifeOSService(services.storage, services.repositories);
  const [profile_, setProfile] = useState<FutureSelfProfile | null>(null);
  const [comparison, setComparison] = useState<Awaited<ReturnType<typeof service.getFutureSelfComparison>> | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    const [p, c] = await Promise.all([
      service.getFutureSelf(profile.id),
      service.getFutureSelfComparison(profile.id),
    ]);
    setProfile(p);
    setComparison(c);
  }, [profile, service]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const save = async (patch: Partial<FutureSelfProfile>) => {
    if (!profile) return;
    const updated = await service.saveFutureSelf(profile.id, patch);
    setProfile(updated);
    void load();
  };

  return (
    <LifeOSScreenShell
      title="Future Self"
      subtitle="A reflection and coaching exercise — not a prediction."
      disclaimer="Voxa does not predict the future or guarantee financial, legal, or medical outcomes.">
      {comparison ? (
        <SectionCard title="Today vs Future" subtitle="Identity progress">
          <VoxaText variant="caption" color="textMuted">Now: {comparison.currentFocus}</VoxaText>
          <VoxaText variant="body" color="textSecondary" style={styles.mt}>
            Becoming: {comparison.futureIdentity}
          </VoxaText>
          <VoxaText variant="subtitle" style={styles.mt}>One action today</VoxaText>
          <VoxaText variant="body" color="primarySoft">{comparison.oneActionToday}</VoxaText>
        </SectionCard>
      ) : null}

      <GlassCard style={styles.field}>
        <VoxaText variant="label" color="textMuted">Identity statement</VoxaText>
        <TextInput
          value={profile_?.identityStatement ?? ''}
          onChangeText={(t) => setProfile((p) => (p ? { ...p, identityStatement: t } : null))}
          placeholder="Who are you becoming?"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
        />
      </GlassCard>

      <SectionCard title="Habits to build">
        {(profile_?.habitsToBuild ?? []).map((h) => (
          <VoxaText key={h} variant="body" color="textSecondary">· {h}</VoxaText>
        ))}
        <Pressable onPress={() => Alert.prompt('Add habit', 'Habit to build', (t) => {
          if (!t?.trim() || !profile_) return;
          void save({ habitsToBuild: [...profile_.habitsToBuild, t.trim()] });
        })}>
          <VoxaText variant="caption" color="primarySoft">+ Add habit</VoxaText>
        </Pressable>
      </SectionCard>

      <SectionCard title="Habits to reduce">
        {(profile_?.habitsToReduce ?? []).map((h) => (
          <VoxaText key={h} variant="body" color="textSecondary">· {h}</VoxaText>
        ))}
        <Pressable onPress={() => Alert.prompt('Reduce habit', 'Habit to reduce', (t) => {
          if (!t?.trim() || !profile_) return;
          void save({ habitsToReduce: [...profile_.habitsToReduce, t.trim()] });
        })}>
          <VoxaText variant="caption" color="primarySoft">+ Add habit</VoxaText>
        </Pressable>
      </SectionCard>

      <PrimaryButton
        label="Save profile"
        onPress={() => {
          if (!profile_?.identityStatement.trim()) {
            Alert.alert('Add an identity statement', 'Write one sentence about who you want to become.');
            return;
          }
          void save({ identityStatement: profile_.identityStatement });
        }}
      />
    </LifeOSScreenShell>
  );
}

const styles = StyleSheet.create({
  field: { padding: spacing.md },
  input: { color: colors.text, marginTop: spacing.xs, minHeight: 60 },
  mt: { marginTop: spacing.sm },
});
