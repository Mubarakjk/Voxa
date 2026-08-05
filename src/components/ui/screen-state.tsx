import { StyleSheet, View } from 'react-native';

import { LoadingPulse } from '../premium/premium-ui';
import { PrimaryButton } from './buttons';
import { VoxaText } from './voxa-text';
import { spacing } from '../../constants/theme';

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return <LoadingPulse label={label} />;
}

export function ErrorState({
  message,
  onRetry,
  title = 'Something went wrong',
}: {
  message: string;
  onRetry?: () => void;
  title?: string;
}) {
  const displayMessage =
    __DEV__ ||
    (!message.includes('Error') && !message.includes('TypeError') && !message.includes('undefined'))
      ? message
      : 'Please check your connection and try again.';

  return (
    <View style={styles.center} accessibilityRole="alert">
      <VoxaText variant="subtitle" style={styles.errorTitle}>
        {title}
      </VoxaText>
      <VoxaText variant="body" color="textSecondary" style={styles.errorMessage}>
        {displayMessage}
      </VoxaText>
      {onRetry ? <PrimaryButton label="Try again" variant="ghost" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  errorTitle: { textAlign: 'center' },
  errorMessage: { textAlign: 'center', lineHeight: 22 },
});
