import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ScreenShell } from '../ui/screen-shell';
import { VoxaText } from '../ui/voxa-text';
import { colors, layout, spacing } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/types';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  disclaimer?: string;
};

export function LifeOSScreenShell({ title, subtitle, children, disclaimer }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={colors.primarySoft} />
          <VoxaText variant="caption" color="primarySoft">
            Back
          </VoxaText>
        </Pressable>

        <VoxaText variant="title">{title}</VoxaText>
        {subtitle ? (
          <VoxaText variant="body" color="textSecondary" style={styles.subtitle}>
            {subtitle}
          </VoxaText>
        ) : null}
        {disclaimer ? (
          <View style={styles.disclaimer}>
            <VoxaText variant="caption" color="textMuted">
              {disclaimer}
            </VoxaText>
          </View>
        ) : null}
        {children}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: layout.screenPadding,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.sm,
  },
  disclaimer: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
});
