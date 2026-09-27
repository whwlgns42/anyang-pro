create table api_usage_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  operation text not null,
  requested_at timestamptz not null default now(),
  status text not null,
  input_tokens integer,
  output_tokens integer
);

create index api_usage_logs_requested_at_idx on api_usage_logs (requested_at);
