import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { isExperimentalFeaturesEnabled } from '../config/feature-status';
import {
  isLiveCallingUiEnabled,
  isScheduledCallsEnabled,
} from '../config/release-voice';
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
import { RealtimeCallScreen } from '../screens/realtime-call-screen';
import { WelcomeScreen } from '../screens/welcome-screen';
import { WeeklyRecapScreen } from '../screens/weekly-recap-screen';
import { HealthCheckScreen } from '../screens/health-check-screen';
import { VoiceNoteRecorderDiagnosticScreen } from '../screens/voice-note-recorder-diagnostic-screen';
import { BillingQAScreen } from '../screens/billing-qa-screen';
import { LifeOSHubScreen } from '../screens/life-os-hub-screen';
import { LifeTimelineScreen } from '../screens/life-timeline-screen';
import { GoalDetailScreen } from '../screens/goal-detail-screen';
import { FutureSelfScreen } from '../screens/future-self-screen';
import { VisionBoardScreen } from '../screens/vision-board-screen';
import { BucketListScreen } from '../screens/bucket-list-screen';
import { DreamJournalScreen } from '../screens/dream-journal-screen';
import { DecisionSimulatorScreen } from '../screens/decision-simulator-screen';
import { DebateModeScreen } from '../screens/debate-mode-screen';
import { CoachScoreScreen } from '../screens/coach-score-screen';
import { MemoryConnectionsScreen } from '../screens/memory-connections-screen';
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
import { ScheduledCallsScreen } from '../screens/scheduled-calls-screen';
import { ScheduleCompanionCallScreen } from '../screens/schedule-companion-call-screen';
import { ProactiveCheckInsScreen } from '../screens/proactive-check-ins-screen';
import { WeeklyLetterScreen } from '../screens/weekly-letter-screen';
import { PhotoMemoriesScreen } from '../screens/photo-memories-screen';
import { MoodJournalScreen } from '../screens/mood-journal-screen';
import { MoodTimelineScreen } from '../screens/mood-timeline-screen';
import { VoiceConversationScreen } from '../screens/voice-conversation-screen';
import { DailyReflectionScreen } from '../screens/daily-reflection-screen';
import { RelationshipGrowthScreen } from '../screens/relationship-growth-screen';
import { RoutineCoachScreen } from '../screens/routine-coach-screen';
import { WeatherLocationSetupScreen } from '../screens/weather-location-setup-screen';
import { CoachingHubScreen } from '../screens/coaching-hub-screen';
import { ConversationWorldsScreen } from '../screens/conversation-worlds-screen';
import { RelationshipTimelineScreen } from '../screens/relationship-timeline-screen';
import { CompanionChallengesScreen } from '../screens/companion-challenges-screen';
import { GiftsCollectionScreen } from '../screens/gifts-collection-screen';
import { DailyNewsScreen } from '../screens/daily-news-screen';
import { PrivacyPolicyScreen } from '../screens/privacy-policy-screen';
import { TermsOfServiceScreen } from '../screens/terms-of-service-screen';
import { NutritionOnboardingScreen } from '../screens/nutrition-onboarding-screen';
import { NutritionAddMealScreen } from '../screens/nutrition-add-meal-screen';
import { NutritionHistoryScreen } from '../screens/nutrition-history-screen';
import { NutritionSettingsScreen } from '../screens/nutrition-settings-screen';
import { NotesHubScreen } from '../screens/notes-hub-screen';
import { VoicePickerScreen } from '../screens/voice-picker-screen';
import { MainTabNavigator } from './main-tabs';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

type Props = {
  initialRouteName?: keyof RootStackParamList;
};

export function RootNavigator({ initialRouteName = 'Welcome' }: Props) {
  const experimental = isExperimentalFeaturesEnabled();
  const liveCalling = isLiveCallingUiEnabled();
  const scheduledCalls = isScheduledCallsEnabled();

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
      {liveCalling ? (
        <Stack.Screen
          name="RealtimeCall"
          component={RealtimeCallScreen}
          options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
        />
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
      <Stack.Screen name="LifeTimeline" component={LifeTimelineScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="GoalDetail" component={GoalDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="FutureSelf" component={FutureSelfScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="VisionBoard" component={VisionBoardScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="BucketList" component={BucketListScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="DreamJournal" component={DreamJournalScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="DecisionSimulator" component={DecisionSimulatorScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="DebateMode" component={DebateModeScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CoachScore" component={CoachScoreScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="MemoryConnections" component={MemoryConnectionsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen
        name="LifeBook"
        getComponent={() => require('../screens/life-book-screen').LifeBookScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="MemoryMovie"
        getComponent={() => require('../screens/memory-movie-screen').MemoryMovieScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen name="RelationshipProfile" component={RelationshipProfileScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Activities" component={ActivitiesScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="FeatureDiscovery" component={FeatureDiscoveryScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="MonthlyReplay" component={MonthlyReplayScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="SharedChallenges" component={SharedChallengesScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="FocusMode" component={FocusModeScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CompanionArcade" component={CompanionArcadeScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen
        name="GamesHub"
        getComponent={() => require('../screens/games-hub-screen').GamesHubScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ImpostorGame"
        getComponent={() => require('../screens/impostor-game-screen').ImpostorGameScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="MafiaGame"
        getComponent={() => require('../screens/mafia-game-screen').MafiaGameScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PartyGame"
        getComponent={() => require('../screens/party-game-screen').PartyGameScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen name="AchievementCentre" component={AchievementCentreScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ConversationDecks" component={ConversationDecksScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="DailySpin" component={DailySpinScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="DailyChallenge" component={DailyChallengeScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="WeeklyMission" component={WeeklyMissionScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ArcadeGameSession" component={ArcadeGameSessionScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ScheduledCheckIns" component={ScheduledCheckInsScreen} options={{ animation: 'slide_from_right' }} />
      {scheduledCalls ? (
        <>
          <Stack.Screen name="ScheduledCalls" component={ScheduledCallsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ScheduleCompanionCall" component={ScheduleCompanionCallScreen} options={{ animation: 'slide_from_right' }} />
        </>
      ) : null}
      <Stack.Screen name="ProactiveCheckIns" component={ProactiveCheckInsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="WeeklyLetter" component={WeeklyLetterScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="PhotoMemories" component={PhotoMemoriesScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="MoodJournal" component={MoodJournalScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="MoodTimeline" component={MoodTimelineScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="DailyReflection" component={DailyReflectionScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="RelationshipGrowth" component={RelationshipGrowthScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen
        name="RoutineCoach"
        component={RoutineCoachScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="MyCompanion"
        getComponent={() => require('../screens/my-companion-screen').MyCompanionScreen}
        options={{ animation: 'slide_from_right' }}
      />
      {(liveCalling || experimental) ? (
        <Stack.Screen
          name="VoiceConversation"
          component={VoiceConversationScreen}
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
      ) : null}
      <Stack.Screen name="CoachingHub" component={CoachingHubScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ConversationWorlds" component={ConversationWorldsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="RelationshipTimeline" component={RelationshipTimelineScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CompanionChallenges" component={CompanionChallengesScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="GiftsCollection" component={GiftsCollectionScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="DailyNews" component={DailyNewsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="WeatherLocationSetup" component={WeatherLocationSetupScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="NutritionOnboarding" component={NutritionOnboardingScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen
        name="NutritionDashboard"
        getComponent={() => require('../screens/nutrition-dashboard-screen').NutritionDashboardScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen name="NutritionAddMeal" component={NutritionAddMealScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="NutritionHistory" component={NutritionHistoryScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="NutritionSettings" component={NutritionSettingsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="NotesHub" component={NotesHubScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen
        name="NoteEditor"
        getComponent={() => require('../screens/note-editor-screen').NoteEditorScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen name="VoicePicker" component={VoicePickerScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreenRoute}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}
