import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AuthFormField } from '../../components/ui/auth-form-field';
import { PrimaryButton } from '../../components/ui/buttons';
import { GlassCard } from '../../components/ui/glass-card';
import { ScreenShell } from '../../components/ui/screen-shell';
import { VoxaText } from '../../components/ui/voxa-text';
import { layout, spacing } from '../../constants/theme';
import { useAuth } from '../../context/auth-context';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <VoxaText variant="title">Reset password</VoxaText>
          <VoxaText variant="body" color="textSecondary">
            {sent
              ? 'Check your email for a reset link.'
              : 'Enter your email and we will send a reset link.'}
          </VoxaText>
        </View>

        {!sent ? (
          <GlassCard style={styles.form}>
            <AuthFormField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="you@example.com"
            />
            {error ? (
              <VoxaText variant="caption" color="danger">
                {error}
              </VoxaText>
            ) : null}
            <PrimaryButton label={isSubmitting ? 'Sending...' : 'Send reset link'} onPress={submit} />
          </GlassCard>
        ) : (
          <PrimaryButton label="Back to sign in" onPress={() => navigation.navigate('Login')} />
        )}

        <Pressable onPress={() => navigation.goBack()}>
          <VoxaText variant="caption" color="primarySoft" style={styles.link}>
            Back
          </VoxaText>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.xxl,
    gap: spacing.xl,
  },
  header: { gap: spacing.sm },
  form: { gap: spacing.lg },
  link: { textAlign: 'center' },
});
