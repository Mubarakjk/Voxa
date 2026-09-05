import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRef, useState } from 'react';
import {
  Alert,
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
import { VoxaOrbMedium } from '../../components/ui/voxa-orb';
import { colors, layout, spacing } from '../../constants/theme';
import { useAuth } from '../../context/auth-context';
import { AuthStackParamList } from '../../navigation/types';
import { formatAuthUserError } from '../../utils/auth-error-copy';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
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
      const message = formatAuthUserError(err, 'Unable to sign in. Check your connection and try again.');
      setError(message);
      Alert.alert('Sign in failed', message);
    } finally {
      submitLockRef.current = false;
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
          <View style={styles.hero}>
            <VoxaOrbMedium tint={colors.primary} active={false} />
            <VoxaText variant="screenTitle" style={styles.title}>
              Welcome back
            </VoxaText>
            <VoxaText variant="supporting" color="textSecondary" style={styles.subtitle}>
              Sign in to continue with Voxa.
            </VoxaText>
          </View>

          <View style={styles.form}>
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
          </View>

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
    justifyContent: 'center',
    gap: spacing.section,
  },
  hero: { alignItems: 'center', gap: spacing.md, alignSelf: 'stretch' },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', alignSelf: 'stretch', paddingHorizontal: spacing.sm },
  form: { gap: spacing.lg, alignSelf: 'stretch', width: '100%' },
  link: { textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, flexWrap: 'wrap' },
});
