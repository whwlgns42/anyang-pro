#!/usr/bin/env bash
# ponytail: no migration framework, plain .sql + psql tracked in schema_migrations.
# 이전 가능성 원칙: DATABASE_URL 하나로 개발/운영/UNO Q 어디서든 실행 가능해야 한다.
# 사용법:
#   DATABASE_URL=... ./migrate.sh up
#   DATABASE_URL=... ./migrate.sh down [N]   # 기본 N=1, 최근 적용분부터 되돌림
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/migrations" && pwd)"
: "${DATABASE_URL:?DATABASE_URL 환경변수가 필요하다}"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c \
  "create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now());" \
  >/dev/null

cmd="${1:-up}"

case "$cmd" in
  up)
    for f in "$DIR"/*.up.sql; do
      version="$(basename "$f" .up.sql)"
      applied=$(psql "$DATABASE_URL" -tAc "select 1 from schema_migrations where version = '$version'")
      if [ "$applied" != "1" ]; then
        echo "applying $version"
        psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
        psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c \
          "insert into schema_migrations(version) values ('$version');" >/dev/null
      fi
    done
    rls_off=$(psql "$DATABASE_URL" -tAc \
      "select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;")
    if [ -n "$rls_off" ]; then
      echo "RLS off on public tables: $rls_off" >&2
      exit 1
    fi
    anon_role=$(psql "$DATABASE_URL" -tAc "select 1 from pg_roles where rolname = 'anon'")
    if [ "$anon_role" = "1" ]; then
      anon_access=$(psql "$DATABASE_URL" -tAc \
        "select table_name from information_schema.tables t where table_schema = 'public' and has_table_privilege('anon', format('%I.%I', table_schema, table_name), 'SELECT');")
      if [ -n "$anon_access" ]; then
        echo "anon has table privileges on: $anon_access" >&2
        exit 1
      fi
    fi
    ;;
  down)
    n="${2:-1}"
    versions=$(psql "$DATABASE_URL" -tAc \
      "select version from schema_migrations order by version desc limit $n")
    for version in $versions; do
      f="$DIR/$version.down.sql"
      echo "reverting $version"
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c \
        "delete from schema_migrations where version = '$version';" >/dev/null
    done
    ;;
  *)
    echo "usage: $0 up|down [N]" >&2
    exit 1
    ;;
esac
