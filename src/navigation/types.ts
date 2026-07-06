export type RootStackParamList = {
  Welcome: undefined;
  MainTabs: undefined;
  CreateReminder: { presetKind?: import('../types').ReminderKind } | undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Chat: undefined;
  Voice: undefined;
  Safe: undefined;
  Settings: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
