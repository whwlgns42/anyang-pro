begin;
alter table notices
  add column is_pinned boolean not null default false,
  add column image_count int not null default 0,
  add column attachments jsonb not null default '[]'::jsonb;
-- 확인 항목 55-j: 중복 판정은 source_url만 쓴다. if exists를 쓰지 않아 이름이 다르면 실패해 알린다.
alter table notices drop constraint notices_content_hash_key;
commit;
