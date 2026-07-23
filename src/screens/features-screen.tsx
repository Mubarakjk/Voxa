import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { SectionHeader, VoxaText } from '../components/ui/voxa-text';
import { getRoadmapFeatures, isExperimentalFeaturesEnabled, isFeatureVisible } from '../config/feature-status';
import { SMART_ASSISTANT_FEATURES, SmartAssistantFeature, isSmartAssistantAvailable } from '../constants/smart-assistants';
import { colors, layout, spacing } from '../constants/theme';
import { MainTabParamList, RootStackParamList } from '../navigation/types';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

type CoreStackRoute = Exclude<
  keyof RootStackParamList,
  'GoalDetail' | 'CreateReminder' | 'CreateGoal' | 'Paywall' | 'DailyCheckIn' | 'MainTabs' | 'Talk'
>;

type CoreFeature = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  action: 'tab' | 'stack';
  tab?: keyof MainTabParamList;
  stack?: CoreStackRoute;
  featureKey?: import('../config/feature-status').FeatureKey;
};

const ALL_CORE_FEATURES: CoreFeature[] = [
  {
    id: 'chat',
    title: 'Talk',
    description: 'Chat with Voxa — fast, personal, and thoughtful',
    icon: 'chatbubbles-outline',
    action: 'tab',
    tab: 'Talk',
    featureKey: 'chat',
  },
  {
    id: 'routine',
    title: 'Routine Coach',
    description: 'Build your daily rhythm and track progress',
    icon: 'calendar-outline',
    action: 'tab',
    tab: 'Routine',
    featureKey: 'routineCoach',
  },
  {
    id: 'journey',
    title: 'Journey',
    description: 'Memories, goals, journals & milestones',
    icon: 'compass-outline',
    action: 'tab',
    tab: 'Journey',
    featureKey: 'journey',
  },
  {
    id: 'voice',
    title: 'Voxa',
    description: 'Live voice, Safe Call & music',
    icon: 'radio-outline',
    action: 'tab',
    tab: 'Voxa',
    featureKey: 'voiceCall',
  },
  {
    id: 'music',
    title: 'Music Recognition',
    description: 'Identify songs like Shazam',
    icon: 'musical-notes-outline',
    action: 'stack',
    stack: 'Music',
    featureKey: 'musicRecognition',
  },
  {
    id: 'customise',
    title: 'Companion Studio',
    description: 'Voice style, personality & appearance',
    icon: 'color-palette-outline',
    action: 'stack',
    stack: 'CompanionStudio',
    featureKey: 'companionStudio',
  },
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
  const coreFeatures = ALL_CORE_FEATURES.filter(
    (feature) => !feature.featureKey || isFeatureVisible(feature.featureKey),
  );
  const roadmap = getRoadmapFeatures();
  const categories = [...new Set(SMART_ASSISTANT_FEATURES.map((f) => f.category))];

  const openSmart = (feature: SmartAssistantFeature) => {
    if (!isSmartAssistantAvailable(feature)) {
      return;
    }
    navigation.navigate('MainTabs', {
      screen: 'Talk',
      params: { starterPrompt: feature.starterPrompt, mode: feature.mode },
    });
  };

  const openCore = (feature: CoreFeature) => {
    if (feature.action === 'tab' && feature.tab) {
      navigation.navigate('MainTabs', { screen: feature.tab });
      return;
    }
    if (feature.action === 'stack' && feature.stack) {
      const stack = feature.stack;
      if (stack === 'Music') navigation.navigate('Music');
      else if (stack === 'CompanionStudio') navigation.navigate('CompanionStudio');
      else if (stack === 'FeatureDiscovery') navigation.navigate('FeatureDiscovery');
      else if (stack === 'Activities') navigation.navigate('Activities');
    }
  };

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
          Your reliable AI companion — chat, routines, memories, and growth.
        </VoxaText>

        <SectionHeader title="Core" />
        <View style={styles.grid}>
          {coreFeatures.map((feature) => (
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

        <SectionHeader title="Experiences" />
        <View style={styles.grid}>
          <GlassCard style={styles.card} onPress={() => navigation.navigate('ScheduledCheckIns')}>
            <View style={styles.iconWrap}>
              <Ionicons name="notifications-outline" size={22} color={colors.primarySoft} />
            </View>
            <VoxaText variant="subtitle" style={styles.cardTitle}>Check-ins</VoxaText>
            <VoxaText variant="caption" color="textMuted" numberOfLines={2}>Schedule when Voxa reaches out</VoxaText>
          </GlassCard>
          <GlassCard style={styles.card} onPress={() => navigation.navigate('ProactiveCheckIns')}>
            <View style={styles.iconWrap}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.primarySoft} />
            </View>
            <VoxaText variant="subtitle" style={styles.cardTitle}>Proactive check-ins</VoxaText>
            <VoxaText variant="caption" color="textMuted" numberOfLines={2}>Reach out after quiet periods</VoxaText>
          </GlassCard>
          <GlassCard style={styles.card} onPress={() => navigation.navigate('CoachingHub')}>
            <View style={styles.iconWrap}>
              <Ionicons name="school-outline" size={22} color={colors.primarySoft} />
            </View>
            <VoxaText variant="subtitle" style={styles.cardTitle}>Coaching</VoxaText>
            <VoxaText variant="caption" color="textMuted" numberOfLines={2}>10 specialist coaches</VoxaText>
          </GlassCard>
          <GlassCard style={styles.card} onPress={() => navigation.navigate('ConversationWorlds')}>
            <View style={styles.iconWrap}>
              <Ionicons name="planet-outline" size={22} color={colors.primarySoft} />
            </View>
            <VoxaText variant="subtitle" style={styles.cardTitle}>Worlds</VoxaText>
            <VoxaText variant="caption" color="textMuted" numberOfLines={2}>Immersive chat environments</VoxaText>
          </GlassCard>
          <GlassCard style={styles.card} onPress={() => navigation.navigate('DailyNews')}>
            <View style={styles.iconWrap}>
              <Ionicons name="newspaper-outline" size={22} color={colors.primarySoft} />
            </View>
            <VoxaText variant="subtitle" style={styles.cardTitle}>Daily updates</VoxaText>
            <VoxaText variant="caption" color="textMuted" numberOfLines={2}>Personal + wellness digest</VoxaText>
          </GlassCard>
        </View>

        <SectionHeader title="Life OS" />
        <View style={styles.grid}>
          <GlassCard style={styles.card} onPress={() => navigation.navigate('LifeOSHub')}>
            <View style={styles.iconWrap}>
              <Ionicons name="planet-outline" size={22} color={colors.primarySoft} />
            </View>
            <VoxaText variant="subtitle" style={styles.cardTitle}>Life OS</VoxaText>
            <VoxaText variant="caption" color="textMuted" numberOfLines={2}>
              Goals, vision board, bucket list, dreams & more
            </VoxaText>
          </GlassCard>
        </View>

        {categories.map((category) => (
          <View key={category}>
            <SectionHeader title={CATEGORY_LABELS[category]} />
            <View style={styles.grid}>
              {SMART_ASSISTANT_FEATURES.filter((f) => f.category === category && isSmartAssistantAvailable(f)).map((feature) => (
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

        {roadmap.length > 0 ? (
          <>
            <SectionHeader title="Coming soon" />
            <VoxaText variant="caption" color="textMuted" style={styles.roadmapHint}>
              {isExperimentalFeaturesEnabled()
                ? 'Experimental features are on — some items below may already be available.'
                : 'These features are in development and not available yet.'}
            </VoxaText>
            <View style={styles.roadmapList}>
              {roadmap.map((item) => (
                <View key={item.key} style={styles.roadmapRow}>
                  <Ionicons name="ellipse-outline" size={8} color={colors.textMuted} />
                  <VoxaText variant="body" color="textSecondary">
                    {item.label}
                  </VoxaText>
                </View>
              ))}
            </View>
          </>
        ) : null}
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
  roadmapHint: { marginBottom: spacing.md },
  roadmapList: { gap: spacing.sm, marginBottom: spacing.lg },
  roadmapRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
