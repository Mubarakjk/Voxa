import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { EmptyState, SectionCard } from '../components/premium/premium-ui';
import { PrimaryButton } from '../components/ui/buttons';
import { GlassCard } from '../components/ui/glass-card';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { DreamEntry } from '../types/phase5-life-os';
import { getPhase5LifeOSService } from '../services/life-os/phase5-life-os-service';
import { LifeOSScreenShell } from '../components/phase5/life-os-screen-shell';

export function DreamJournalScreen() {
  const { profile, services } = useVoxa();
  const service = getPhase5LifeOSService(services.storage, services.repositories);
  const [dreams, setDreams] = useState<DreamEntry[]>([]);
  const [themes, setThemes] = useState<Array<{ theme: string; count: number }>>([]);
  const [body, setBody] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!profile) return;
    const [d, t] = await Promise.all([
      service.listDreams(profile.id),
      service.getRecurringThemes(profile.id),
    ]);
    setDreams(d);
    setThemes(t);
  }, [profile, service]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = dreams.filter((d) =>
    !search.trim() || d.body.toLowerCase().includes(search.toLowerCase()) || d.themes.some((t) => t.includes(search.toLowerCase())),
  );

  const save = async () => {
    if (!profile || !body.trim()) return;
    await service.addDream(profile.id, { body: body.trim(), isPrivate: true });
    setBody('');
    void load();
  };

  return (
    <LifeOSScreenShell
      title="Dream Journal"
      subtitle="Private reflections — themes are possibilities, not facts."
      disclaimer="Dream interpretation is reflective only. Voxa does not diagnose mental health conditions.">
      <GlassCard style={styles.field}>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Describe your dream…"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.multiline]}
          multiline
        />
        <PrimaryButton label="Save dream" onPress={() => void save()} />
      </GlassCard>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search dreams…"
        placeholderTextColor={colors.textMuted}
        style={styles.search}
      />

      {themes.length > 0 ? (
        <SectionCard title="Recurring themes" subtitle="One possible pattern — not a diagnosis">
          {themes.map((t) => (
            <VoxaText key={t.theme} variant="caption" color="textSecondary">
              {t.theme} ({t.count}×)
            </VoxaText>
          ))}
        </SectionCard>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState icon="moon-outline" title="No dreams logged" message="Type a note describing a dream." />
      ) : (
        filtered.slice(0, 20).map((dream) => (
          <GlassCard key={dream.id} style={styles.card}>
            <VoxaText variant="caption" color="textMuted">{new Date(dream.savedAt).toLocaleDateString()}</VoxaText>
            <VoxaText variant="body" color="textSecondary">
              {dream.isPrivate ? dream.body : dream.summary ?? dream.body}
            </VoxaText>
            {dream.themes.length > 0 ? (
              <VoxaText variant="caption" color="primarySoft">
                Themes: {dream.themes.join(', ')}
              </VoxaText>
            ) : null}
            <Pressable onPress={() => void service.deleteDream(profile!.id, dream.id).then(load)}>
              <VoxaText variant="caption" color="danger">Delete</VoxaText>
            </Pressable>
          </GlassCard>
        ))
      )}
    </LifeOSScreenShell>
  );
}

const styles = StyleSheet.create({
  field: { padding: spacing.md, gap: spacing.sm },
  input: { color: colors.text },
  multiline: { minHeight: 80 },
  search: { color: colors.text, backgroundColor: colors.surface, padding: spacing.sm, borderRadius: 8 },
  card: { padding: spacing.md, gap: spacing.xs },
});
