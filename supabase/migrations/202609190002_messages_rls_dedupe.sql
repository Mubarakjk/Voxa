-- Fix: weaker duplicate messages policy OR-bypasses conversation ownership WITH CHECK.
--
-- Live DB had BOTH:
--   1) "messages own data"  — USING/WITH CHECK: auth.uid() = user_id only
--   2) "messages_own"       — WITH CHECK also requires owning parent conversation
--
-- PostgreSQL combines PERMISSIVE policies with OR. Any single passing WITH CHECK
-- allows the write, so policy (1) let User A insert into User B's conversation_id
-- while setting messages.user_id = auth.uid().
--
-- This migration removes the obsolete weaker policy and keeps a single strong policy.

DROP POLICY IF EXISTS "messages own data" ON public.messages;
DROP POLICY IF EXISTS messages_own ON public.messages;

CREATE POLICY messages_own ON public.messages
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = conversation_id
        AND c.user_id = auth.uid()
    )
  );
