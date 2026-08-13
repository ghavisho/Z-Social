-- =========================================================
-- Z — App-wide settings (maintenance/lockdown mode)
--
-- Singleton table: exactly one row, id is always TRUE (the check
-- constraint + primary key on a boolean column is a common Postgres
-- trick to physically prevent more than one row from ever existing).
-- =========================================================

create table app_settings (
  id boolean primary key default true,
  maintenance_mode boolean not null default false,
  maintenance_message text,
  maintenance_enabled_by uuid references profiles(id),
  maintenance_enabled_at timestamptz,
  constraint app_settings_singleton check (id)
);

insert into app_settings (id, maintenance_mode) values (true, false);

alter table app_settings enable row level security;

-- Everyone (including logged-out visitors) needs to be able to check
-- whether the site is in maintenance mode — that's how the middleware
-- decides whether to show the maintenance page at all.
create policy "app_settings: public read" on app_settings
  for select using (true);

-- No client-facing insert/update policy: toggling maintenance mode is
-- done exclusively through /api/admin/maintenance using the service-role
-- key, gated to super_admin only, and logged in admin_logs.
