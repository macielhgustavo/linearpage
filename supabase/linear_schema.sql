create extension if not exists pgcrypto;

create table if not exists public.linear_leads (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  contact text not null default '',
  email text not null default '',
  phone text not null default '',
  stage text not null default 'novo' check (stage in ('novo','qualificado','proposta','negociacao','ganho','perdido')),
  value_cents bigint not null default 0 check (value_cents >= 0),
  source text not null default '',
  next_action text not null default '',
  next_contact text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists linear_leads_followup on public.linear_leads(stage, next_contact);

create table if not exists public.linear_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.linear_leads(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists linear_activities_lead on public.linear_activities(lead_id, created_at desc);

create table if not exists public.linear_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  record_id uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists public.linear_smoke_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  name text not null check (name in ('landing_view','scroll_50','demo_view','how_it_works_view','cta_click','form_start','form_submit','form_error')),
  path text not null default '/',
  source text not null default '',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists linear_smoke_events_name_created on public.linear_smoke_events(name, created_at desc);
create index if not exists linear_smoke_events_session on public.linear_smoke_events(session_id, created_at desc);

alter table public.linear_leads enable row level security;
alter table public.linear_activities enable row level security;
alter table public.linear_audit_log enable row level security;
alter table public.linear_smoke_events enable row level security;

revoke all on public.linear_leads from anon, authenticated;
revoke all on public.linear_activities from anon, authenticated;
revoke all on public.linear_audit_log from anon, authenticated;
revoke all on public.linear_smoke_events from anon, authenticated;

grant all on public.linear_leads to service_role;
grant all on public.linear_activities to service_role;
grant all on public.linear_audit_log to service_role;
grant all on public.linear_smoke_events to service_role;
