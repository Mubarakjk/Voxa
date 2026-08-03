import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { ChatScreen } from '../screens/chat-screen';
import { HomeScreen } from '../screens/home-screen';
import { JourneyScreen } from '../screens/journey-screen';
import { VoxaCentreScreen } from '../screens/voxa-centre-screen';
import { YouScreen } from '../screens/you-screen';
import { MainTabParamList } from './types';
import { PremiumTabBar } from './premium-tab-bar';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Release tabs: Home · Talk · Voxa (companion profile) · Journey · You
 * Live calling UI is gated separately — this tab is never a call console.
 */
export function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <PremiumTabBar {...props} />}
      screenOptions={{ headerShown: false, lazy: true }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Talk" component={ChatScreen} />
      <Tab.Screen name="Voxa" component={VoxaCentreScreen} />
      <Tab.Screen name="Journey" component={JourneyScreen} />
      <Tab.Screen name="You" component={YouScreen} />
    </Tab.Navigator>
  );
}
