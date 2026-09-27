create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null,
  provider_account_id text not null,
  access_token text,
  refresh_token text,
  expires_at bigint,
  unique (provider, provider_account_id)
);
