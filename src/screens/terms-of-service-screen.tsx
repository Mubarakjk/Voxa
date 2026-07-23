import { ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenHeader } from '../components/premium/premium-ui';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { layout, spacing } from '../constants/theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'TermsOfService'>;

const SECTIONS: Array<{ title: string; body: string }> = [
  {
    title: 'Agreement',
    body: 'By using Voxa you agree to these Terms. If you do not agree, do not use the app. Operator details and a public Terms URL must be finalised before App Store submission.',
  },
  {
    title: 'The service',
    body: 'Voxa is a personal AI companion for conversation, reflection, optional weather, optional nutrition tracking, and local social games. Features may change as we improve the product.',
  },
  {
    title: 'Not medical or emergency advice',
    body: 'Voxa is not a doctor, therapist, or emergency service. Nutrition tools are general wellbeing trackers, not clinical care. If you are in danger or crisis, contact local emergency services or a trusted helpline.',
  },
  {
    title: 'Accounts & subscriptions',
    body: 'You are responsible for your account. Paid plans are billed through Apple or Google. Manage or cancel in your store account settings. Restore purchases is available in the app.',
  },
  {
    title: 'Acceptable use',
    body: 'Do not misuse the service, attempt to extract secrets, harass others, or use Voxa for unlawful activity. We may suspend accounts that violate these Terms.',
  },
  {
    title: 'AI output',
    body: 'AI responses can be wrong. Verify important facts. Voxa must not invent weather, calendar events, calorie logs, or memories — report failures so we can fix them.',
  },
  {
    title: 'Intellectual property',
    body: 'The Voxa app, branding, and original content belong to the operator. You retain rights to content you create, and grant us a licence to process it to provide the service.',
  },
  {
    title: 'Limitation of liability',
    body: 'To the fullest extent permitted by law, Voxa is provided “as is”. We are not liable for indirect or consequential losses arising from use of the app.',
  },
  {
    title: 'Contact',
    body: 'Questions: support@voxa.app (replace with your live support address before submission).',
  },
];

export function TermsOfServiceScreen(_props: Props) {
  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow="Legal"
          title="Terms of Service"
          subtitle="Last updated 23 July 2026. Host a public URL before App Store review."
        />
        {SECTIONS.map((section) => (
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
