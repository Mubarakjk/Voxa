import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { getCompanionMode } from '../constants/companion-modes';
import { colors, layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { Conversation } from '../types';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

type Props = {
  onSelectConversation?: (conversation: Conversation) => void;
};

export function ConversationHistoryScreen({ onSelectConversation }: Props) {
  const navigation = useNavigation<Nav>();
  const { profile, services } = useVoxa();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    const all = await services.repositories.conversations.listConversations(profile.id);
    setConversations(all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }, [profile, services.repositories.conversations]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={colors.primarySoft} />
          <VoxaText variant="caption" color="primarySoft">
            Back
          </VoxaText>
        </Pressable>
        <VoxaText variant="title" style={styles.title}>
          Conversations
        </VoxaText>
        {conversations.length === 0 ? (
          <GlassCard style={styles.empty}>
            <VoxaText variant="body" color="textSecondary">
              Your chat history will appear here.
            </VoxaText>
          </GlassCard>
        ) : (
          conversations.map((conv) => {
            const mode = getCompanionMode(conv.mode);
            return (
              <Pressable
                key={conv.id}
                onPress={() => {
                  onSelectConversation?.(conv);
                  navigation.navigate('MainTabs', {
                    screen: 'Talk',
                    params: { conversationId: conv.id },
                  });
                }}>
                <GlassCard style={styles.card}>
                  <VoxaText variant="body">{mode.shortLabel}</VoxaText>
                  <VoxaText variant="caption" color="textMuted">
                    {new Date(conv.updatedAt).toLocaleString()}
                  </VoxaText>
                </GlassCard>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  title: { marginBottom: spacing.lg },
  empty: { padding: spacing.lg },
  card: { gap: 4, marginBottom: spacing.sm },
});
