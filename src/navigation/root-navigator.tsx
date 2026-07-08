import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CompanionStudioAppearanceScreen } from '../screens/companion-studio-appearance-screen';
import { CompanionStudioExtendedScreen } from '../screens/companion-studio-extended-screen';
import { CompanionStudioPersonalityScreen } from '../screens/companion-studio-personality-screen';
import { CompanionStudioScreen } from '../screens/companion-studio-screen';
import { CompanionStudioVoiceScreen } from '../screens/companion-studio-voice-screen';
import { CreateGoalScreen } from '../screens/create-goal-screen';
import { CreateReminderScreen } from '../screens/create-reminder-screen';
import { FeaturesScreen } from '../screens/features-screen';
import { MemoryScreen } from '../screens/memory-screen';
import { MusicScreen } from '../screens/music-screen';
import { PaywallScreenRoute } from '../screens/paywall-screen';
import { SafeCallScreen } from '../screens/safe-call-screen';
import { VoiceCallScreen } from '../screens/voice-call-screen';
import { WelcomeScreen } from '../screens/welcome-screen';
import { MainTabNavigator } from './main-tabs';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

type Props = {
  initialRouteName?: keyof RootStackParamList;
};

export function RootNavigator({ initialRouteName = 'Welcome' }: Props) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen
        name="CreateReminder"
        component={CreateReminderScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="CreateGoal"
        component={CreateGoalScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="Memory" component={MemoryScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Music" component={MusicScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen
        name="CompanionCustomisation"
        component={CompanionStudioScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="CompanionStudio"
        component={CompanionStudioScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="CompanionStudioVoice"
        component={CompanionStudioVoiceScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="CompanionStudioPersonality"
        component={CompanionStudioPersonalityScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="CompanionStudioAppearance"
        component={CompanionStudioAppearanceScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="CompanionStudioExtended"
        component={CompanionStudioExtendedScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen name="Features" component={FeaturesScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="VoiceCall" component={VoiceCallScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="SafeCall" component={SafeCallScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreenRoute}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}
