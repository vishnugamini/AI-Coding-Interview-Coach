create table if not exists public.sessions (
  id uuid primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  resume_text text not null,
  job_description text not null,
  company text not null,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coding_rounds (
  id uuid primary key,
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  question_number integer not null,
  language text not null default 'python',
  question jsonb not null,
  hint_history jsonb not null default '[]'::jsonb,
  current_code text not null default '',
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.coding_submissions (
  id uuid primary key,
  round_id uuid not null references public.coding_rounds(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  code text not null,
  review jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.coding_rounds
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists current_code text not null default '';

alter table public.coding_submissions
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists coding_rounds_session_number_idx
  on public.coding_rounds(session_id, question_number desc);

create index if not exists profiles_user_idx
  on public.profiles(user_id);

create unique index if not exists profiles_user_unique_idx
  on public.profiles(user_id);

create index if not exists coding_rounds_user_number_idx
  on public.coding_rounds(user_id, question_number desc);

create index if not exists coding_submissions_round_idx
  on public.coding_submissions(round_id);

create index if not exists coding_submissions_user_idx
  on public.coding_submissions(user_id);
