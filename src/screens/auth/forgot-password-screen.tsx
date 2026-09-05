import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthFormField } from '../../components/ui/auth-form-field';
import { PrimaryButton } from '../../components/ui/buttons';
import { ScreenShell } from '../../components/ui/screen-shell';
import { VoxaText } from '../../components/ui/voxa-text';
import { layout, spacing } from '../../constants/theme';
import { useAuth } from '../../context/auth-context';
import { AuthStackParamList } from '../../navigation/types';
import { formatAuthUserError } from '../../utils/auth-error-copy';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { resetPassword } = useAuth();
  const insets = useSafeAreaInsets();
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
      setError(formatAuthUserError(err, 'Unable to send reset email. Check your connection and try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenShell padded={false} glow="none">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <VoxaText variant="screenTitle">Reset password</VoxaText>
            <VoxaText variant="supporting" color="textSecondary">
              {sent
                ? 'Check your email for a reset link.'
                : 'Enter your email and we will send a reset link.'}
            </VoxaText>
          </View>

          {!sent ? (
            <View style={styles.form}>
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
            </View>
          ) : (
            <PrimaryButton label="Back to sign in" onPress={() => navigation.navigate('Login')} />
          )}

          <Pressable onPress={() => navigation.goBack()}>
            <VoxaText variant="caption" color="primarySoft" style={styles.link}>
              Back
            </VoxaText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xl,
    gap: spacing.section,
  },
  header: { gap: spacing.sm, alignSelf: 'stretch' },
  form: { gap: spacing.lg, alignSelf: 'stretch', width: '100%' },
  link: { textAlign: 'center' },
});
