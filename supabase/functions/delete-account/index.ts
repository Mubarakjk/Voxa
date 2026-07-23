import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

/**
 * Deletes the authenticated user's account and related rows.
 * Requires SUPABASE_SERVICE_ROLE_KEY. Deploy before claiming App Store deletion compliance.
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, message: 'Method not allowed' }), { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ ok: false, message: 'Unauthorized' }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return new Response(JSON.stringify({ ok: false, message: 'Server misconfigured' }), { status: 500 });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ ok: false, message: 'Unauthorized' }), { status: 401 });
  }

  const userId = userData.user.id;
  const admin = createClient(supabaseUrl, serviceKey);

  // Best-effort related data cleanup — extend as schema grows.
  const tables = [
    'messages',
    'conversations',
    'memories',
    'goals',
    'reminders',
    'profiles',
  ];
  for (const table of tables) {
    try {
      await admin.from(table).delete().eq('user_id', userId);
    } catch {
      // Table may not exist in all environments.
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return new Response(
      JSON.stringify({ ok: false, message: deleteError.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
