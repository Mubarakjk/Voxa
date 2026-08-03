import { CommandBarResult } from '../services/life-os/command-bar-service';

/** Looser nav typing so Home (tabs) and stack screens can share one handler. */
type CommandBarNav = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigate: (...args: any[]) => void;
};

export function handleCommandBarResult(navigation: CommandBarNav, result: CommandBarResult) {
  const action = result.action;
  switch (action.type) {
    case 'note':
      navigation.navigate('NoteEditor', { noteId: action.noteId });
      return;
    case 'memory':
      navigation.navigate('Memory');
      return;
    case 'goal':
      navigation.navigate('LifeOSHub');
      return;
    case 'routine':
      navigation.navigate('RoutineCoach');
      return;
    case 'talk':
      navigation.navigate('MainTabs', {
        screen: 'Talk',
        params: action.starter ? { starterPrompt: action.starter } : undefined,
      });
      return;
    case 'route':
      navigation.navigate(action.route);
      return;
    default:
      return;
  }
}
