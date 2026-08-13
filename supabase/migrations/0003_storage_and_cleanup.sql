-- =========================================================
-- Z — Storage buckets + scheduled cleanup (spec §45, §50)
-- =========================================================

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('posts', 'posts', false),
  ('moments', 'moments', false),
  ('messages', 'messages', false),
  ('voice', 'voice', false)
on conflict (id) do nothing;

-- Only image/video/audio/pdf mimetypes are accepted at the storage layer
-- (executables, scripts, and unknown binaries are rejected — spec §45).
update storage.buckets set allowed_mime_types = array[
  'image/jpeg','image/png','image/webp','image/avif','image/gif',
  'video/mp4','video/webm',
  'audio/webm','audio/mpeg','audio/ogg',
  'application/pdf'
] where id in ('avatars','posts','moments','messages','voice');

-- Storage RLS: users may only write into their own folder (path prefix = their user id)
create policy "storage: users manage own folder" on storage.objects
  for all using (
    bucket_id in ('avatars','posts','moments','messages','voice')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('avatars','posts','moments','messages','voice')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage: avatars publicly readable" on storage.objects
  for select using (bucket_id = 'avatars');

-- Post media: readable by the post's author or their friends (folder's
-- first segment is the author's user id, e.g. "{author_id}/{post_id}.jpg").
create policy "storage: posts readable by author or friends" on storage.objects
  for select using (
    bucket_id = 'posts'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or are_friends(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

-- ---------- Cleanup function: expired moments + orphaned files ----------
create or replace function cleanup_expired_content() returns void as $$
begin
  -- Delete moment rows past expiry (their storage objects are removed by
  -- the scheduled Edge Function, which lists storage paths before this runs)
  delete from moments where expires_at < now();

  -- Delete moment_views whose parent moment no longer exists (safety net;
  -- FK cascade already handles this, kept for idempotency)
  delete from moment_views mv
  where not exists (select 1 from moments m where m.id = mv.moment_id);

  -- Delete soft-deleted posts older than 30 days
  delete from posts where deleted_at is not null and deleted_at < now() - interval '30 days';
end;
$$ language plpgsql security definer;

-- Schedule via pg_cron (enable the pg_cron extension in Supabase dashboard first):
-- select cron.schedule('y-cleanup-hourly', '0 * * * *', $$ select cleanup_expired_content(); $$);
