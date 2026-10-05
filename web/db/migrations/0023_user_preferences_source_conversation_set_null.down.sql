begin;
-- 원래 FK(NO ACTION)로 복원. up 이후 대화 삭제로 null이 된 행은 복원되지 않는다(출처 정보가 이미 사라짐)
alter table user_preferences
  drop constraint user_preferences_source_conversation_id_fkey,
  add constraint user_preferences_source_conversation_id_fkey
    foreign key (source_conversation_id) references conversations(id);
commit;
