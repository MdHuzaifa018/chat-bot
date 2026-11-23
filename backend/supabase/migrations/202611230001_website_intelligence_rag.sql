-- ============================================================================
-- SupportAI Website Intelligence, Brand Extraction & RAG System Migration
-- Migration: 202611230001_website_intelligence_rag.sql
-- 100% Safe and Idempotent: Can be run multiple times on any Supabase project.
-- ============================================================================

create extension if not exists pgcrypto;

-- 1. Ensure public.websites exists
create table if not exists public.websites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  client_account_id uuid references public.client_accounts(id) on delete cascade,
  name text not null,
  url text not null,
  domain text not null,
  description text,
  preferred_language text default 'en',
  crawl_status text not null default 'idle' check (crawl_status in ('idle', 'in_progress', 'completed', 'failed')),
  last_crawled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.websites add column if not exists description text;
alter table public.websites add column if not exists preferred_language text default 'en';
alter table public.websites add column if not exists client_account_id uuid references public.client_accounts(id) on delete cascade;

create index if not exists idx_websites_domain on public.websites(domain);
create index if not exists idx_websites_client_account on public.websites(client_account_id);

-- 2. Ensure public.chatbot_configs exists and has full visual branding properties
create table if not exists public.chatbot_configs (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null unique references public.websites(id) on delete cascade,
  public_chatbot_id text not null unique default 'bot_' || lower(substr(encode(gen_random_bytes(12), 'hex'), 1, 16)),
  chatbot_name text not null default 'AI Support Assistant',
  welcome_message text not null default 'Hi there! How can I help you today?',
  placeholder_text text not null default 'Ask a question...',
  primary_color text not null default '#254B35',
  secondary_color text not null default '#3B82F6',
  accent_color text not null default '#A8C99B',
  background_color text not null default '#FFFFFF',
  text_color text not null default '#1E293B',
  border_color text not null default '#E2E8F0',
  button_color text not null default '#254B35',
  button_text_color text not null default '#FFFFFF',
  font_family text not null default 'Inter, system-ui, sans-serif',
  font_heading text not null default 'Inter, system-ui, sans-serif',
  logo_url text,
  theme_confidence jsonb not null default '{"primaryColor":0.9,"fontFamily":0.85,"logoUrl":0.8}'::jsonb,
  position text not null default 'bottom-right' check (position in ('bottom-right', 'bottom-left')),
  allowed_origins text[] not null default array[]::text[],
  is_published boolean not null default true,
  system_prompt_override text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotent column additions for existing installations
alter table public.chatbot_configs add column if not exists accent_color text not null default '#A8C99B';
alter table public.chatbot_configs add column if not exists border_color text not null default '#E2E8F0';
alter table public.chatbot_configs add column if not exists button_color text not null default '#254B35';
alter table public.chatbot_configs add column if not exists button_text_color text not null default '#FFFFFF';
alter table public.chatbot_configs add column if not exists font_heading text not null default 'Inter, system-ui, sans-serif';
alter table public.chatbot_configs add column if not exists theme_confidence jsonb not null default '{"primaryColor":0.9,"fontFamily":0.85,"logoUrl":0.8}'::jsonb;
alter table public.chatbot_configs add column if not exists system_prompt_override text;

create index if not exists idx_chatbot_configs_public_id on public.chatbot_configs(public_chatbot_id);

-- 3. Ensure public.suggested_questions exists
create table if not exists public.suggested_questions (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  question_text text not null check (length(btrim(question_text)) > 0),
  answer text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.suggested_questions add column if not exists answer text;
alter table public.suggested_questions add column if not exists display_order integer not null default 0;
alter table public.suggested_questions add column if not exists is_active boolean not null default true;

create index if not exists idx_suggested_questions_website on public.suggested_questions(website_id, display_order asc);

-- 4. Ensure public.crawled_pages exists
create table if not exists public.crawled_pages (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  url text not null,
  path text not null,
  title text,
  description text,
  clean_text text not null,
  page_type text not null default 'general',
  status text not null default 'crawled' check (status in ('crawled', 'indexed', 'failed')),
  content_hash text,
  created_at timestamptz not null default now(),
  constraint uq_website_page_url unique (website_id, url)
);

alter table public.crawled_pages add column if not exists page_type text not null default 'general';
alter table public.crawled_pages add column if not exists content_hash text;

create index if not exists idx_crawled_pages_website on public.crawled_pages(website_id);

-- 5. Ensure public.knowledge_documents exists for Semantic Chunking & RAG
create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  website_id uuid references public.websites(id) on delete cascade,
  title text not null,
  slug text,
  category text not null default 'general',
  chunk_index integer not null default 0,
  source_type text not null default 'crawled_chunk' check (source_type in ('crawled_chunk', 'crawled_page', 'manual_doc', 'faq')),
  source_url text,
  source_heading text,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_published boolean not null default true,
  fts tsvector generated always as (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))) stored,
  created_at timestamptz not null default now()
);

alter table public.knowledge_documents add column if not exists website_id uuid references public.websites(id) on delete cascade;
alter table public.knowledge_documents add column if not exists chunk_index integer not null default 0;
alter table public.knowledge_documents add column if not exists source_type text not null default 'crawled_chunk';
alter table public.knowledge_documents add column if not exists source_heading text;
alter table public.knowledge_documents add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.knowledge_documents add column if not exists is_published boolean not null default true;

create index if not exists idx_knowledge_docs_website on public.knowledge_documents(website_id);
create index if not exists idx_knowledge_docs_fts on public.knowledge_documents using gin(fts);

-- 6. RPC: Hybrid Website Knowledge Search Scoped to Website ID
create or replace function public.match_website_knowledge(
  p_website_id uuid,
  p_query text,
  p_limit integer default 4
)
returns table (
  id uuid,
  title text,
  source_heading text,
  source_url text,
  content text,
  rank real
)
language sql
stable
as $$
  select
    kd.id,
    kd.title,
    kd.source_heading,
    kd.source_url,
    kd.content,
    ts_rank(kd.fts, plainto_tsquery('english', p_query)) as rank
  from public.knowledge_documents kd
  where kd.website_id = p_website_id
    and kd.is_published = true
    and (
      kd.fts @@ plainto_tsquery('english', p_query)
      or kd.content ilike '%' || p_query || '%'
      or kd.title ilike '%' || p_query || '%'
    )
  order by rank desc, kd.created_at desc
  limit p_limit;
$$;

-- Security: Grant service role permissions
grant all on table public.websites to service_role;
grant all on table public.chatbot_configs to service_role;
grant all on table public.suggested_questions to service_role;
grant all on table public.crawled_pages to service_role;
grant all on table public.knowledge_documents to service_role;
grant execute on function public.match_website_knowledge(uuid, text, integer) to service_role;
