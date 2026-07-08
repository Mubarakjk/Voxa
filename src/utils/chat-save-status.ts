let lastChatSaveStatus = 'Not saved yet';
let lastChatSaveAt: string | null = null;

export function recordChatSaveSuccess(label = 'OK') {
  lastChatSaveStatus = label;
  lastChatSaveAt = new Date().toISOString();
}

export function recordChatSaveFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  lastChatSaveStatus = `Failed · ${message.slice(0, 80)}`;
  lastChatSaveAt = new Date().toISOString();
}

export function getChatSaveSnapshot() {
  return {
    status: lastChatSaveStatus,
    at: lastChatSaveAt,
  };
}
