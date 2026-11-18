-- ==============================================================
-- Migration: Supabase Knowledge Base & Document RAG Pipeline
-- Migration ID: 202611180001_knowledge_base_rag
-- ==============================================================

-- 1. APPROVED KNOWLEDGE DOCUMENTS TABLE
create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  category text not null default 'general',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. KNOWLEDGE CHUNKS TABLE (With PostgreSQL Full-Text Search FTS)
create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  chunk_index integer not null default 0,
  content text not null check (length(btrim(content)) > 0),
  fts tsvector generated always as (to_tsvector('english', content)) stored,
  created_at timestamptz not null default now()
);

create index if not exists knowledge_chunks_fts_idx
  on public.knowledge_chunks using gin(fts);

create index if not exists knowledge_chunks_doc_idx
  on public.knowledge_chunks (document_id);

-- Row Level Security
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;

revoke all on table public.knowledge_documents, public.knowledge_chunks from anon, authenticated;
grant select on table public.knowledge_documents, public.knowledge_chunks to anon, authenticated;
grant select, insert, update, delete on table public.knowledge_documents, public.knowledge_chunks to service_role;

drop policy if exists "allow public read published documents" on public.knowledge_documents;
create policy "allow public read published documents" on public.knowledge_documents
  for select to anon, authenticated using (is_published = true);

drop policy if exists "allow public read chunks" on public.knowledge_chunks;
create policy "allow public read chunks" on public.knowledge_chunks
  for select to anon, authenticated using (true);

drop policy if exists "backend service role document access" on public.knowledge_documents;
create policy "backend service role document access" on public.knowledge_documents
  for all to service_role using (true) with check (true);

drop policy if exists "backend service role chunk access" on public.knowledge_chunks;
create policy "backend service role chunk access" on public.knowledge_chunks
  for all to service_role using (true) with check (true);

-- 3. STORED PROCEDURE: KNOWLEDGE RETRIEVAL MATCH
create or replace function public.match_knowledge_chunks(
  p_query text,
  p_limit integer default 4
)
returns table (
  chunk_id uuid,
  document_title text,
  category text,
  content text,
  rank real
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_clean_query text;
  v_tsquery tsquery;
begin
  -- Clean query: remove special operators, lowercase, trim
  v_clean_query := lower(btrim(regexp_replace(p_query, '[^a-zA-Z0-9\s]', ' ', 'g')));
  
  begin
    v_tsquery := plainto_tsquery('english', v_clean_query);
  exception when others then
    v_tsquery := null;
  end;

  if v_tsquery is not null and length(v_clean_query) > 1 then
    return query
    select
      c.id as chunk_id,
      d.title as document_title,
      d.category,
      c.content,
      ts_rank_cd(c.fts, v_tsquery) as rank
    from public.knowledge_chunks c
    join public.knowledge_documents d on c.document_id = d.id
    where d.is_published = true and c.fts @@ v_tsquery
    order by rank desc, c.created_at asc
    limit p_limit;
  else
    -- Fallback keyword ILIKE search if tsquery is empty
    return query
    select
      c.id as chunk_id,
      d.title as document_title,
      d.category,
      c.content,
      0.5::real as rank
    from public.knowledge_chunks c
    join public.knowledge_documents d on c.document_id = d.id
    where d.is_published = true and (
      c.content ilike '%' || v_clean_query || '%' or
      d.title ilike '%' || v_clean_query || '%'
    )
    limit p_limit;
  end if;
end;
$$;

revoke all on function public.match_knowledge_chunks(text, integer) from public, anon, authenticated;
grant execute on function public.match_knowledge_chunks(text, integer) to service_role;

-- 4. SEED VERIFIED INSTITUTIONAL KNOWLEDGE DOCUMENTS
with inserted_docs as (
  insert into public.knowledge_documents (title, slug, category)
  values
    ('Platform Services & SaaS Overview', 'platform-services', 'services'),
    ('Pricing Plans & Subscriptions', 'pricing-plans', 'pricing'),
    ('Student & Client Portal Login Guide', 'portal-login-guide', 'support'),
    ('Fee Payment Schedules & Deadlines', 'fee-payment-schedules', 'finance'),
    ('Academic Examination Schedule Policy', 'exam-schedule-policy', 'academics'),
    ('Official Support & Escalation Contacts', 'support-escalation-contacts', 'support')
  on conflict (slug) do update set title = excluded.title
  returning id, slug
)
insert into public.knowledge_chunks (document_id, chunk_index, content)
select id, 0,
  case slug
    when 'platform-services' then
      'Curious Rabit AI provides enterprise-grade AI automation, client support chatbots, and cloud engineering services. Our chatbots integrate directly with institutional data to deliver instant, grounded support with 99.9% uptime.'
    when 'pricing-plans' then
      'Platform pricing starts at $29 per month for the Starter plan, which includes up to 1,000 monthly chats and email support. The Professional tier is $99 per month with full SLA, priority support, and multi-channel integration. Enterprise plans offer custom volume and dedicated support engineers.'
    when 'portal-login-guide' then
      'To access your account, navigate to the official portal login page and enter your registered email and password. If you forgot your password or cannot log in, click "Forgot Password" and follow the OTP verification link sent to your registered email address. For locked accounts, contact support@institution.edu.'
    when 'fee-payment-schedules' then
      'Tuition and service fees must be settled prior to the 15th calendar day of each billing month. Payments can be completed online via debit/credit card or net banking through the payment gateway on the portal. Late payments may incur a nominal penalty fee.'
    when 'exam-schedule-policy' then
      'Official semester examination timetables, room assignments, and admit cards are published under the Examinations tab of the portal exactly two weeks prior to the examination window. Students must bring their student ID card to all in-person examinations.'
    when 'support-escalation-contacts' then
      'For issues requiring human assistance, contact the official helpdesk at support@institution.edu or call the helpline at +1 (800) 555-0199 between 9:00 AM and 6:00 PM EST, Monday through Friday.'
  end
from inserted_docs
on conflict do nothing;
