create table consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  consent_type text not null,
  policy_version text not null,
  consented_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  ip_address inet
);

create index consents_user_type_version_idx
  on consents (user_id, consent_type, policy_version);
