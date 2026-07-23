import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { ScreenHeader } from '../components/premium/premium-ui';
import { layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';
import { CONVERSATION_WORLDS, getConversationWorldsService } from '../services/phase12/conversation-worlds-service';
import { WorldId } from '../types/phase12-experiences';

type Props = NativeStackScreenProps<RootStackParamList, 'ConversationWorlds'>;

export function ConversationWorldsScreen({ navigation }: Props) {
  const { profile, services } = useVoxa();
  const svc = getConversationWorldsService(services.storage);
  const [favourites, setFavourites] = useState<WorldId[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    const prefs = await svc.getPreferences(profile.id);
    setFavourites(prefs.favouriteWorldIds);
  }, [profile, svc]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const enter = async (worldId: WorldId) => {
    if (!profile) return;
    await svc.enter(profile.id, worldId);
    const world = svc.getWorld(worldId)!;
    navigation.navigate('MainTabs', {
      screen: 'Talk',
      params: { starterPrompt: world.starters[0] },
    });
  };

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title="Conversation worlds" subtitle="Original visuals — gradients only. Exit anytime from Talk." />
        {CONVERSATION_WORLDS.map((world) => (
          <Pressable key={world.id} onPress={() => void enter(world.id)} style={styles.worldWrap}>
            <LinearGradient colors={world.gradient} style={styles.world}>
              <VoxaText variant="subtitle" style={{ color: world.accentColor }}>{world.name}</VoxaText>
              <VoxaText variant="caption" style={{ color: '#ccc' }}>{world.description}</VoxaText>
              {favourites.includes(world.id) ? (
                <VoxaText variant="caption" style={{ color: world.accentColor }}>★ Favourite</VoxaText>
              ) : null}
            </LinearGradient>
          </Pressable>
        ))}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: layout.screenPadding, paddingBottom: spacing.xxl, gap: spacing.md },
  worldWrap: { borderRadius: 16, overflow: 'hidden' },
  world: { padding: spacing.lg, gap: spacing.xs, minHeight: 100 },
});
