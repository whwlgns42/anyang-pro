create table profiles (
  user_id uuid primary key references users(id) on delete cascade,
  birth_year smallint,
  gender text,
  enrollment_status text,
  occupation_type text,
  updated_at timestamptz not null default now()
);
