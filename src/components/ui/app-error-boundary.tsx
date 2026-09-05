import { Component, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../constants/theme';
import { ErrorState } from './screen-state';

type Props = { children: ReactNode };

type State = {
  hasError: boolean;
  retryKey: number;
};

/**
 * Last-resort render-error recovery. Does not display stacks or PII.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, retryKey: 0 };

  static getDerivedStateFromError(): Pick<State, 'hasError'> {
    return { hasError: true };
  }

  override componentDidCatch() {
    // Intentionally empty: never log user content or stack traces in production UI.
  }

  private handleRetry = () => {
    this.setState((current) => ({ hasError: false, retryKey: current.retryKey + 1 }));
  };

  override render() {
    if (this.state.hasError) {
      return (
        <View style={styles.root}>
          <ErrorState
            title="Something went wrong"
            message="Voxa hit an unexpected problem. Your data is still on this device. Try again to continue."
            onRetry={this.handleRetry}
          />
        </View>
      );
    }

    return <View key={this.state.retryKey} style={styles.root}>{this.props.children}</View>;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
