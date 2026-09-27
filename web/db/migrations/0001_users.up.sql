create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  email_verified timestamptz,
  name text,
  created_at timestamptz not null default now(),
  suspended_at timestamptz
);
