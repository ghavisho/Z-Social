-- =========================================================
-- Z — Initial Schema
-- Run against a Supabase Postgres project.
-- =========================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------- ENUMS ----------
create type friend_request_status as enum ('pending', 'accepted', 'rejected', 'cancelled');
create type report_target_type as enum ('user', 'post', 'comment', 'message', 'moment');
create type report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type presence_status as enum ('online', 'away', 'offline');
create type notification_type as enum (
  'friend_request', 'friend_accepted', 'message', 'like', 'comment', 'moment_view', 'call'
);

-- ---------- PROFILES ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 24),
  display_name text,
  bio text check (char_length(bio) <= 280),
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin', 'super_admin')),
  is_active boolean not null default true,
  password_change_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_username on profiles (lower(username));

-- ---------- FRIENDSHIPS ----------
create table friend_requests (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references profiles(id) on delete cascade,
  receiver_id uuid not null references profiles(id) on delete cascade,
  status friend_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (sender_id, receiver_id)
);
create index idx_friend_requests_receiver on friend_requests (receiver_id, status);

create table friendships (
  id uuid primary key default uuid_generate_v4(),
  user_a uuid not null references profiles(id) on delete cascade,
  user_b uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index idx_friendships_user_a on friendships (user_a);
create index idx_friendships_user_b on friendships (user_b);

create table blocks (
  id uuid primary key default uuid_generate_v4(),
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

-- ---------- POSTS (Pulse content) ----------
create table posts (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid not null references profiles(id) on delete cascade,
  body text check (char_length(body) <= 2000),
  visibility text not null default 'friends' check (visibility in ('public', 'friends', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_posts_author_created on posts (author_id, created_at desc);

create table post_media (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references posts(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video', 'file')),
  width int,
  height int,
  duration_seconds int,
  created_at timestamptz not null default now()
);

create table likes (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 1000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_comments_post on comments (post_id, created_at);

-- ---------- MOMENTS (24h ephemeral content) ----------
create table moments (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid not null references profiles(id) on delete cascade,
  media_type text not null check (media_type in ('text', 'image', 'video')),
  storage_path text,
  text_content text check (char_length(text_content) <= 500),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index idx_moments_author_expiry on moments (author_id, expires_at);
create index idx_moments_expiry on moments (expires_at); -- used by cleanup job

create table moment_views (
  id uuid primary key default uuid_generate_v4(),
  moment_id uuid not null references moments(id) on delete cascade,
  viewer_id uuid not null references profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (moment_id, viewer_id)
);

-- ---------- CONVERSATIONS / MESSAGES ----------
create table conversations (
  id uuid primary key default uuid_generate_v4(),
  is_group boolean not null default false,
  title text,
  created_at timestamptz not null default now()
);

create table conversation_members (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  unique (conversation_id, user_id)
);
create index idx_conv_members_user on conversation_members (user_id);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text,
  message_type text not null default 'text' check (message_type in ('text', 'image', 'video', 'audio', 'file')),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
create index idx_messages_conversation_created on messages (conversation_id, created_at);

create table message_media (
  id uuid primary key default uuid_generate_v4(),
  message_id uuid not null references messages(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video', 'audio', 'file')),
  file_name text,
  file_size_bytes bigint,
  duration_seconds int
);

-- ---------- NOTIFICATIONS ----------
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  type notification_type not null,
  entity_id uuid, -- post_id / message_id / moment_id / friend_request_id depending on type
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_recipient on notifications (recipient_id, is_read, created_at desc);

-- ---------- REPORTS / MODERATION ----------
create table reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  target_type report_target_type not null,
  target_id uuid not null,
  reason text not null,
  status report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles(id)
);

create table admin_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid not null references profiles(id),
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index idx_admin_logs_admin on admin_logs (admin_id, created_at desc);

-- ---------- PRESENCE / SETTINGS ----------
create table user_presence (
  user_id uuid primary key references profiles(id) on delete cascade,
  status presence_status not null default 'offline',
  last_seen_at timestamptz not null default now()
);

create table user_settings (
  user_id uuid primary key references profiles(id) on delete cascade,
  profile_visibility text not null default 'friends' check (profile_visibility in ('public', 'friends', 'private')),
  who_can_message text not null default 'friends' check (who_can_message in ('everyone', 'friends', 'nobody')),
  who_can_send_friend_request text not null default 'everyone' check (who_can_send_friend_request in ('everyone', 'nobody')),
  show_online_status boolean not null default true,
  show_last_seen boolean not null default true,
  moment_visibility text not null default 'friends' check (moment_visibility in ('public', 'friends', 'private')),
  updated_at timestamptz not null default now()
);

-- ---------- updated_at triggers ----------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated before update on profiles
  for each row execute procedure set_updated_at();
create trigger trg_posts_updated before update on posts
  for each row execute procedure set_updated_at();
