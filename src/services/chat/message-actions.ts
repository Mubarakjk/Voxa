export type MessageActionId =
  | 'copy'
  | 'edit'
  | 'select_text'
  | 'share'
  | 'speak'
  | 'remember'
  | 'bookmark'
  | 'delete'
  | 'save_photo'
  | 'save_voice'
  | 'copy_transcript';

export type MessageActionRole = 'user' | 'voxa';

/** Safe V1 semantics: populate composer and send a new continuation. Never mutate history on Edit. */
export const EDIT_SEMANTICS = 'edit_and_resend' as const;

export type ComposerEditState = {
  messageId: string;
  originalText: string;
  draftBeforeEdit: string;
};

export function userMessageActions(): MessageActionId[] {
  return ['edit', 'select_text', 'share'];
}

export function voxaMessageActions(options?: { canSpeak?: boolean }): MessageActionId[] {
  const actions: MessageActionId[] = ['select_text'];
  if (options?.canSpeak !== false) actions.push('speak');
  actions.push('share');
  return actions;
}

/** No clipboard API is in the dependency set; do not label Share as Copy. */
export function copyActionCopiesImmediately(): false {
  return false;
}

export function messageActionsForRole(
  role: MessageActionRole,
  options?: { canSpeak?: boolean },
): MessageActionId[] {
  return role === 'user' ? userMessageActions() : voxaMessageActions(options);
}

export function sharePayloadForMessage(text: string): { message: string } {
  return { message: text };
}

export function beginComposerEdit(input: {
  messageId: string;
  messageText: string;
  currentComposer: string;
}): ComposerEditState {
  return {
    messageId: input.messageId,
    originalText: input.messageText,
    draftBeforeEdit: input.currentComposer,
  };
}

export function cancelComposerEdit(state: ComposerEditState): { composer: string } {
  return { composer: state.draftBeforeEdit };
}

export function editMutatesHistoryImmediately(): false {
  return false;
}

export function emptyEditMaySend(text: string): boolean {
  return text.trim().length > 0;
}

export function shouldCloseMessageActionMenu(
  event: 'outside_press' | 'action_selected' | 'scroll_begin',
): boolean {
  return event === 'outside_press' || event === 'action_selected';
}

export function speakActionReusesExistingSpeechPath(): true {
  return true;
}

export function regenerateIsSafeForV1(): false {
  return false;
}
