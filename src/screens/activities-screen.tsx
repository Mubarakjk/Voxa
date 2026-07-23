import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { ActivityDefinition, ActivityId, ActivitySession } from '../types/phase6-premium';
import { getActivitiesService } from '../services/phase6/activities-service';

export function ActivitiesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, services } = useVoxa();
  const activityService = getActivitiesService(services.storage);
  const [definitions] = useState<ActivityDefinition[]>(activityService.listDefinitions());
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [favourites, setFavourites] = useState<ActivityDefinition[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    setSessions(await activityService.listSessions(profile.id));
    setFavourites(await activityService.getFavourites(profile.id));
  }, [profile, activityService]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const start = async (id: ActivityId) => {
    if (!profile) return;
    const def = activityService.getDefinition(id);
    if (!def) return;
    await activityService.start(profile.id, id);
    navigation.navigate('MainTabs', {
      screen: 'Talk',
      params: { starterPrompt: def.starterPrompt },
    });
  };

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={colors.primarySoft} />
          <VoxaText variant="caption" color="primarySoft">Back</VoxaText>
        </Pressable>

        <VoxaText variant="title">Do something together</VoxaText>
        <VoxaText variant="body" color="textSecondary" style={styles.sub}>
          Clear start and end — meaningful, not empty loops.
        </VoxaText>

        {favourites.length > 0 ? (
          <>
            <VoxaText variant="label" color="textMuted">Favourites</VoxaText>
            <View style={styles.grid}>
              {favourites.map((a) => (
                <GlassCard key={a.id} style={styles.card} onPress={() => void start(a.id)}>
                  <VoxaText variant="subtitle">{a.emoji} {a.title}</VoxaText>
                </GlassCard>
              ))}
            </View>
          </>
        ) : null}

        <VoxaText variant="label" color="textMuted">Activities</VoxaText>
        <View style={styles.grid}>
          {definitions.map((a) => (
            <GlassCard key={a.id} style={styles.card} onPress={() => void start(a.id)}>
              <VoxaText variant="subtitle">{a.emoji} {a.title}</VoxaText>
              <VoxaText variant="caption" color="textMuted">{a.description}</VoxaText>
              <VoxaText variant="caption" color="primarySoft">~{a.durationMin} min</VoxaText>
            </GlassCard>
          ))}
        </View>

        {sessions.filter((s) => s.status === 'completed').length > 0 ? (
          <>
            <VoxaText variant="label" color="textMuted">Recent</VoxaText>
            {sessions.filter((s) => s.status === 'completed').slice(0, 5).map((s) => (
              <VoxaText key={s.id} variant="caption" color="textSecondary">· {s.title}</VoxaText>
            ))}
          </>
        ) : null}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: layout.screenPadding, paddingBottom: spacing.xxl, gap: spacing.md },
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sub: { marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { width: '47%', padding: spacing.md, gap: spacing.xs, minHeight: 88 },
});
