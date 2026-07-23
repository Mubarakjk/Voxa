/**
 * One-shot signup test — verifies only ONE Supabase auth request is made.
 * Usage: node scripts/test-signup-once.mjs you@example.com yourpassword "Your Name"
 *
 * Requires EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in environment
 * (or in .env — load manually: export $(grep EXPO_PUBLIC .env | xargs))
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const email = process.argv[2];
const password = process.argv[3];
const displayName = process.argv[4] ?? 'Test User';

if (!url || !key) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

if (!email || !password) {
  console.error('Usage: node scripts/test-signup-once.mjs <email> <password> [displayName]');
  process.exit(1);
}

let signupCounter = 0;

async function signUpOnce() {
  signupCounter += 1;
  console.log('Signup request #', signupCounter);
  console.log('SIGNUP START', { email, timestamp: Date.now() });

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { display_name: displayName.trim() } },
  });

  if (error) {
    console.error('SIGNUP ERROR', {
      status: error.status,
      code: error.code ?? error.name,
      message: error.message,
    });
    process.exit(1);
  }

  console.log('SIGNUP SUCCESS', { userId: data.user?.id ?? null, session: Boolean(data.session) });
}

await signUpOnce();
console.log('Total signup requests sent:', signupCounter);
