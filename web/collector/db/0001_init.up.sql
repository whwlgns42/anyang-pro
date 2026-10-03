-- 보드 수집 DB(anyang_collector) 0001. 설계: AI-Sessions/wiki/design/anyang-board-collector-db.md B-3, B-8
-- 실행: psql -h /var/run/postgresql -p 5433 -U anyang_collector -v ON_ERROR_STOP=1 -f 0001_init.up.sql anyang_collector
begin;

create table collector_schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

create table collected_notices (
  id bigint generated always as identity primary key,
  source_url text not null unique,
  title text not null,
  body text not null,
  content_hash text not null,
  published_at timestamptz,
  is_pinned boolean not null default false,
  image_count int not null default 0,
  attachments jsonb not null default '[]',
  raw_html text,
  first_collected_at timestamptz not null default now(),
  collected_at timestamptz not null default now(),
  sync_status text not null default 'pending' check (sync_status in ('pending', 'synced', 'failed')),
  retry_count int not null default 0,
  last_error text,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  synced_at timestamptz
);

create table collector_runs (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('quick', 'full', 'backfill', 'sync')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'failed')),
  pages_fetched int not null default 0,
  found_count int not null default 0,
  new_count int not null default 0,
  changed_count int not null default 0,
  synced_count int not null default 0,
  sync_failed_count int not null default 0,
  error_summary text
);

insert into collector_schema_migrations (version) values ('0001_init');

commit;
