-- =========================================================
-- Z — Storage read-access fix
--
-- The original storage policy in 0003 only let a user read files inside
-- their OWN folder. That's correct for uploads, but breaks reading:
-- a voice message or photo the OTHER person in a chat/post sent. This
-- migration adds read policies keyed to the actual relationship (conversation
-- membership for chat, friendship/visibility for posts and moments),
-- instead of folder ownership.
-- =========================================================

create policy "storage: messages/voice readable by conversation members" on storage.objects
  for select using (
    bucket_id in ('messages', 'voice')
    and exists (
      select 1 from message_media mm
      join messages m on m.id = mm.message_id
      where mm.storage_path = storage.objects.name
      and is_conversation_member(m.conversation_id)
    )
  );

create policy "storage: posts readable per post visibility" on storage.objects
  for select using (
    bucket_id = 'posts'
    and exists (
      select 1 from post_media pmd
      join posts p on p.id = pmd.post_id
      where pmd.storage_path = storage.objects.name
      and p.deleted_at is null
      and (p.visibility = 'public' or p.author_id = auth.uid() or are_friends(auth.uid(), p.author_id))
    )
  );

create policy "storage: moments readable while active" on storage.objects
  for select using (
    bucket_id = 'moments'
    and exists (
      select 1 from moments mo
      where mo.storage_path = storage.objects.name
      and mo.expires_at > now()
      and (mo.author_id = auth.uid() or are_friends(auth.uid(), mo.author_id))
    )
  );

-- NOTE: buckets stay private (public = false in 0003) except 'avatars'.
-- Because of this, the app must use `createSignedUrl()` — not
-- `getPublicUrl()` — to display files from messages/posts/moments/voice.
-- See lib/supabase/signedUrl.ts and components/chat/MediaAttachment.tsx.
