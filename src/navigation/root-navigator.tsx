import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CreateReminderScreen } from '../screens/create-reminder-screen';
import { WelcomeScreen } from '../screens/welcome-screen';
import { MainTabNavigator } from './main-tabs';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen
        name="CreateReminder"
        component={CreateReminderScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}
