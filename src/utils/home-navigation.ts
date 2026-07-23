import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { isExperimentalFeaturesEnabled } from '../config/feature-status';
import { MainTabParamList, RootStackParamList } from '../navigation/types';

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function navigateToRoutine(navigation: HomeNav) {
  if (isExperimentalFeaturesEnabled()) {
    navigation.navigate('Journey');
    return;
  }
  navigation.navigate('Routine');
}
