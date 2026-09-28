alter table notify_logs
  add column failed_device_count integer not null default 0;
