export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  MainTabs: { screen?: keyof MainTabParamList } | undefined;
  CreateReminder: { presetKind?: import('../types').ReminderKind } | undefined;
  CreateGoal: undefined;
  Memory: undefined;
  Music: undefined;
  CompanionCustomisation: undefined;
  CompanionStudio: undefined;
  CompanionStudioVoice: undefined;
  CompanionStudioPersonality: undefined;
  CompanionStudioAppearance: undefined;
  CompanionStudioExtended: undefined;
  Features: undefined;
  Paywall: { source?: string } | undefined;
  VoiceCall: undefined;
  SafeCall: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Talk: undefined;
  Voxa: { action?: 'voice' | 'safe' | 'music' } | undefined;
  Journey: undefined;
  You: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
