import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import { deleteUserOwnedRows } from '../_shared/account-deletion-db.ts';
import {
  CHAT_ATTACHMENTS_BUCKET,
  purgeUserChatAttachments,
} from '../_shared/account-deletion-storage.ts';

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Deletes the authenticated user's account and related rows.
 * Requires SUPABASE_SERVICE_ROLE_KEY. Deploy before claiming App Store deletion compliance.
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, message: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ ok: false, message: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse({ ok: false, message: 'Server misconfigured' }, 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse({ ok: false, message: 'Unauthorized' }, 401);
  }

  const userId = userData.user.id;
  const admin = createClient(supabaseUrl, serviceKey);
  const storageBucket = admin.storage.from(CHAT_ATTACHMENTS_BUCKET);

  try {
    const storageResult = await purgeUserChatAttachments(storageBucket, userId);
    const dbResult = await deleteUserOwnedRows(admin, userId);

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('[delete-account] auth delete failed', deleteError.message);
      return jsonResponse({ ok: false, message: 'Account deletion failed' }, 500);
    }

    return jsonResponse(
      {
        ok: true,
        removedAttachments: storageResult.removedCount,
        deletedTables: dbResult.deletedTables,
        skippedTables: dbResult.skippedTables,
      },
      200,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Account deletion failed';
    if (message.startsWith('storage_')) {
      console.error('[delete-account] storage purge failed', message.split(':')[0]);
    } else if (message.startsWith('database_delete_failed')) {
      console.error('[delete-account] database delete failed', message.split(':')[1] ?? 'unknown');
    } else if (message === 'Invalid user id for storage purge') {
      console.error('[delete-account] invalid user id');
    } else {
      console.error('[delete-account] unexpected failure', message.slice(0, 120));
    }
    return jsonResponse({ ok: false, message: 'Account deletion failed' }, 500);
  }
});
