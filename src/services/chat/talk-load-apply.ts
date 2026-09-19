/**
 * Guards Talk message reloads so a stale loadChat cannot wipe an in-flight
 * or just-completed send (user turn with no assistant reply).
 */

export function shouldApplyTalkMessageLoad(input: {
  loadSeq: number;
  currentLoadSeq: number;
  sendEpochAtLoadStart: number;
  currentSendEpoch: number;
  sendInFlight: boolean;
}): boolean {
  if (input.loadSeq !== input.currentLoadSeq) return false;
  if (input.sendEpochAtLoadStart !== input.currentSendEpoch) return false;
  if (input.sendInFlight) return false;
  return true;
}
