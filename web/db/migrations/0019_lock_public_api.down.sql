begin;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon')
     and exists (select 1 from pg_roles where rolname = 'authenticated') then
    alter default privileges for role postgres in schema public
      grant all on tables to anon, authenticated;
    alter default privileges for role postgres in schema public
      grant all on sequences to anon, authenticated;
    alter default privileges for role postgres in schema public
      grant all on functions to anon, authenticated;
    grant all on all tables in schema public to anon, authenticated;
    grant all on all sequences in schema public to anon, authenticated;
    grant all on all functions in schema public to anon, authenticated;
  end if;
end $$;

do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I disable row level security', t.tablename);
  end loop;
end $$;

commit;
