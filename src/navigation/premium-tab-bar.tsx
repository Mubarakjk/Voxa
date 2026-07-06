import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, radius } from '../constants/theme';
import { VoxaText } from '../components/ui/voxa-text';

const TAB_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  Home: { icon: 'home', label: 'Home' },
  Chat: { icon: 'chatbubbles', label: 'Chat' },
  Voice: { icon: 'radio', label: 'Voice' },
  Safe: { icon: 'shield-checkmark', label: 'Safe' },
  Settings: { icon: 'settings', label: 'Settings' },
};

export function PremiumTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const config = TAB_CONFIG[route.name] ?? { icon: 'ellipse', label: route.name };

          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={[styles.tab, focused && styles.tabFocused]}>
              <Ionicons
                name={config.icon}
                size={22}
                color={focused ? colors.primarySoft : colors.textMuted}
              />
              <VoxaText
                variant="caption"
                color={focused ? 'primarySoft' : 'textMuted'}
                style={styles.label}>
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
    paddingHorizontal: layout.screenPadding - 4,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radius.md,
    gap: 4,
  },
  tabFocused: {
    backgroundColor: 'rgba(139, 124, 246, 0.12)',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
