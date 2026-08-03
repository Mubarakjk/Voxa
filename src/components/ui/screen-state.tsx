import { StyleSheet, View } from 'react-native';

import { LoadingPulse } from '../premium/premium-ui';
import { PrimaryButton } from './buttons';
import { VoxaText } from './voxa-text';
import { spacing } from '../../constants/theme';

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return <LoadingPulse label={label} />;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <VoxaText variant="subtitle" style={styles.errorTitle}>
        Something went wrong
      </VoxaText>
      <VoxaText variant="body" color="textSecondary" style={styles.errorMessage}>
        {message}
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
