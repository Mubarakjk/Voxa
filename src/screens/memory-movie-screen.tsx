import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { EmptyState, SectionCard } from '../components/premium/premium-ui';
import { PrimaryButton } from '../components/ui/buttons';
import { VoxaText } from '../components/ui/voxa-text';
import { spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { MemoryMovieStoryboard } from '../types/phase5-life-os';
import { getPhase5LifeOSService } from '../services/life-os/phase5-life-os-service';
import { LifeOSScreenShell } from '../components/phase5/life-os-screen-shell';

export function MemoryMovieScreen() {
  const { profile, services } = useVoxa();
  const service = getPhase5LifeOSService(services.storage, services.repositories);
  const [storyboards, setStoryboards] = useState<MemoryMovieStoryboard[]>([]);
  const [selected, setSelected] = useState<MemoryMovieStoryboard | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setStoryboards(await service.listStoryboards(profile.id));
  }, [profile, service]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const generate = async () => {
    if (!profile) return;
    const sb = await service.generateStoryboard(profile.id, 'My Memory Movie');
    setSelected(sb);
    void load();
  };

  return (
    <LifeOSScreenShell
      title="Memory Movie"
      subtitle="Preview storyboard cards — video rendering coming soon."
      disclaimer="Video export is not available yet. Preview storyboards only.">
      <PrimaryButton label="Generate storyboard" onPress={() => void generate()} />

      {selected ? (
        <>
          <SectionCard title={selected.title} subtitle={`~${selected.totalDurationSec}s · ${selected.musicPlaceholder}`}>
            <VoxaText variant="caption" color="textMuted">Export: {selected.exportStatus === 'preview_only' ? 'Coming soon' : selected.exportStatus}</VoxaText>
          </SectionCard>
          {selected.scenes.map((scene, i) => (
            <SectionCard key={scene.id} title={`Scene ${i + 1}: ${scene.title}`} subtitle={`${scene.durationSec}s`}>
              <VoxaText variant="body" color="textSecondary">{scene.narration}</VoxaText>
            </SectionCard>
          ))}
          <PrimaryButton
            label="Export video"
            onPress={() => Alert.alert('Coming soon', 'Video rendering is not available yet. Your storyboard is saved for preview.')}
          />
        </>
      ) : storyboards.length === 0 ? (
        <EmptyState icon="film-outline" title="No storyboards" message="Generate a storyboard from your memories and photos." />
      ) : (
        storyboards.map((sb) => (
          <SectionCard key={sb.id} title={sb.title} subtitle={`${sb.scenes.length} scenes`}>
            <PrimaryButton label="Preview" onPress={() => setSelected(sb)} />
          </SectionCard>
        ))
      )}
    </LifeOSScreenShell>
  );
}

const styles = StyleSheet.create({
  mt: { marginTop: spacing.sm },
});
