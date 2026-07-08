import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorState, LoadingState } from './src/components/ui/screen-state';
import { colors } from './src/constants/theme';
import { hasSupabaseConfig } from './src/config/env';
import { AuthProvider, useAuth } from './src/context/auth-context';
import { VoxaProvider, useVoxa } from './src/context/voxa-context';
import { AuthNavigator } from './src/navigation/auth-navigator';
import { RootNavigator } from './src/navigation/root-navigator';
import { OnboardingScreen } from './src/screens/onboarding-screen';

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.tabBar,
    border: colors.glassBorder,
    primary: colors.primary,
    text: colors.text,
  },
};

function AppRoot() {
  const { isLoading, error, isReady, reinitialize, profile } = useVoxa();
  const [onboardingDone, setOnboardingDone] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.boot}>
        <LoadingState label={hasSupabaseConfig() ? 'Syncing your companion...' : 'Starting Voxa...'} />
      </View>
    );
  }

  if (error || !isReady) {
    return (
      <View style={styles.boot}>
        <ErrorState message={error ?? 'Unable to start Voxa.'} onRetry={reinitialize} />
      </View>
    );
  }

  if (profile && !profile.onboardingComplete && !onboardingDone) {
    return (
      <View style={styles.boot}>
        <StatusBar style="light" />
        <OnboardingScreen onComplete={() => setOnboardingDone(true)} />
      </View>
    );
  }

  const initialRoute = hasSupabaseConfig() ? 'MainTabs' : 'Welcome';

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <RootNavigator initialRouteName={initialRoute} />
    </NavigationContainer>
  );
}

function AuthenticatedApp() {
  const auth = useAuth();
  const sessionKey = auth.session?.user.id ?? 'local';

  return (
    <VoxaProvider key={sessionKey}>
      <AppRoot />
    </VoxaProvider>
  );
}

function AppGate() {
  const auth = useAuth();

  if (auth.isAuthEnabled && auth.isLoading) {
    return (
      <View style={styles.boot}>
        <LoadingState label="Restoring session..." />
      </View>
    );
  }

  if (auth.isAuthEnabled && !auth.session) {
    return (
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" />
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppGate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
