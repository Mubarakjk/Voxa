import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import path from 'node:path';

/**
 * Models PostgreSQL PERMISSIVE RLS WITH CHECK combination (OR).
 * If any applicable permissive policy's WITH CHECK passes, the write is allowed.
 */
export function permissiveWithCheckAllows(checks: boolean[]): boolean {
  if (checks.length === 0) return false;
  return checks.some(Boolean);
}

describe('messages RLS duplicate policy bypass', () => {
  it('weaker owner-only WITH CHECK ORs past conversation ownership requirement', () => {
    const ownUserId = true;
    const ownsConversation = false; // User A writing into User B's conversation_id

    const weakerPolicy = ownUserId; // "messages own data"
    const strongerPolicy = ownUserId && ownsConversation; // "messages_own"

    assert.equal(strongerPolicy, false);
    assert.equal(
      permissiveWithCheckAllows([weakerPolicy, strongerPolicy]),
      true,
      'duplicate weaker policy must be treated as an INSERT bypass',
    );
  });

  it('single strong policy blocks foreign conversation_id writes', () => {
    const ownUserId = true;
    const ownsConversation = false;
    const strongOnly = ownUserId && ownsConversation;
    assert.equal(permissiveWithCheckAllows([strongOnly]), false);
  });

  it('dedupe migration drops obsolete weaker policy and keeps conversation WITH CHECK', () => {
    const migration = readFileSync(
      path.join(process.cwd(), 'supabase/migrations/202609190002_messages_rls_dedupe.sql'),
      'utf8',
    );
    assert.match(migration, /DROP POLICY IF EXISTS "messages own data"/);
    assert.match(migration, /DROP POLICY IF EXISTS messages_own/);
    assert.match(migration, /CREATE POLICY messages_own/);
    assert.match(migration, /EXISTS\s*\(/);
    assert.match(migration, /conversations c/);
    assert.match(migration, /c\.user_id = auth\.uid\(\)/);
    // Must not recreate the weak owner-only-only WITH CHECK as a second ALL policy.
    assert.doesNotMatch(migration, /CREATE POLICY "messages own data"/);
  });

  it('schema.sql messages policy requires parent conversation ownership on write', () => {
    const schema = readFileSync(path.join(process.cwd(), 'supabase/schema.sql'), 'utf8');
    assert.match(schema, /create policy "messages_own" on public\.messages/);
    assert.match(schema, /with check \([\s\S]*exists \([\s\S]*conversations c/);
  });
});
