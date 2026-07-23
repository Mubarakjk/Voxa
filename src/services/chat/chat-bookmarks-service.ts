import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@voxa/chat_bookmarks';

export type ChatBookmark = {
  messageId: string;
  conversationId: string;
  text: string;
  role: 'user' | 'voxa';
  savedAt: string;
};

export async function listBookmarks(): Promise<ChatBookmark[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ChatBookmark[];
  } catch {
    return [];
  }
}

export async function toggleBookmark(bookmark: Omit<ChatBookmark, 'savedAt'>): Promise<boolean> {
  const all = await listBookmarks();
  const exists = all.find((b) => b.messageId === bookmark.messageId);
  if (exists) {
    await AsyncStorage.setItem(KEY, JSON.stringify(all.filter((b) => b.messageId !== bookmark.messageId)));
    return false;
  }
  const entry: ChatBookmark = { ...bookmark, savedAt: new Date().toISOString() };
  await AsyncStorage.setItem(KEY, JSON.stringify([entry, ...all].slice(0, 100)));
  return true;
}

export async function removeBookmark(messageId: string): Promise<void> {
  const all = await listBookmarks();
  await AsyncStorage.setItem(KEY, JSON.stringify(all.filter((b) => b.messageId !== messageId)));
}

export async function isBookmarked(messageId: string): Promise<boolean> {
  const all = await listBookmarks();
  return all.some((b) => b.messageId === messageId);
}
