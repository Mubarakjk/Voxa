-- Multimodal chat attachments
-- Run in Supabase SQL Editor after main schema.

alter table public.messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- Storage bucket (private, user-owned via RLS)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  false,
  52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'video/mp4', 'video/quicktime',
    'audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-caf'
  ]
)
on conflict (id) do nothing;

-- Users can read/write only their own folder: userId/conversationId/messageId/*
create policy "chat_attachments_select_own"
on storage.objects for select
using (
  bucket_id = 'chat-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "chat_attachments_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'chat-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "chat_attachments_update_own"
on storage.objects for update
using (
  bucket_id = 'chat-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "chat_attachments_delete_own"
on storage.objects for delete
using (
  bucket_id = 'chat-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);
