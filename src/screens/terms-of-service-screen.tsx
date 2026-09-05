import { ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenHeader } from '../components/premium/premium-ui';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { LEGAL_LAST_UPDATED, TERMS_OF_SERVICE_SECTIONS } from '../constants/legal-content';
import { layout, spacing } from '../constants/theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'TermsOfService'>;

export function TermsOfServiceScreen({ navigation }: Props) {
  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          onBack={() => navigation.goBack()}
          eyebrow="Legal"
          title="Terms of Service"
          subtitle={`Last updated ${LEGAL_LAST_UPDATED}`}
        />
        {TERMS_OF_SERVICE_SECTIONS.map((section) => (
          <GlassCard key={section.title} style={styles.card}>
            <VoxaText variant="subtitle">{section.title}</VoxaText>
            <VoxaText variant="body" color="textSecondary">
              {section.body}
            </VoxaText>
          </GlassCard>
        ))}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: layout.screenPadding,
    paddingBottom: spacing.xxl,
    gap: spacing.md12,
  },
  card: { gap: spacing.sm },
});
