alter table collect_runs
  drop constraint collect_runs_triggered_by_fkey;

alter table collect_runs
  add constraint collect_runs_triggered_by_fkey
  foreign key (triggered_by) references users(id);
