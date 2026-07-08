import { Message } from '../../types';

/** Merge local + remote messages; remote wins on same id; never drop local-only rows. */
export function mergeMessages(local: Message[], remote: Message[]): Message[] {
  const byId = new Map<string, Message>();
  for (const item of local) byId.set(item.id, item);
  for (const item of remote) byId.set(item.id, item);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
