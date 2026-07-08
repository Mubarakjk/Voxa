import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { SectionHeader, VoxaText } from '../components/ui/voxa-text';
import { SMART_ASSISTANT_FEATURES, SmartAssistantFeature } from '../constants/smart-assistants';
import { colors, layout, spacing } from '../constants/theme';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { showComingSoon } from '../utils/interactions';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

const CORE_FEATURES: Array<{
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  action: 'tab' | 'stack';
  tab?: keyof MainTabParamList;
  stack?: keyof RootStackParamList;
}> = [
  { id: 'chat', title: 'Talk', description: 'Chat, voice notes, photos & videos', icon: 'chatbubbles-outline', action: 'tab', tab: 'Talk' },
  { id: 'voice', title: 'Voxa', description: 'Live voice, Safe Call & music', icon: 'radio-outline', action: 'tab', tab: 'Voxa' },
  { id: 'journey', title: 'Journey', description: 'Memories, goals & milestones', icon: 'compass-outline', action: 'tab', tab: 'Journey' },
  { id: 'music', title: 'Music Recognition', description: 'Identify songs like Shazam', icon: 'musical-notes-outline', action: 'stack', stack: 'Music' },
  { id: 'customise', title: 'Companion Studio', description: 'Voice, personality & appearance', icon: 'color-palette-outline', action: 'stack', stack: 'CompanionStudio' },
];

const CATEGORY_LABELS: Record<SmartAssistantFeature['category'], string> = {
  productivity: 'Productivity',
  life: 'Life & planning',
  creative: 'Creative',
  vision: 'Camera & vision',
  health: 'Health & habits',
};

export function FeaturesScreen() {
  const navigation = useNavigation<Nav>();

  const openSmart = (feature: SmartAssistantFeature) => {
    if (!feature.available) {
      showComingSoon(feature.title);
      return;
    }
    navigation.navigate('MainTabs', { screen: 'Talk' });
  };

  const openCore = (feature: (typeof CORE_FEATURES)[number]) => {
    if (feature.action === 'tab' && feature.tab) {
      navigation.navigate('MainTabs', { screen: feature.tab });
      return;
    }
    if (feature.action === 'stack' && feature.stack) {
      navigation.navigate(feature.stack);
    }
  };

  const categories = [...new Set(SMART_ASSISTANT_FEATURES.map((f) => f.category))];

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={colors.primarySoft} />
          <VoxaText variant="caption" color="primarySoft">
            Back
          </VoxaText>
        </Pressable>

        <VoxaText variant="title" style={styles.title}>
          Explore Voxa
        </VoxaText>
        <VoxaText variant="body" color="textSecondary" style={styles.subtitle}>
          Your AI companion for life — chat, voice, planning, and more.
        </VoxaText>

        <SectionHeader title="Core" />
        <View style={styles.grid}>
          {CORE_FEATURES.map((feature) => (
            <GlassCard key={feature.id} style={styles.card} onPress={() => openCore(feature)}>
              <View style={styles.iconWrap}>
                <Ionicons name={feature.icon} size={22} color={colors.primarySoft} />
              </View>
              <VoxaText variant="subtitle" style={styles.cardTitle}>
                {feature.title}
              </VoxaText>
              <VoxaText variant="caption" color="textMuted" numberOfLines={2}>
                {feature.description}
              </VoxaText>
            </GlassCard>
          ))}
        </View>

        {categories.map((category) => (
          <View key={category}>
            <SectionHeader title={CATEGORY_LABELS[category]} />
            <View style={styles.grid}>
              {SMART_ASSISTANT_FEATURES.filter((f) => f.category === category).map((feature) => (
                <GlassCard key={feature.id} style={styles.card} onPress={() => openSmart(feature)}>
                  <View style={styles.iconWrap}>
                    <Ionicons
                      name={feature.icon as keyof typeof Ionicons.glyphMap}
                      size={22}
                      color={colors.primarySoft}
                    />
                  </View>
                  <VoxaText variant="subtitle" style={styles.cardTitle}>
                    {feature.title}
                  </VoxaText>
                  <VoxaText variant="caption" color="textMuted" numberOfLines={2}>
                    {feature.description}
                  </VoxaText>
                </GlassCard>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: layout.tabBarHeight + spacing.xxl,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm, marginBottom: spacing.md },
  title: { marginBottom: spacing.xs },
  subtitle: { marginBottom: spacing.xl, maxWidth: 320 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: layout.cardGap, marginBottom: spacing.lg },
  card: { width: '47.5%', minHeight: 130, gap: spacing.sm },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 124, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 124, 246, 0.2)',
  },
  cardTitle: { fontSize: 15 },
});
