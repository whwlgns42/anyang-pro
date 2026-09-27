create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);
