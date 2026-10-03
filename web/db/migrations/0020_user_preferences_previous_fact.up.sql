begin;
alter table user_preferences
  add column previous_fact text;
commit;
