import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput } from 'react-native';

import { EmptyState, SectionCard } from '../components/premium/premium-ui';
import { PrimaryButton } from '../components/ui/buttons';
import { VoxaText } from '../components/ui/voxa-text';
import { spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { LifeBookChapter } from '../types/phase5-life-os';
import { getPhase5LifeOSService } from '../services/life-os/phase5-life-os-service';
import { LifeOSScreenShell } from '../components/phase5/life-os-screen-shell';

export function LifeBookScreen() {
  const { profile, services } = useVoxa();
  const service = getPhase5LifeOSService(services.storage, services.repositories);
  const [chapters, setChapters] = useState<LifeBookChapter[]>([]);
  const [selected, setSelected] = useState<LifeBookChapter | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    const now = new Date();
    await service.getOrGenerateChapter(profile.id, now.getFullYear(), now.getMonth() + 1);
    setChapters(await service.listLifeBookChapters(profile.id));
  }, [profile, service]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const refresh = async (chapter: LifeBookChapter) => {
    if (!profile) return;
    await service.deleteLifeBookChapter(profile.id, chapter.id);
    const fresh = await service.getOrGenerateChapter(profile.id, chapter.year, chapter.month);
    setSelected(fresh);
    void load();
  };

  return (
    <LifeOSScreenShell
      title="Life Book"
      subtitle="Monthly chapters from your real Voxa history — generated once and cached.">
      {chapters.length === 0 ? (
        <EmptyState icon="book-outline" title="No chapters yet" message="Keep using Voxa — your first chapter generates when there is enough real data." />
      ) : (
        chapters.map((ch) => (
          <Pressable key={ch.id} onPress={() => setSelected(ch)}>
            <SectionCard title={ch.monthLabel} subtitle={ch.summary ?? 'Tap to read'}>
              {ch.biggestWin ? <VoxaText variant="caption" color="primarySoft">Win: {ch.biggestWin}</VoxaText> : null}
            </SectionCard>
          </Pressable>
        ))
      )}

      {selected ? (
        <>
          <SectionCard title={selected.monthLabel} subtitle="Chapter cover">
            {selected.summary ? <VoxaText variant="body" color="textSecondary">{selected.summary}</VoxaText> : null}
            {selected.biggestWin ? (
              <VoxaText variant="body" color="textSecondary" style={styles.mt}>Biggest win: {selected.biggestWin}</VoxaText>
            ) : null}
            {selected.biggestChallenge ? (
              <VoxaText variant="body" color="textSecondary" style={styles.mt}>Challenge: {selected.biggestChallenge}</VoxaText>
            ) : null}
            {selected.favouriteMemory ? (
              <VoxaText variant="body" color="textSecondary" style={styles.mt}>Favourite memory: {selected.favouriteMemory}</VoxaText>
            ) : null}
            {selected.voxaNoticed ? (
              <VoxaText variant="caption" color="primarySoft" style={styles.mt}>Voxa noticed: {selected.voxaNoticed}</VoxaText>
            ) : null}
            {selected.nextFocus ? (
              <VoxaText variant="caption" color="textMuted" style={styles.mt}>Next focus: {selected.nextFocus}</VoxaText>
            ) : null}
          </SectionCard>
          <Pressable onPress={() => void refresh(selected)}>
            <VoxaText variant="caption" color="primarySoft">Refresh chapter</VoxaText>
          </Pressable>
          <Pressable onPress={() => Alert.alert('Share', 'Share-as-image architecture ready — export coming in a future update.')}>
            <VoxaText variant="caption" color="textMuted">Share as image (architecture)</VoxaText>
          </Pressable>
          <Pressable onPress={() => void service.deleteLifeBookChapter(profile!.id, selected.id).then(() => { setSelected(null); void load(); })}>
            <VoxaText variant="caption" color="danger">Delete chapter</VoxaText>
          </Pressable>
        </>
      ) : null}
    </LifeOSScreenShell>
  );
}

const styles = StyleSheet.create({
  mt: { marginTop: spacing.sm },
});
