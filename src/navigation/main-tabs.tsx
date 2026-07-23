import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { isFeatureVisible } from '../config/feature-status';
import { ChatScreen } from '../screens/chat-screen';
import { HomeScreen } from '../screens/home-screen';
import { JourneyScreen } from '../screens/journey-screen';
import { RoutineCoachScreen } from '../screens/routine-coach-screen';
import { VoxaCentreScreen } from '../screens/voxa-centre-screen';
import { YouScreen } from '../screens/you-screen';
import { MainTabParamList } from './types';
import { PremiumTabBar } from './premium-tab-bar';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  const showVoxaTab = isFeatureVisible('voiceCall');

  return (
    <Tab.Navigator
      tabBar={(props) => <PremiumTabBar {...props} experimental={showVoxaTab} />}
      screenOptions={{ headerShown: false, lazy: true }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Talk" component={ChatScreen} />
      {showVoxaTab ? (
        <Tab.Screen name="Voxa" component={VoxaCentreScreen} />
      ) : (
        <Tab.Screen name="Routine" component={RoutineCoachScreen} />
      )}
      <Tab.Screen name="Journey" component={JourneyScreen} />
      <Tab.Screen name="You" component={YouScreen} />
    </Tab.Navigator>
  );
}
