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

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export function SignUpScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  const submit = async () => {
    if (submitLockRef.current || isSubmitting) return;

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
      const message = formatAuthUserError(err, 'Unable to create account. Check your connection and try again.');
      setError(message);
      Alert.alert('Signup failed', message);
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
            <VoxaText variant="screenTitle">Create account</VoxaText>
            <VoxaText variant="supporting" color="textSecondary" style={styles.subtitle}>
              Your companion, synced and secure.
            </VoxaText>
          </View>

          <View style={styles.form}>
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
          </View>

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
  hero: { alignItems: 'center', gap: spacing.md, alignSelf: 'stretch' },
  subtitle: { textAlign: 'center', alignSelf: 'stretch', paddingHorizontal: spacing.sm },
  form: { gap: spacing.lg, alignSelf: 'stretch', width: '100%' },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, flexWrap: 'wrap' },
});
