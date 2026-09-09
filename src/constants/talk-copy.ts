/** ASCII-only Talk composer copy. Avoid smart punctuation in this file. */

export function talkComposerPlaceholder(voxaName: string): string {
  return `Message ${voxaName}...`;
}

export function talkComposerEditPlaceholder(): string {
  return 'Edit your message...';
}

export const TALK_EDIT_BANNER = 'Editing message - send to continue from here';

export function containsReplacementChar(text: string): boolean {
  return text.includes('\uFFFD') || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/.test(text);
}
