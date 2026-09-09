import { Share } from 'react-native';

import { sharePayloadForMessage } from '../services/chat/message-actions';

/**
 * No clipboard package is installed. Share is the native path for handing
 * message text to the system. Do not label this "Copy".
 */
export async function shareMessageText(text: string): Promise<void> {
  await Share.share(sharePayloadForMessage(text));
}
