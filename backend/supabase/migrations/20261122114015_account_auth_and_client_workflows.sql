-- Password/access-code authentication and tenant ownership for the current UI.
create table if not exists public.suggested_questions (
  id uuid primary key default gen_random_uuid(),
  website_id uuid references public.websites(id) on delete cascade,
  question_text text not null,
  answer text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.suggested_questions add column if not exists answer text;
alter table public.chatbot_configs alter column allowed_origins set default array[]::text[];

-- Replace legacy wildcard widget origins with each site's registered origin.
update public.chatbot_configs c
set allowed_origins = array[coalesce((regexp_match(w.url, '^https?://[^/]+'))[1], 'https://' || w.domain)]
from public.websites w
where c.website_id = w.id and c.allowed_origins @> array['*']::text[];

create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  password_hash text not null,
  role text not null default 'admin' check (role in ('super_admin', 'admin', 'staff')),
  job_title text,
  permissions jsonb not null default '{"acceptRequests":true,"rejectRequests":true,"viewTelemetry":false,"manageWebsites":false,"manageTeam":false}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_access_requests (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text not null,
  email text not null,
  website_url text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.admin_accounts(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_access_requests_status_created_idx
  on public.client_access_requests(status, created_at desc);

create table if not exists public.client_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  username text not null unique,
  access_code_hash text not null,
  email text not null unique,
  business_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.account_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  admin_account_id uuid references public.admin_accounts(id) on delete cascade,
  client_account_id uuid references public.client_accounts(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint account_sessions_one_principal check (
    (admin_account_id is not null and client_account_id is null) or
    (admin_account_id is null and client_account_id is not null)
  )
);

create index if not exists account_sessions_expiry_idx on public.account_sessions(expires_at);

alter table public.websites
  add column if not exists client_account_id uuid references public.client_accounts(id) on delete cascade;
create index if not exists websites_client_account_created_idx
  on public.websites(client_account_id, created_at desc);

alter table public.admin_accounts enable row level security;
alter table public.client_access_requests enable row level security;
alter table public.client_accounts enable row level security;
alter table public.account_sessions enable row level security;

revoke all on table public.admin_accounts, public.client_access_requests,
  public.client_accounts, public.account_sessions from anon, authenticated;
grant all on table public.admin_accounts, public.client_access_requests,
  public.client_accounts, public.account_sessions to service_role;

create policy "service role manages admin accounts" on public.admin_accounts
  for all to service_role using (true) with check (true);
create policy "service role manages client requests" on public.client_access_requests
  for all to service_role using (true) with check (true);
create policy "service role manages client accounts" on public.client_accounts
  for all to service_role using (true) with check (true);
create policy "service role manages account sessions" on public.account_sessions
  for all to service_role using (true) with check (true);

revoke all on table public.websites from anon, authenticated;
grant all on table public.websites to service_role;

-- Dashboard access is exclusively mediated by the Express API. The service role
-- is server-only; browser roles have no table privileges.
