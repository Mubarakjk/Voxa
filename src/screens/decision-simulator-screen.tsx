import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput } from 'react-native';

import { EmptyState, SectionCard } from '../components/premium/premium-ui';
import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { SavedDecision } from '../types/phase5-life-os';
import { getPhase5LifeOSService } from '../services/life-os/phase5-life-os-service';
import { LifeOSScreenShell } from '../components/phase5/life-os-screen-shell';

export function DecisionSimulatorScreen() {
  const { profile, services } = useVoxa();
  const service = getPhase5LifeOSService(services.storage, services.repositories);
  const [decisions, setDecisions] = useState<SavedDecision[]>([]);
  const [question, setQuestion] = useState('');
  const [selected, setSelected] = useState<SavedDecision | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setDecisions(await service.listDecisions(profile.id));
  }, [profile, service]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const simulate = async () => {
    if (!profile || !question.trim()) return;
    const d = await service.createDecision(profile.id, question.trim());
    setSelected(d);
    setQuestion('');
    void load();
  };

  return (
    <LifeOSScreenShell
      title="Decision Simulator"
      subtitle="Weigh options with benefits, risks, and unknowns."
      disclaimer="No guaranteed outcomes. Seek professional advice for high-stakes medical, legal, or financial decisions.">
      <GlassCard style={styles.field}>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="Should I accept this job?"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <PrimaryButton label="Simulate" onPress={() => void simulate()} />
      </GlassCard>

      {selected ? (
        <>
          <SectionCard title={selected.question} subtitle="Recommended next step">
            <VoxaText variant="body" color="primarySoft">{selected.recommendedNextStep}</VoxaText>
            {selected.caution ? (
              <VoxaText variant="caption" color="textMuted" style={styles.mt}>{selected.caution}</VoxaText>
            ) : null}
          </SectionCard>
          {selected.options.map((opt) => (
            <SectionCard key={opt.id} title={opt.label} subtitle={opt.reversible ? 'Mostly reversible' : 'Hard to reverse'}>
              <VoxaText variant="caption" color="textSecondary">Benefits: {opt.benefits.join('; ')}</VoxaText>
              <VoxaText variant="caption" color="textSecondary">Risks: {opt.risks.join('; ')}</VoxaText>
            </SectionCard>
          ))}
          <Pressable onPress={() => Alert.prompt('Record outcome', 'What did you decide?', async (text) => {
            if (!text?.trim()) return;
            await service.updateDecision({ ...selected, outcome: text.trim(), status: 'decided' });
            setSelected(null);
            void load();
          })}>
            <VoxaText variant="caption" color="primarySoft">Record outcome</VoxaText>
          </Pressable>
        </>
      ) : null}

      {decisions.length === 0 && !selected ? (
        <EmptyState icon="git-compare-outline" title="No saved decisions" message="Ask a real question you are facing." />
      ) : (
        decisions.slice(0, 10).map((d) => (
          <Pressable key={d.id} onPress={() => setSelected(d)}>
            <GlassCard style={styles.card}>
              <VoxaText variant="subtitle">{d.question}</VoxaText>
              <VoxaText variant="caption" color="textMuted">{d.status}</VoxaText>
            </GlassCard>
          </Pressable>
        ))
      )}
    </LifeOSScreenShell>
  );
}

const styles = StyleSheet.create({
  field: { padding: spacing.md, gap: spacing.sm },
  input: { color: colors.text },
  card: { padding: spacing.md },
  mt: { marginTop: spacing.sm },
});
