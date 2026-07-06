/**
 * Low-level key-value storage contract.
 * Swap AsyncStorageService for a Supabase-backed adapter later without changing repositories.
 */
export interface IStorageService {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
}
