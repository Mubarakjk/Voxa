import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { MainTabParamList, RootStackParamList } from '../navigation/types';

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

/** Routines live on the stack in release (Voxa tab is the companion profile). */
export function navigateToRoutine(navigation: HomeNav) {
  navigation.navigate('RoutineCoach');
}
