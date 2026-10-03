begin;
-- content_hash가 같은 행이 둘 이상이면 add constraint가 실패해 전체가 롤백된다(사용자 승인 필요 절차).
alter table notices add constraint notices_content_hash_key unique (content_hash);
alter table notices
  drop column attachments,
  drop column image_count,
  drop column is_pinned;
commit;
