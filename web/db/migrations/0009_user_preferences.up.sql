create table user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  preference_text text not null,
  embedding vector(768) not null,
  embedding_model text not null,
  source_conversation_id uuid references conversations(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_preferences_embedding_hnsw
  on user_preferences using hnsw (embedding vector_cosine_ops);
