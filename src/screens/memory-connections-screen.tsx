import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable } from 'react-native';

import { EmptyState, SectionCard } from '../components/premium/premium-ui';
import { PrimaryButton } from '../components/ui/buttons';
import { VoxaText } from '../components/ui/voxa-text';
import { useVoxa } from '../context/voxa-context';
import { MemoryConnection } from '../types/phase5-life-os';
import { getPhase5LifeOSService } from '../services/life-os/phase5-life-os-service';
import { LifeOSScreenShell } from '../components/phase5/life-os-screen-shell';

export function MemoryConnectionsScreen() {
  const { profile, services } = useVoxa();
  const service = getPhase5LifeOSService(services.storage, services.repositories);
  const [connections, setConnections] = useState<MemoryConnection[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    let list = await service.listMemoryConnections(profile.id);
    if (list.length === 0) list = await service.refreshMemoryConnections(profile.id);
    setConnections(list);
  }, [profile, service]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <LifeOSScreenShell
      title="Memory Connections"
      subtitle="High-confidence links only — Voxa never invents connections.">
      <PrimaryButton label="Refresh connections" onPress={() => void load()} />

      {connections.length === 0 ? (
        <EmptyState
          icon="link-outline"
          title="No connections yet"
          message="As you save memories, goals, and dreams, Voxa will link them when confidence is high."
        />
      ) : (
        connections.map((conn) => (
          <SectionCard
            key={conn.id}
            title={conn.toLabel}
            subtitle={`${conn.toKind} · ${conn.confidence} confidence`}>
            <VoxaText variant="caption" color="textMuted">
              Memory → {conn.toKind}
            </VoxaText>
          </SectionCard>
        ))
      )}
    </LifeOSScreenShell>
  );
}
