-- ==============================================================
-- Migration: Clerk Authentication & Multi-Tenant RBAC
-- Migration ID: 202611170002_clerk_and_multitenancy
-- ==============================================================

-- 1. COMPANIES / ORGANIZATIONS TABLE
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. DASHBOARD USERS (Mapped to Clerk User ID)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique,
  email text not null unique,
  name text,
  first_name text,
  last_name text,
  avatar_url text,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. COMPANY MEMBERSHIPS (Role-Based Access Control)
create table if not exists public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('super_admin', 'company_admin', 'team_member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, user_id)
);

-- Indexes for lightning fast multi-tenant authorization
create index if not exists users_clerk_id_idx on public.users (clerk_user_id);
create index if not exists company_memberships_user_idx on public.company_memberships (user_id);
create index if not exists company_memberships_company_idx on public.company_memberships (company_id);

-- Row Level Security
alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.company_memberships enable row level security;

revoke all on table public.companies, public.users, public.company_memberships from anon, authenticated;
grant select, insert, update, delete on table public.companies, public.users, public.company_memberships to service_role;

-- Seed Default Institutional Company & Admin
insert into public.companies (name, slug)
values ('Campus Support Administration', 'campus-support-admin')
on conflict (slug) do nothing;
