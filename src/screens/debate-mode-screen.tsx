import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { SectionCard } from '../components/premium/premium-ui';
import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { DebatePerspective, DebateResult } from '../types/phase5-life-os';
import { getPhase5LifeOSService } from '../services/life-os/phase5-life-os-service';
import { LifeOSScreenShell } from '../components/phase5/life-os-screen-shell';

const PERSPECTIVES: Array<{ id: DebatePerspective; label: string }> = [
  { id: 'challenge', label: 'Challenge my idea' },
  { id: 'defend', label: 'Defend my idea' },
  { id: 'balanced', label: 'Balanced debate' },
  { id: 'devils_advocate', label: "Devil's advocate" },
  { id: 'investor', label: 'Investor view' },
  { id: 'coach', label: 'Coach view' },
  { id: 'customer', label: 'Customer view' },
];

export function DebateModeScreen() {
  const { profile, services } = useVoxa();
  const service = getPhase5LifeOSService(services.storage, services.repositories);
  const [topic, setTopic] = useState('');
  const [perspective, setPerspective] = useState<DebatePerspective>('balanced');
  const [result, setResult] = useState<DebateResult | null>(null);

  const run = async () => {
    if (!profile || !topic.trim()) return;
    const r = await service.runDebate(profile.id, topic.trim(), perspective);
    setResult(r);
  };

  return (
    <LifeOSScreenShell title="Debate Mode" subtitle="Respectful, constructive challenge — strongest cases for and against.">
      <GlassCard style={styles.field}>
        <TextInput
          value={topic}
          onChangeText={setTopic}
          placeholder="Your idea, plan, or belief…"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
        />
      </GlassCard>

      <View style={styles.chips}>
        {PERSPECTIVES.map((p) => (
          <Pressable key={p.id} onPress={() => setPerspective(p.id)} style={[styles.chip, perspective === p.id && styles.chipActive]}>
            <VoxaText variant="caption" color={perspective === p.id ? 'primarySoft' : 'textMuted'}>{p.label}</VoxaText>
          </Pressable>
        ))}
      </View>

      <PrimaryButton label="Start debate" onPress={() => void run()} />

      {result ? (
        <>
          <SectionCard title="Case for">
            {result.caseFor.map((line) => (
              <VoxaText key={line} variant="body" color="textSecondary">· {line}</VoxaText>
            ))}
          </SectionCard>
          <SectionCard title="Case against">
            {result.caseAgainst.map((line) => (
              <VoxaText key={line} variant="body" color="textSecondary">· {line}</VoxaText>
            ))}
          </SectionCard>
          <SectionCard title="Weak assumptions">
            {result.weakAssumptions.map((line) => (
              <VoxaText key={line} variant="caption" color="textMuted">· {line}</VoxaText>
            ))}
          </SectionCard>
          <SectionCard title="Better question">
            <VoxaText variant="body" color="primarySoft">{result.betterQuestion}</VoxaText>
          </SectionCard>
          <SectionCard title="Conclusion">
            <VoxaText variant="body" color="textSecondary">{result.conclusion}</VoxaText>
          </SectionCard>
        </>
      ) : null}
    </LifeOSScreenShell>
  );
}

const styles = StyleSheet.create({
  field: { padding: spacing.md },
  input: { color: colors.text, minHeight: 60 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 8, backgroundColor: colors.surface },
  chipActive: { borderWidth: 1, borderColor: colors.primarySoft },
});
