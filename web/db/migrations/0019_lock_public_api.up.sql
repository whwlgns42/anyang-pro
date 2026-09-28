begin;

do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon')
     and exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on all tables in schema public from anon, authenticated;
    revoke all on all sequences in schema public from anon, authenticated;
    revoke all on all functions in schema public from anon, authenticated;
    alter default privileges for role postgres in schema public
      revoke all on tables from anon, authenticated;
    alter default privileges for role postgres in schema public
      revoke all on sequences from anon, authenticated;
    alter default privileges for role postgres in schema public
      revoke all on functions from anon, authenticated;
  end if;
end $$;

commit;
