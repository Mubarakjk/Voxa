import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthError } from '@supabase/supabase-js';
import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AuthFormField } from '../../components/ui/auth-form-field';
import { PrimaryButton } from '../../components/ui/buttons';
import { GlassCard } from '../../components/ui/glass-card';
import { ScreenShell } from '../../components/ui/screen-shell';
import { VoxaText } from '../../components/ui/voxa-text';
import { VoiceOrb } from '../../components/ui/voice-orb';
import { colors, layout, spacing } from '../../constants/theme';
import { useAuth } from '../../context/auth-context';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  const submit = async () => {
    if (submitLockRef.current || isSubmitting) return;
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    submitLockRef.current = true;
    setError(null);
    setIsSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
    } catch (err) {
      const message =
        err instanceof AuthError
          ? [err.message, err.status ? `Status: ${err.status}` : ''].filter(Boolean).join('\n')
          : err instanceof Error
            ? err.message
            : 'Unable to sign in.';
      setError(message);
      Alert.alert('Sign in failed', message);
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenShell padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <VoiceOrb size={120} />
          <VoxaText variant="title" style={styles.title}>
            Welcome back
          </VoxaText>
          <VoxaText variant="body" color="textSecondary" style={styles.subtitle}>
            Sign in to continue with Voxa.
          </VoxaText>
        </View>

        <GlassCard style={styles.form}>
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
            autoComplete="password"
            placeholder="Your password"
            editable={!isSubmitting}
          />
          {error ? (
            <VoxaText variant="caption" color="danger">
              {error}
            </VoxaText>
          ) : null}
          <PrimaryButton
            label={isSubmitting ? 'Signing in...' : 'Sign in'}
            onPress={submit}
            disabled={isSubmitting}
            loading={isSubmitting}
          />
          <Pressable onPress={() => navigation.navigate('ForgotPassword')} disabled={isSubmitting}>
            <VoxaText variant="caption" color="primarySoft" style={styles.link}>
              Forgot password?
            </VoxaText>
          </Pressable>
        </GlassCard>

        <View style={styles.footer}>
          <VoxaText variant="caption" color="textMuted">
            New to Voxa?
          </VoxaText>
          <Pressable onPress={() => navigation.navigate('SignUp')}>
            <VoxaText variant="caption" color="primarySoft">
              Create an account
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
    paddingBottom: spacing.xxl,
    justifyContent: 'center',
    gap: spacing.xl,
  },
  hero: { alignItems: 'center', gap: spacing.md },
  title: { marginTop: spacing.md },
  subtitle: { textAlign: 'center', maxWidth: 280 },
  form: { gap: spacing.lg },
  link: { textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
});
