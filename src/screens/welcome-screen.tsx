import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '../components/ui/buttons';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { VoiceOrb } from '../components/ui/voice-orb';
import { colors, layout, spacing } from '../constants/theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <ScreenShell padded={false}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <VoxaText variant="label" color="primarySoft" style={styles.label}>
            Welcome
          </VoxaText>
          <VoxaText variant="hero" style={styles.title}>
            Voxa
          </VoxaText>
          <View style={styles.divider} />
          <VoxaText variant="subtitle" color="textSecondary" style={styles.tagline}>
            Your AI companion for life.
          </VoxaText>
          <View style={styles.orb}>
            <VoiceOrb size={160} />
          </View>
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            label="Enter Voxa"
            icon="arrow-forward"
            onPress={() => navigation.replace('MainTabs')}
          />
          <VoxaText variant="caption" color="textMuted" style={styles.note}>
            Private · Emotional · Always present
          </VoxaText>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: layout.screenPadding + 8,
    paddingBottom: spacing.xxl,
    justifyContent: 'space-between',
  },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl },
  label: { marginBottom: spacing.md },
  title: { textAlign: 'center' },
  divider: { width: 48, height: 1, backgroundColor: colors.glassBorder, marginVertical: spacing.lg },
  tagline: { textAlign: 'center', maxWidth: 280 },
  orb: { marginTop: spacing.xxl },
  footer: { gap: spacing.md, alignItems: 'center' },
  note: { textAlign: 'center' },
});
