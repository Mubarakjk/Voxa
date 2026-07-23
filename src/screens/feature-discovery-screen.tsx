import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '../components/ui/buttons';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { colors, layout, spacing } from '../constants/theme';
import { useVoxa } from '../context/voxa-context';
import { RootStackParamList } from '../navigation/types';

const HIGHLIGHTS = [
  { icon: 'heart-outline' as const, title: 'Remembers what matters', detail: 'Memories from real conversations — never invented.' },
  { icon: 'calendar-outline' as const, title: 'Routines & goals', detail: 'Build rhythm and track progress over time.' },
  { icon: 'compass-outline' as const, title: 'Your Journey', detail: 'Timeline, relationship, and Life OS in one place.' },
  { icon: 'mic-outline' as const, title: 'Voice notes', detail: 'Send voice — Voxa listens and remembers.' },
  { icon: 'sparkles-outline' as const, title: 'Adapts to you', detail: 'Style and coaching that fits how you work.' },
  { icon: 'football-outline' as const, title: 'Sports chat', detail: 'Verified facts when live data is available.' },
];

export function FeatureDiscoveryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, services } = useVoxa();

  const dismiss = async () => {
    if (profile) {
      const map = (await services.storage.getItem<Record<string, boolean>>(STORAGE_KEYS.featureDiscoverySeen)) ?? {};
      map[profile.id] = true;
      await services.storage.setItem(STORAGE_KEYS.featureDiscoverySeen, map);
    }
    navigation.goBack();
  };

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => void dismiss()} style={styles.back}>
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </Pressable>

        <VoxaText variant="title">What Voxa can do</VoxaText>
        <VoxaText variant="body" color="textSecondary" style={styles.sub}>
          The AI companion that knows your life, helps you make progress, and grows with you.
        </VoxaText>

        {HIGHLIGHTS.map((item) => (
          <Pressable key={item.title} style={styles.row} onPress={() => navigation.navigate('MainTabs', { screen: 'Talk' })}>
            <Ionicons name={item.icon} size={22} color={colors.primarySoft} />
            <View style={styles.rowText}>
              <VoxaText variant="subtitle">{item.title}</VoxaText>
              <VoxaText variant="caption" color="textMuted">{item.detail}</VoxaText>
            </View>
          </Pressable>
        ))}

        <PrimaryButton label="Start talking" onPress={() => { void dismiss(); navigation.navigate('MainTabs', { screen: 'Talk' }); }} />
        <Pressable onPress={() => void dismiss()} style={styles.skip}>
          <VoxaText variant="caption" color="textMuted">Got it</VoxaText>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: layout.screenPadding, paddingBottom: spacing.xxl, gap: spacing.lg },
  back: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' },
  sub: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', minHeight: 44 },
  rowText: { flex: 1, gap: 2 },
  skip: { alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
});
