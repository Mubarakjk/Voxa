import { getSupabaseClient } from '../supabase/client';
import { hasSupabaseConfig } from '../../config/env';

export type AccountDeletionResult =
  | { ok: true; mode: 'local' | 'cloud' }
  | { ok: false; message: string };

/**
 * Attempts real account deletion.
 * Cloud path requires the `delete-account` Edge Function with service-role privileges.
 */
export async function requestAccountDeletion(input: {
  resetLocalData: () => Promise<void>;
  signOut: () => Promise<void>;
  signOutCleanup: () => Promise<void>;
  cancelNotifications: () => Promise<void>;
}): Promise<AccountDeletionResult> {
  await input.cancelNotifications();

  if (!hasSupabaseConfig()) {
    await input.resetLocalData();
    return { ok: true, mode: 'local' };
  }

  try {
    const client = getSupabaseClient();
    const { data: sessionData } = await client.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      return {
        ok: false,
        message: 'You need to be signed in to delete a cloud account.',
      };
    }

    const { data, error } = await client.functions.invoke('delete-account', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (error) {
      return {
        ok: false,
        message:
          'We could not delete your cloud account right now. Check your connection and try again from Settings. Your account was not deleted.',
      };
    }

    if (data && typeof data === 'object' && 'ok' in data && (data as { ok: boolean }).ok === false) {
      return {
        ok: false,
        message:
          (data as { message?: string }).message ??
          'Account deletion failed. Please try again or contact support.',
      };
    }

    await input.signOut();
    await input.signOutCleanup();
    await input.resetLocalData();
    return { ok: true, mode: 'cloud' };
  } catch {
    return {
      ok: false,
      message:
        'Could not reach the deletion service. Check your connection and try again from Settings. Your account was not deleted.',
    };
  }
}
