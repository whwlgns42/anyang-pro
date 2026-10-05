begin;
create index messages_conversation_id_idx on messages (conversation_id);
commit;
