create table collect_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  trigger_type text not null,
  status text not null default 'running',
  collected_count integer not null default 0,
  error_summary text,
  triggered_by uuid references users(id)
);

create index collect_runs_started_at_idx
  on collect_runs (started_at desc);
