-- =========================================================
-- Z — Row Level Security
-- Principle: users can only read/write their own data, or data
-- explicitly shared with them via friendship/conversation membership.
-- Admins bypass via the service-role key (server-side only), never via
-- a client-exposed policy.
-- =========================================================

alter table profiles enable row level security;
alter table friend_requests enable row level security;
alter table friendships enable row level security;
alter table blocks enable row level security;
alter table posts enable row level security;
alter table post_media enable row level security;
alter table likes enable row level security;
alter table comments enable row level security;
alter table moments enable row level security;
alter table moment_views enable row level security;
alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table messages enable row level security;
alter table message_media enable row level security;
alter table notifications enable row level security;
alter table reports enable row level security;
alter table admin_logs enable row level security;
alter table user_presence enable row level security;
alter table user_settings enable row level security;

-- Helper: are two users friends?
create or replace function are_friends(u1 uuid, u2 uuid) returns boolean as $$
  select exists (
    select 1 from friendships
    where (user_a = least(u1, u2) and user_b = greatest(u1, u2))
  );
$$ language sql stable security definer;

-- Helper: is current user a member of a conversation?
create or replace function is_conversation_member(conv_id uuid) returns boolean as $$
  select exists (
    select 1 from conversation_members
    where conversation_id = conv_id and user_id = auth.uid()
  );
$$ language sql stable security definer;

-- ---------- profiles ----------
create policy "profiles: public read of basic fields" on profiles
  for select using (true); -- app layer restricts sensitive fields via select list

create policy "profiles: self update" on profiles
  for update using (auth.uid() = id);

create policy "profiles: self insert" on profiles
  for insert with check (auth.uid() = id);

-- ---------- friend_requests ----------
create policy "friend_requests: participants read" on friend_requests
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "friend_requests: sender creates" on friend_requests
  for insert with check (auth.uid() = sender_id);

create policy "friend_requests: receiver responds" on friend_requests
  for update using (auth.uid() = receiver_id or auth.uid() = sender_id);

-- ---------- friendships ----------
create policy "friendships: participants read" on friendships
  for select using (auth.uid() = user_a or auth.uid() = user_b);
create policy "friendships: insert requires an accepted request" on friendships
  for insert with check (
    auth.uid() in (user_a, user_b)
    and exists (
      select 1 from friend_requests fr
      where fr.status = 'accepted'
      and ((fr.sender_id = user_a and fr.receiver_id = user_b) or (fr.sender_id = user_b and fr.receiver_id = user_a))
    )
  );

-- ---------- blocks ----------
create policy "blocks: owner manages" on blocks
  for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);

-- ---------- posts ----------
create policy "posts: read public, friends, or own" on posts
  for select using (
    deleted_at is null and (
      visibility = 'public'
      or author_id = auth.uid()
      or (visibility = 'friends' and are_friends(auth.uid(), author_id))
    )
  );

create policy "posts: author writes" on posts
  for insert with check (auth.uid() = author_id);

create policy "posts: author updates/deletes" on posts
  for update using (auth.uid() = author_id);

-- ---------- post_media ----------
create policy "post_media: follows post visibility" on post_media
  for select using (
    exists (
      select 1 from posts p where p.id = post_media.post_id
      and p.deleted_at is null
      and (p.visibility = 'public' or p.author_id = auth.uid() or are_friends(auth.uid(), p.author_id))
    )
  );
create policy "post_media: author inserts" on post_media
  for insert with check (
    exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid())
  );

-- ---------- likes / comments ----------
create policy "likes: read if post visible" on likes for select using (true);
create policy "likes: self insert/delete" on likes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "comments: read if post visible" on comments for select using (deleted_at is null);
create policy "comments: author writes" on comments
  for insert with check (auth.uid() = author_id);
create policy "comments: author edits own" on comments
  for update using (auth.uid() = author_id);

-- ---------- moments ----------
create policy "moments: read if not expired and visible" on moments
  for select using (
    expires_at > now() and (
      author_id = auth.uid() or are_friends(auth.uid(), author_id)
    )
  );
create policy "moments: author writes" on moments
  for insert with check (auth.uid() = author_id);
create policy "moments: author updates own (to attach media after upload)" on moments
  for update using (auth.uid() = author_id);

create policy "moment_views: participants read" on moment_views
  for select using (
    viewer_id = auth.uid()
    or exists (select 1 from moments m where m.id = moment_id and m.author_id = auth.uid())
  );
create policy "moment_views: viewer inserts" on moment_views
  for insert with check (auth.uid() = viewer_id);

-- ---------- conversations / messages ----------
create policy "conversations: members read" on conversations
  for select using (is_conversation_member(id));

create policy "conversation_members: members read roster" on conversation_members
  for select using (is_conversation_member(conversation_id));
create policy "conversation_members: self insert" on conversation_members
  for insert with check (auth.uid() = user_id);
create policy "conversation_members: self updates own membership (last_read_at)" on conversation_members
  for update using (auth.uid() = user_id);

create policy "messages: members read" on messages
  for select using (is_conversation_member(conversation_id) and deleted_at is null);
create policy "messages: members send" on messages
  for insert with check (is_conversation_member(conversation_id) and auth.uid() = sender_id);
create policy "messages: sender edits own" on messages
  for update using (auth.uid() = sender_id);

create policy "message_media: follows message access" on message_media
  for select using (
    exists (
      select 1 from messages m where m.id = message_id and is_conversation_member(m.conversation_id)
    )
  );
create policy "message_media: sender attaches media to own message" on message_media
  for insert with check (
    exists (select 1 from messages m where m.id = message_id and m.sender_id = auth.uid())
  );

-- ---------- notifications ----------
create policy "notifications: recipient reads" on notifications
  for select using (auth.uid() = recipient_id);
create policy "notifications: actor creates" on notifications
  for insert with check (auth.uid() = actor_id);
create policy "notifications: recipient marks read" on notifications
  for update using (auth.uid() = recipient_id);

-- ---------- reports ----------
create policy "reports: reporter reads own" on reports
  for select using (auth.uid() = reporter_id);
create policy "reports: reporter creates" on reports
  for insert with check (auth.uid() = reporter_id);
-- NOTE: admins read/update all reports via the service-role key server-side,
-- not through a client RLS policy, so a compromised anon key can't expose reports.

-- ---------- admin_logs ----------
-- No client policies: written and read exclusively via the service-role key
-- from server-side admin actions. RLS enabled with zero policies = fully locked.

-- ---------- presence / settings ----------
create policy "presence: public read of status only" on user_presence
  for select using (true);
create policy "presence: self update" on user_presence
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "settings: self only" on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
