import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { ChatScreen } from '../screens/chat-screen';
import { HomeScreen } from '../screens/home-screen';
import { SafeCallScreen } from '../screens/safe-call-screen';
import { SettingsScreen } from '../screens/settings-screen';
import { VoiceCallScreen } from '../screens/voice-call-screen';
import { MainTabParamList } from './types';
import { PremiumTabBar } from './premium-tab-bar';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <PremiumTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Voice" component={VoiceCallScreen} />
      <Tab.Screen name="Safe" component={SafeCallScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
