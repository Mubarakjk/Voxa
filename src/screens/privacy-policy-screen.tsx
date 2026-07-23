import { ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenHeader } from '../components/premium/premium-ui';
import { GlassCard } from '../components/ui/glass-card';
import { ScreenShell } from '../components/ui/screen-shell';
import { VoxaText } from '../components/ui/voxa-text';
import { layout, spacing } from '../constants/theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyPolicy'>;

const SECTIONS: Array<{ title: string; body: string }> = [
  {
    title: 'Who we are',
    body: 'Voxa (“we”) provides a personal AI companion app. This policy explains what data we collect, why, and the choices you have. Contact: support@voxa.app (replace with your live support address before App Store submission).',
  },
  {
    title: 'Data we process',
    body: 'Account details (if you sign in), profile preferences, chat messages, memories you choose to keep, reminders and goals, optional location for weather, optional nutrition entries if you enable calorie tracking, usage and subscription status, and device diagnostics needed to keep the app reliable.',
  },
  {
    title: 'Purposes',
    body: 'We use this data to provide the companion experience, personalise responses, remember what you ask us to remember, show weather when you enable it, process optional wellbeing tracking, manage subscriptions, and improve stability. We do not sell your personal conversations.',
  },
  {
    title: 'AI processing',
    body: 'Messages and relevant context may be sent to our AI providers to generate replies. We instruct the model not to invent weather, calendar events, calorie entries, or memories. Do not share information you are not comfortable processing with AI systems.',
  },
  {
    title: 'Location',
    body: 'Location is optional. You can use device location, choose a city, or skip weather. Precise location is used only to fetch forecasts and is not required to use chat.',
  },
  {
    title: 'Nutrition tracking',
    body: 'Calorie and nutrition features are opt-in wellbeing tools, not medical advice. Entries stay under your control and can be exported or deleted.',
  },
  {
    title: 'Your rights (UK GDPR)',
    body: 'You may request access, correction, export, and deletion of your personal data. Use Export data and Delete account in Settings, or email support. You may also complain to the ICO if you are in the UK.',
  },
  {
    title: 'Retention & security',
    body: 'We keep data only as long as needed for the service or legal obligations. Tokens are stored with platform secure storage where applicable. Access is limited to systems required to run Voxa.',
  },
  {
    title: 'Children',
    body: 'Voxa is not directed at children under 13 (or the minimum age in your region). Do not create an account for a child below that age.',
  },
  {
    title: 'Changes',
    body: 'We may update this policy. Material changes will be reflected in-app with a revised date.',
  },
];

export function PrivacyPolicyScreen(_props: Props) {
  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow="Legal"
          title="Privacy Policy"
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
