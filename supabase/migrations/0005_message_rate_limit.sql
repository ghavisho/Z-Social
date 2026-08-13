-- =========================================================
-- Z — Message rate limiting at the database level
--
-- Messages are inserted directly from the browser to Supabase (not
-- through a Next.js API route) to keep Realtime send latency low. That
-- meant the app-level rate limiter (lib/utils/rateLimit.ts) never saw
-- these inserts — a real, documented gap (see SECURITY.md phase 12).
--
-- This closes it at the one place that's guaranteed to run no matter
-- which client inserts a row: a BEFORE INSERT trigger on messages itself.
-- Limit: 30 messages per 60 seconds per sender — generous for real
-- conversation, restrictive enough to stop a scripted flood.
-- =========================================================

create or replace function enforce_message_rate_limit() returns trigger as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
  from messages
  where sender_id = new.sender_id
    and created_at > now() - interval '60 seconds';

  if recent_count >= 30 then
    raise exception 'rate_limit_exceeded: too many messages sent recently'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_messages_rate_limit
  before insert on messages
  for each row execute procedure enforce_message_rate_limit();
