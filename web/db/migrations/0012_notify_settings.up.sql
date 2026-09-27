create table notify_settings (
  user_id uuid primary key references users(id) on delete cascade,
  notify_time time not null,
  enabled boolean not null default true,
  enabled_at timestamptz,
  timezone text not null default 'Asia/Seoul',
  updated_at timestamptz not null default now()
);
