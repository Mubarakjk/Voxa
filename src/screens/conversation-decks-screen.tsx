import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { GlassCard } from '../components/ui/glass-card';
import { FadeIn, ScreenHeader } from '../components/premium/premium-ui';
import { colors, layout, radius, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import {
  DECK_CATEGORIES,
  getDeckCards,
  getDeckCategoryRequiredLevel,
  isDeckCategoryUnlocked,
} from '../services/phase10/conversation-decks-service';
import { getRelationshipGrowthService } from '../services/relationship/relationship-growth-service';
import { FRIENDSHIP_LEVEL_LABELS } from '../types/relationship-growth';
import { DeckCategory } from '../types/phase10-play';

export function ConversationDecksScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, services } = useVoxa();
  const [category, setCategory] = useState<DeckCategory>('deep');
  const [friendshipLevel, setFriendshipLevel] = useState(
    null as import('../types/relationship-growth').FriendshipLevel | null,
  );
  const cards = useMemo(() => getDeckCards(category), [category]);
  const categoryUnlocked = friendshipLevel ? isDeckCategoryUnlocked(category, friendshipLevel) : true;
  const requiredLevel = getDeckCategoryRequiredLevel(category);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      void getRelationshipGrowthService(services.storage, services.repositories)
        .getSnapshot(profile.id)
        .then((snapshot) => setFriendshipLevel(snapshot.level));
    }, [profile, services.repositories, services.storage]),
  );

  const openCard = (prompt: string) => {
    navigation.navigate('MainTabs', { screen: 'Talk', params: { starterPrompt: prompt } });
  };

  return (
    <ScreenShell padded={false}>
      <View style={styles.headerWrap}>
        <ScreenHeader showBack title="Conversation Decks" subtitle="Earn deeper topics over time" />
      </View>

      <FlatList
        horizontal
        data={DECK_CATEGORIES}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
        renderItem={({ item }) => {
          const locked = friendshipLevel ? !isDeckCategoryUnlocked(item.id, friendshipLevel) : false;
          return (
            <Pressable
              onPress={() => setCategory(item.id)}
              style={[styles.chip, category === item.id && styles.chipActive]}>
              <VoxaText variant="caption" color={category === item.id ? 'primarySoft' : 'textMuted'}>
                {locked ? '🔒 ' : ''}
                {item.emoji} {item.label}
              </VoxaText>
            </Pressable>
          );
        }}
      />

      {!categoryUnlocked && requiredLevel ? (
        <GlassCard style={styles.lockedBanner}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
          <View style={styles.flex}>
            <VoxaText variant="body" color="textSecondary">
              Unlock with {FRIENDSHIP_LEVEL_LABELS[requiredLevel]}
            </VoxaText>
            <VoxaText variant="caption" color="textMuted">
              Keep showing up — deeper decks open as your friendship grows.
            </VoxaText>
          </View>
          <Pressable onPress={() => navigation.navigate('RelationshipGrowth')}>
            <VoxaText variant="caption" color="primarySoft">
              View growth
            </VoxaText>
          </Pressable>
        </GlassCard>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <FadeIn delay={index * 40}>
              <Pressable onPress={() => openCard(item.prompt)}>
                <GlassCard style={styles.card}>
                  <View style={styles.cardInner}>
                    <VoxaText variant="body" color="textSecondary" style={styles.question}>
                      {item.prompt}
                    </VoxaText>
                    <VoxaText variant="caption" color="primarySoft" style={styles.cta}>
                      Tap to talk →
                    </VoxaText>
                  </View>
                </GlassCard>
              </Pressable>
            </FadeIn>
          )}
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.lg },
  categories: {
    paddingHorizontal: layout.screenPadding,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md12,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceStrong,
    minHeight: 40,
    justifyContent: 'center',
  },
  chipActive: { borderWidth: 1, borderColor: colors.primarySoft },
  list: {
    padding: layout.screenPadding,
    gap: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  card: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 128,
  },
  cardInner: {
    flexGrow: 1,
    minHeight: 88,
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  question: {
    lineHeight: 24,
    flexShrink: 1,
  },
  cta: {
    lineHeight: 18,
    paddingTop: spacing.sm,
  },
  lockedBanner: {
    marginHorizontal: layout.screenPadding,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  flex: { flex: 1, minWidth: 0, gap: spacing.xs },
});
