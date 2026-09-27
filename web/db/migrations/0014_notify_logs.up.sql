create table notify_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  notice_id uuid not null references notices(id) on delete cascade,
  reserved_at timestamptz not null default now(),
  sent_at timestamptz,
  result text not null default 'pending',
  error_summary text,
  unique (user_id, notice_id)
);

create index notify_logs_sent_at_idx on notify_logs (sent_at);
