import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { isExperimentalFeaturesEnabled } from '../config/feature-status';
import { CompanionStudioAppearanceScreen } from '../screens/companion-studio-appearance-screen';
import { CompanionStudioExtendedScreen } from '../screens/companion-studio-extended-screen';
import { CompanionStudioPersonalityScreen } from '../screens/companion-studio-personality-screen';
import { CompanionStudioScreen } from '../screens/companion-studio-screen';
import { CompanionStudioVoiceScreen } from '../screens/companion-studio-voice-screen';
import { ConversationHistoryScreen } from '../screens/conversation-history-screen';
import { DailyCheckInScreen } from '../screens/daily-check-in-screen';
import { CreateGoalScreen } from '../screens/create-goal-screen';
import { CreateReminderScreen } from '../screens/create-reminder-screen';
import { FeaturesScreen } from '../screens/features-screen';
import { MemoryScreen } from '../screens/memory-screen';
import { MusicScreen } from '../screens/music-screen';
import { PaywallScreenRoute } from '../screens/paywall-screen';
import { SafeCallScreen } from '../screens/safe-call-screen';
import { VoiceCallScreen } from '../screens/voice-call-screen';
import { WelcomeScreen } from '../screens/welcome-screen';
import { WeeklyRecapScreen } from '../screens/weekly-recap-screen';
import { HealthCheckScreen } from '../screens/health-check-screen';
import { VoiceNoteRecorderDiagnosticScreen } from '../screens/voice-note-recorder-diagnostic-screen';
import { BillingQAScreen } from '../screens/billing-qa-screen';
import { LifeOSHubScreen } from '../screens/life-os-hub-screen';
import { GoalDetailScreen } from '../screens/goal-detail-screen';
import { FutureSelfScreen } from '../screens/future-self-screen';
import { VisionBoardScreen } from '../screens/vision-board-screen';
import { BucketListScreen } from '../screens/bucket-list-screen';
import { DreamJournalScreen } from '../screens/dream-journal-screen';
import { DecisionSimulatorScreen } from '../screens/decision-simulator-screen';
import { DebateModeScreen } from '../screens/debate-mode-screen';
import { CoachScoreScreen } from '../screens/coach-score-screen';
import { MemoryConnectionsScreen } from '../screens/memory-connections-screen';
import { LifeBookScreen } from '../screens/life-book-screen';
import { MemoryMovieScreen } from '../screens/memory-movie-screen';
import { RelationshipProfileScreen } from '../screens/relationship-profile-screen';
import { ActivitiesScreen } from '../screens/activities-screen';
import { FeatureDiscoveryScreen } from '../screens/feature-discovery-screen';
import { MonthlyReplayScreen } from '../screens/monthly-replay-screen';
import { SharedChallengesScreen } from '../screens/shared-challenges-screen';
import { FocusModeScreen } from '../screens/focus-mode-screen';
import { CompanionArcadeScreen } from '../screens/companion-arcade-screen';
import { AchievementCentreScreen } from '../screens/achievement-centre-screen';
import { ConversationDecksScreen } from '../screens/conversation-decks-screen';
import { DailySpinScreen } from '../screens/daily-spin-screen';
import { DailyChallengeScreen } from '../screens/daily-challenge-screen';
import { WeeklyMissionScreen } from '../screens/weekly-mission-screen';
import { ArcadeGameSessionScreen } from '../screens/arcade-game-session-screen';
import { ScheduledCheckInsScreen } from '../screens/scheduled-check-ins-screen';
import { ProactiveCheckInsScreen } from '../screens/proactive-check-ins-screen';
import { WeeklyLetterScreen } from '../screens/weekly-letter-screen';
import { PhotoMemoriesScreen } from '../screens/photo-memories-screen';
import { MoodJournalScreen } from '../screens/mood-journal-screen';
import { MoodTimelineScreen } from '../screens/mood-timeline-screen';
import { VoiceConversationScreen } from '../screens/voice-conversation-screen';
import { DailyReflectionScreen } from '../screens/daily-reflection-screen';
import { RelationshipGrowthScreen } from '../screens/relationship-growth-screen';
import { WeatherLocationSetupScreen } from '../screens/weather-location-setup-screen';
import { CoachingHubScreen } from '../screens/coaching-hub-screen';
import { ConversationWorldsScreen } from '../screens/conversation-worlds-screen';
import { RelationshipTimelineScreen } from '../screens/relationship-timeline-screen';
import { CompanionChallengesScreen } from '../screens/companion-challenges-screen';
import { GiftsCollectionScreen } from '../screens/gifts-collection-screen';
import { DailyNewsScreen } from '../screens/daily-news-screen';
import { MainTabNavigator } from './main-tabs';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

type Props = {
  initialRouteName?: keyof RootStackParamList;
};

export function RootNavigator({ initialRouteName = 'Welcome' }: Props) {
  const experimental = isExperimentalFeaturesEnabled();

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
      <Stack.Screen
        name="ConversationHistory"
        component={ConversationHistoryScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="DailyCheckIn"
        component={DailyCheckInScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="WeeklyRecap"
        component={WeeklyRecapScreen}
        options={{ animation: 'slide_from_right' }}
      />
      {experimental ? (
        <>
          <Stack.Screen name="Music" component={MusicScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="VoiceCall" component={VoiceCallScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="SafeCall" component={SafeCallScreen} options={{ animation: 'slide_from_right' }} />
        </>
      ) : null}
      <Stack.Screen
        name="HealthCheck"
        component={HealthCheckScreen}
        options={{ animation: 'slide_from_right' }}
      />
      {__DEV__ ? (
        <Stack.Screen
          name="VoiceNoteRecorderDiagnostic"
          component={VoiceNoteRecorderDiagnosticScreen}
          options={{ animation: 'slide_from_right' }}
        />
      ) : null}
      {__DEV__ ? (
        <Stack.Screen
          name="BillingQA"
          component={BillingQAScreen}
          options={{ animation: 'slide_from_right' }}
        />
      ) : null}
      <Stack.Screen name="LifeOSHub" component={LifeOSHubScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="GoalDetail" component={GoalDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="FutureSelf" component={FutureSelfScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="VisionBoard" component={VisionBoardScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="BucketList" component={BucketListScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="DreamJournal" component={DreamJournalScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="DecisionSimulator" component={DecisionSimulatorScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="DebateMode" component={DebateModeScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CoachScore" component={CoachScoreScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="MemoryConnections" component={MemoryConnectionsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="LifeBook" component={LifeBookScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="MemoryMovie" component={MemoryMovieScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="RelationshipProfile" component={RelationshipProfileScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Activities" component={ActivitiesScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="FeatureDiscovery" component={FeatureDiscoveryScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="MonthlyReplay" component={MonthlyReplayScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="SharedChallenges" component={SharedChallengesScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="FocusMode" component={FocusModeScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CompanionArcade" component={CompanionArcadeScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="AchievementCentre" component={AchievementCentreScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ConversationDecks" component={ConversationDecksScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="DailySpin" component={DailySpinScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="DailyChallenge" component={DailyChallengeScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="WeeklyMission" component={WeeklyMissionScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ArcadeGameSession" component={ArcadeGameSessionScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ScheduledCheckIns" component={ScheduledCheckInsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ProactiveCheckIns" component={ProactiveCheckInsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="WeeklyLetter" component={WeeklyLetterScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="PhotoMemories" component={PhotoMemoriesScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="MoodJournal" component={MoodJournalScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="MoodTimeline" component={MoodTimelineScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="DailyReflection" component={DailyReflectionScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="RelationshipGrowth" component={RelationshipGrowthScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen
        name="VoiceConversation"
        component={VoiceConversationScreen}
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="CoachingHub" component={CoachingHubScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ConversationWorlds" component={ConversationWorldsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="RelationshipTimeline" component={RelationshipTimelineScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CompanionChallenges" component={CompanionChallengesScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="GiftsCollection" component={GiftsCollectionScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="DailyNews" component={DailyNewsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="WeatherLocationSetup" component={WeatherLocationSetupScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreenRoute}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}
