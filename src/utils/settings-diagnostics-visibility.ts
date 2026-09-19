/** You/Settings Diagnostics toggle + panel — development builds only. */
export function shouldShowSettingsDiagnosticsEntry(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}
