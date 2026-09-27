create table credentials (
  user_id uuid primary key references users(id) on delete cascade,
  password_hash text not null,
  updated_at timestamptz not null default now()
);
