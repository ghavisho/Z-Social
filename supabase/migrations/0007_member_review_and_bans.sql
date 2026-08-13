-- =========================================================
-- Z — Member review & permanent ban system
-- =========================================================

-- New notification type so admins get a normal notification (bell badge,
-- /notifications page) whenever someone new registers.
alter type notification_type add value if not exists 'new_member';

-- ---------- Security-sensitive signup/login info ----------
-- IMPORTANT: this does NOT live on `profiles`. The `profiles` table has a
-- public "select using (true)" policy (anyone can read anyone's profile —
-- that's intentional, it's how the app shows other people's names/bios).
-- But Postgres RLS can only restrict which ROWS a policy allows, never
-- which COLUMNS — so any column added directly to `profiles` inherits
-- that same public-read policy. Putting IP addresses and device-ban
-- tokens there would mean literally anyone holding the public anon key
-- (which ships in every browser bundle) could query every user's real IP
-- and device id straight from the Supabase REST API, bypassing the app
-- entirely. This table is separate specifically so it can have ZERO
-- client-facing policies — reachable only via the service-role key,
-- exactly like banned_ips/banned_devices below.
create table profile_security_info (
  user_id uuid primary key references profiles(id) on delete cascade,
  registration_ip text,
  last_login_ip text,
  device_id text,
  updated_at timestamptz not null default now()
);
create index idx_profile_security_device on profile_security_info (device_id);

alter table profile_security_info enable row level security;
-- No policies at all: service-role only (registration/login routes write
-- it, admin user-detail + moderate routes read it). RLS enabled with zero
-- policies = fully locked to anon/authenticated roles.

-- ---------- Permanent bans ----------
create table banned_ips (
  ip text primary key,
  reason text,
  banned_by uuid references profiles(id),
  banned_at timestamptz not null default now()
);

create table banned_devices (
  device_id text primary key,
  reason text,
  banned_by uuid references profiles(id),
  banned_at timestamptz not null default now()
);

alter table banned_ips enable row level security;
alter table banned_devices enable row level security;
-- No client-facing policies at all: these are checked in middleware using
-- the service-role key, and written only via /api/admin/users/[id]/moderate
-- after a super_admin/admin role check. RLS enabled with zero policies =
-- fully locked to anon/authenticated roles.
