import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorState, LoadingState } from './src/components/ui/screen-state';
import { colors } from './src/constants/theme';
import { VoxaProvider, useVoxa } from './src/context/voxa-context';
import { RootNavigator } from './src/navigation/root-navigator';

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
  const { isLoading, error, isReady, reinitialize } = useVoxa();

  if (isLoading) {
    return (
      <View style={styles.boot}>
        <LoadingState label="Starting Voxa..." />
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

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <VoxaProvider>
        <AppRoot />
      </VoxaProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
