import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthError } from '@supabase/supabase-js';
import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AuthFormField } from '../../components/ui/auth-form-field';
import { PrimaryButton } from '../../components/ui/buttons';
import { GlassCard } from '../../components/ui/glass-card';
import { ScreenShell } from '../../components/ui/screen-shell';
import { VoxaText } from '../../components/ui/voxa-text';
import { layout, spacing } from '../../constants/theme';
import { useAuth } from '../../context/auth-context';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

function formatSignupError(error: unknown): string {
  if (error instanceof AuthError) {
    const parts = [error.message];
    if (error.status) parts.push(`Status: ${error.status}`);
    if (error.code) parts.push(`Code: ${error.code}`);
    if (/rate limit/i.test(error.message)) {
      parts.push(
        'Supabase limits auth emails on the free tier. If you only tapped once, wait ~1 hour or disable "Confirm email" in Supabase → Authentication → Providers → Email for development.',
      );
    }
    return parts.join('\n');
  }
  if (error instanceof Error) return error.message;
  return 'Unable to create account.';
}

export function SignUpScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  const submit = async () => {
    if (submitLockRef.current || isSubmitting) {
      console.warn('[SignUpScreen] submit ignored — already submitting');
      return;
    }

    if (!displayName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    submitLockRef.current = true;
    setError(null);
    setIsSubmitting(true);

    try {
      await signUp({ displayName: displayName.trim(), email: email.trim(), password });
    } catch (err) {
      const message = formatSignupError(err);
      if (err instanceof AuthError) {
        console.error('[SignUpScreen] SIGNUP ERROR', {
          status: err.status,
          code: err.code ?? err.name,
          message: err.message,
        });
      } else {
        console.error('[SignUpScreen] SIGNUP ERROR', err);
      }
      setError(message);
      Alert.alert('Signup failed', message);
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <VoxaText variant="title">Create account</VoxaText>
          <VoxaText variant="body" color="textSecondary">
            Your companion, synced and secure.
          </VoxaText>
        </View>

        <GlassCard style={styles.form}>
          <AuthFormField
            label="Name"
            value={displayName}
            onChangeText={setDisplayName}
            autoComplete="name"
            placeholder="What should Voxa call you?"
            editable={!isSubmitting}
          />
          <AuthFormField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@example.com"
            editable={!isSubmitting}
          />
          <AuthFormField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            placeholder="At least 6 characters"
            editable={!isSubmitting}
          />
          {error ? (
            <VoxaText variant="caption" color="danger">
              {error}
            </VoxaText>
          ) : null}
          <PrimaryButton
            label={isSubmitting ? 'Creating...' : 'Create account'}
            onPress={submit}
            disabled={isSubmitting}
            loading={isSubmitting}
          />
        </GlassCard>

        <View style={styles.footer}>
          <VoxaText variant="caption" color="textMuted">
            Already have an account?
          </VoxaText>
          <Pressable onPress={() => navigation.navigate('Login')} disabled={isSubmitting}>
            <VoxaText variant="caption" color="primarySoft">
              Sign in
            </VoxaText>
          </Pressable>
        </View>
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
  footer: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
});
