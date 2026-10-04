begin;
create table occupation_embeddings (
  code            text primary key,
  sentence        text not null,
  embedding       vector(768) not null,
  embedding_model text not null,
  updated_at      timestamptz not null default now()
);
-- 0019 관례: 새 테이블은 같은 파일에서 RLS를 켠다(정책 없음, anon 권한은 기본 권한 회수로 막힘)
alter table occupation_embeddings enable row level security;
commit;
