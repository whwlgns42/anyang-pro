create table notice_chunks (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references notices(id) on delete cascade,
  chunk_text text not null,
  embedding vector(768) not null,
  embedding_model text not null,
  created_at timestamptz not null default now()
);

create index notice_chunks_embedding_hnsw
  on notice_chunks using hnsw (embedding vector_cosine_ops);
