begin;
alter table user_preferences
  drop constraint user_preferences_source_conversation_id_fkey,
  add constraint user_preferences_source_conversation_id_fkey
    foreign key (source_conversation_id) references conversations(id) on delete set null;
commit;
