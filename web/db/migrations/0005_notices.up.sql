create table notices (
  id uuid primary key default gen_random_uuid(),
  source_url text not null unique,
  title text not null,
  body text not null,
  content_hash text not null unique,
  published_at timestamptz,
  collected_at timestamptz not null default now(),
  hidden_at timestamptz,
  hidden_reason text
);
