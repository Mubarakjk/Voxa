import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { EmptyState, SectionCard } from '../components/premium/premium-ui';
import { VoxaText } from '../components/ui/voxa-text';
import { spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { COACH_DOMAIN_LABELS, CoachScoreSnapshot } from '../types/phase5-life-os';
import { getPhase5LifeOSService } from '../services/life-os/phase5-life-os-service';
import { LifeOSScreenShell } from '../components/phase5/life-os-screen-shell';

export function CoachScoreScreen() {
  const { profile, services } = useVoxa();
  const service = getPhase5LifeOSService(services.storage, services.repositories);
  const [snapshot, setSnapshot] = useState<CoachScoreSnapshot | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setSnapshot(await service.getCoachScore(profile.id));
  }, [profile, service]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const visible = snapshot?.scores.filter((s) => !s.hidden) ?? [];

  return (
    <LifeOSScreenShell
      title="Coach Score"
      subtitle="Transparent progress from your real data — never invented.">
      {!snapshot || visible.length === 0 ? (
        <EmptyState icon="stats-chart-outline" title="Not enough data yet" message="Keep using goals, routines, and reflections to build your score." />
      ) : (
        visible.map((entry) => (
          <SectionCard
            key={entry.domain}
            title={COACH_DOMAIN_LABELS[entry.domain]}
            subtitle={`${entry.value}/100 · ${entry.trend} · ${entry.confidence} confidence`}>
            <VoxaText variant="body" color="textSecondary">{entry.whyChanged}</VoxaText>
            {entry.dataUsed.length > 0 ? (
              <VoxaText variant="caption" color="textMuted" style={styles.mt}>
                Data: {entry.dataUsed.join(', ')}
              </VoxaText>
            ) : null}
            {entry.improveAction ? (
              <VoxaText variant="caption" color="primarySoft" style={styles.mt}>
                → {entry.improveAction}
              </VoxaText>
            ) : null}
            <Pressable onPress={() => void service.toggleCoachDomain(profile!.id, entry.domain, true).then(load)}>
              <VoxaText variant="caption" color="textMuted" style={styles.mt}>Hide domain</VoxaText>
            </Pressable>
          </SectionCard>
        ))
      )}
    </LifeOSScreenShell>
  );
}

const styles = StyleSheet.create({
  mt: { marginTop: spacing.sm },
});
