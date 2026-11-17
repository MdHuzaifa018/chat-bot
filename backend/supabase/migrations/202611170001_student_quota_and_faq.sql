-- ==============================================================
-- Migration: Student Daily Quota & Verified FAQ Caching
-- Migration ID: 202611170001_student_quota_and_faq
-- ==============================================================

-- --------------------------------------------------------------
-- 1. STUDENT DAILY USAGE QUOTA TABLE & ATOMIC RPC
-- --------------------------------------------------------------
create table if not exists private.student_daily_usage (
  client_id uuid not null references public.clients(id) on delete cascade,
  usage_date date not null default current_date,
  message_count integer not null check (message_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (client_id, usage_date)
);

create index if not exists student_daily_usage_date_idx
  on private.student_daily_usage (usage_date);

revoke all on table private.student_daily_usage from public, anon, authenticated;
grant select, insert, update, delete on table private.student_daily_usage to service_role;

-- Stored Procedure: Atomic daily quota consumption (Prevents race conditions)
create or replace function public.consume_student_daily_quota(
  p_client_id uuid,
  p_max_limit integer
)
returns json
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_current_count integer;
  v_today date := current_date;
begin
  -- Upsert daily record atomically with row-level lock
  insert into private.student_daily_usage (client_id, usage_date, message_count)
  values (p_client_id, v_today, 1)
  on conflict (client_id, usage_date)
  do update set
    message_count = private.student_daily_usage.message_count + 1,
    updated_at = now()
  returning message_count into v_current_count;

  if v_current_count > p_max_limit then
    return json_build_object(
      'allowed', false,
      'current_count', v_current_count,
      'max_limit', p_max_limit,
      'remaining', 0
    );
  else
    return json_build_object(
      'allowed', true,
      'current_count', v_current_count,
      'max_limit', p_max_limit,
      'remaining', (p_max_limit - v_current_count)
    );
  end if;
end;
$$;

revoke all on function public.consume_student_daily_quota(uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_student_daily_quota(uuid, integer) to service_role;

-- --------------------------------------------------------------
-- 2. VERIFIED FAQ CACHING ENGINE
-- --------------------------------------------------------------
create table if not exists public.faq_cache (
  id uuid primary key default gen_random_uuid(),
  normalized_query text not null unique,
  display_question text not null,
  answer text not null check (length(btrim(answer)) > 0),
  category text not null default 'general',
  is_active boolean not null default true,
  hit_count integer not null default 0 check (hit_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists faq_cache_query_idx
  on public.faq_cache (normalized_query) where is_active = true;

alter table public.faq_cache enable row level security;
revoke all on table public.faq_cache from anon, authenticated;
grant select on table public.faq_cache to anon, authenticated;
grant select, insert, update, delete on table public.faq_cache to service_role;

-- Policy: Anyone can read active FAQs, only server can manage
drop policy if exists "allow public read active faqs" on public.faq_cache;
create policy "allow public read active faqs" on public.faq_cache
  for select to anon, authenticated using (is_active = true);

drop policy if exists "backend service role faq access" on public.faq_cache;
create policy "backend service role faq access" on public.faq_cache
  for all to service_role using (true) with check (true);

-- Atomic FAQ Cache lookup and hit increment
create or replace function public.lookup_faq_cache(p_query text)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_faq record;
  v_clean_query text;
begin
  -- Normalize query: lowercase, trim, remove excessive punctuation
  v_clean_query := lower(btrim(regexp_replace(p_query, '[?!.,]', '', 'g')));

  select id, display_question, answer, category, hit_count
  into v_faq
  from public.faq_cache
  where is_active = true and (
    normalized_query = v_clean_query or
    v_clean_query like '%' || normalized_query || '%'
  )
  order by length(normalized_query) desc
  limit 1;

  if found then
    update public.faq_cache
    set hit_count = hit_count + 1, updated_at = now()
    where id = v_faq.id;

    return json_build_object(
      'hit', true,
      'id', v_faq.id,
      'question', v_faq.display_question,
      'answer', v_faq.answer,
      'category', v_faq.category
    );
  else
    return json_build_object('hit', false);
  end if;
end;
$$;

revoke all on function public.lookup_faq_cache(text) from public, anon, authenticated;
grant execute on function public.lookup_faq_cache(text) to service_role;

-- Seed Initial Verified Institutional FAQs
insert into public.faq_cache (normalized_query, display_question, answer, category)
values
  (
    'how does the platform pricing work',
    'How does the platform pricing work?',
    'Our SaaS tiers start at $29/mo for the Starter plan and $99/mo for the Professional tier with full SLA.',
    'pricing'
  ),
  (
    'what services do you provide',
    'What services do you provide?',
    'We provide AI automation, client support chatbots, and cloud engineering services.',
    'services'
  ),
  (
    'fee payment deadline',
    'What is the fee payment deadline?',
    'Fee deadlines for the current academic session are published on the official student portal. Payment must be cleared prior to the 15th of each billing month.',
    'finance'
  ),
  (
    'how do i reset my student portal login',
    'How do I reset my student portal login?',
    'To reset your student login credentials, visit the official student portal login page, click "Forgot Password", and follow the OTP verification sent to your registered email.',
    'support'
  ),
  (
    'exam schedule',
    'What is the upcoming exam schedule?',
    'Official examination schedules and room allocations are posted under the Examinations section of the student portal two weeks prior to the exam period.',
    'academics'
  )
on conflict (normalized_query) do update set
  answer = excluded.answer,
  display_question = excluded.display_question,
  updated_at = now();
