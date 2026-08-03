import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { isPaywallEnabled } from '../config/launch-mode';
import { RootStackParamList } from '../navigation/types';

type PaywallNav = Pick<NativeStackNavigationProp<RootStackParamList>, 'navigate'>;

/** No-op when billing UI is disabled for V1 free launch. */
export function navigateToPaywall(
  navigation: PaywallNav,
  _source?: string,
): boolean {
  if (!isPaywallEnabled()) return false;
  navigation.navigate('Paywall', { source: _source ?? 'unknown' });
  return true;
}
