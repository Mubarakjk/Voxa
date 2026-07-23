import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { SectionCard } from '../components/premium/premium-ui';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { colors, layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { CompanionRelationshipProfile, RELATIONSHIP_FRAMING_LABELS, RelationshipFraming } from '../types/phase6-premium';
import { getRelationshipProfileService } from '../services/phase6/relationship-profile-service';
import { buildPhase6Dashboard } from '../services/phase6/phase6-dashboard-service';

const FRAMINGS: RelationshipFraming[] = ['friend', 'coach', 'mentor', 'study_partner', 'business_partner', 'supportive_companion'];

export function RelationshipProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, companion, services } = useVoxa();
  const [rel, setRel] = useState<CompanionRelationshipProfile | null>(null);
  const [framing, setFraming] = useState<RelationshipFraming>('friend');

  const load = useCallback(async () => {
    if (!profile) return;
    const dashboard = await companion.getHomeDashboard(profile.id);
    const relService = getRelationshipProfileService(services.storage);
    setFraming(await relService.getFraming(profile.id));
    setRel(dashboard.phase6.relationshipProfile);
  }, [profile, companion, services.storage]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const saveFraming = async (f: RelationshipFraming) => {
    if (!profile) return;
    await getRelationshipProfileService(services.storage).setFraming(profile.id, f);
    setFraming(f);
  };

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={colors.primarySoft} />
          <VoxaText variant="caption" color="primarySoft">Back</VoxaText>
        </Pressable>

        <VoxaText variant="title">Our relationship</VoxaText>
        <VoxaText variant="body" color="textSecondary" style={styles.sub}>
          Slow, genuine growth — no XP, no guilt.
        </VoxaText>

        {rel ? (
          <>
            <SectionCard title={rel.stage} subtitle={`${rel.daysTogether} days together`}>
              <VoxaText variant="body" color="textSecondary">{rel.learnedSummary}</VoxaText>
            </SectionCard>

            <SectionCard title="Together">
              <VoxaText variant="caption" color="textSecondary">
                {rel.sharedMemories} memories · {rel.goalsAchieved} goals · {rel.routinesCompleted} routines
              </VoxaText>
            </SectionCard>

            {rel.favouriteTopics.length > 0 ? (
              <SectionCard title="Favourite topics">
                <VoxaText variant="body" color="textSecondary">{rel.favouriteTopics.join(' · ')}</VoxaText>
              </SectionCard>
            ) : null}

            {rel.insideJokes.length > 0 ? (
              <SectionCard title="Inside jokes">
                {rel.insideJokes.map((j) => (
                  <VoxaText key={j} variant="caption" color="textMuted">· {j}</VoxaText>
                ))}
              </SectionCard>
            ) : null}

            <SectionCard title="Communication style">
              <VoxaText variant="body" color="textSecondary">{rel.communicationStyle}</VoxaText>
            </SectionCard>
          </>
        ) : null}

        <VoxaText variant="label" color="textMuted" style={styles.sectionLabel}>Relationship framing</VoxaText>
        <View style={styles.chips}>
          {FRAMINGS.map((f) => (
            <Pressable key={f} style={[styles.chip, framing === f && styles.chipActive]} onPress={() => void saveFraming(f)}>
              <VoxaText variant="caption" color={framing === f ? 'primarySoft' : 'textMuted'}>
                {RELATIONSHIP_FRAMING_LABELS[f]}
              </VoxaText>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: layout.screenPadding, paddingBottom: spacing.xxl, gap: spacing.md },
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  sub: { marginBottom: spacing.md },
  sectionLabel: { marginTop: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 8, backgroundColor: colors.surface, minHeight: 44, justifyContent: 'center' },
  chipActive: { borderWidth: 1, borderColor: colors.primarySoft },
});
