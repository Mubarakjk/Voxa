import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, radius, spacing } from '../constants/theme';
import { VoxaText } from '../components/ui/voxa-text';

type TabConfig = { icon: keyof typeof Ionicons.glyphMap; label: string; center?: boolean };

function buildTabConfig(): Record<string, TabConfig> {
  return {
    Home: { icon: 'home', label: 'Home' },
    Talk: { icon: 'chatbubbles', label: 'Talk' },
    Voxa: { icon: 'sparkles', label: 'Voxa', center: true },
    Journey: { icon: 'compass', label: 'Journey' },
    You: { icon: 'person', label: 'You' },
  };
}

type Props = BottomTabBarProps;

export function PremiumTabBar({ state, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const TAB_CONFIG = buildTabConfig();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const config = TAB_CONFIG[route.name] ?? { icon: 'ellipse', label: route.name };
          const isCenter = config.center;

          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={[styles.tab, focused && styles.tabFocused, isCenter && styles.tabCenter]}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={config.label}>
              <View style={[styles.iconWrap, isCenter && styles.iconWrapCenter, focused && isCenter && styles.iconWrapCenterFocused]}>
                <Ionicons
                  name={config.icon}
                  size={isCenter ? 26 : 22}
                  color={focused ? colors.primarySoft : colors.textMuted}
                />
              </View>
              <VoxaText
                variant="caption"
                color={focused ? 'primarySoft' : 'textMuted'}
                style={isCenter ? styles.labelCenter : styles.label}>
                {config.label}
              </VoxaText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.tabBar,
    borderTopWidth: 1,
    borderTopColor: colors.tabBarBorder,
    paddingTop: 8,
    paddingHorizontal: layout.screenPadding - 8,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: layout.minTapTarget,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    minWidth: layout.minTapTarget,
    gap: 4,
  },
  tabCenter: { marginTop: -10 },
  tabFocused: {
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
  },
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapCenter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(45, 212, 191, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.35)',
    marginBottom: 2,
  },
  iconWrapCenterFocused: {
    backgroundColor: 'rgba(45, 212, 191, 0.28)',
    borderColor: colors.primarySoft,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  labelCenter: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
