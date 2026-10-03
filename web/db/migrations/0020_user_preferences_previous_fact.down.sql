begin;
alter table user_preferences
  drop column previous_fact;
commit;
