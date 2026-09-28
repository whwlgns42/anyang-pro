create table auth_attempts (
  id uuid primary key default gen_random_uuid(),
  attempt_type text not null,
  identifier_type text not null,
  identifier_hash text not null,
  created_at timestamptz not null default now()
);

create index auth_attempts_lookup_idx
  on auth_attempts (attempt_type, identifier_type, identifier_hash, created_at);
