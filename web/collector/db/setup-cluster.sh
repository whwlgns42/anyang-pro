#!/usr/bin/env bash
# 보드(UNO Q)에서 arduino 사용자로 실행(sudo 가능). 클러스터는 OS 사용자 postgres 소유(56(l) (c)), 수집기는 arduino -> 맵 peer.
# 설계: anyang-board-collector-db B-1~B-4, B-8, F-1.
# 기존 클러스터(17/main, 5432)에는 어떤 명령도 내리지 않는다. 비밀값 없음(peer 인증).
# 실행 전 F-1 1번 적용 전 스냅샷을 먼저 뜬다. 하나 실패하면 멈춘다(자동 되돌림 없음).
# 실패 시 정리(설계 F-3):
#   - 중지만: sudo systemctl disable --now postgresql@17-collector   (사용자 승인 없이 가능)
#   - 제거: sudo pg_dropcluster 17 collector, 드롭인 폴더 postgresql@17-collector.service.d 삭제,
#     daemon-reload, /mnt/usb/anyang-collector 삭제  -> 모두 삭제이므로 사용자 승인 필요. 임의로 실행하지 않는다.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
DATA=/mnt/usb/anyang-collector/pg
CONF=/etc/postgresql/17/collector
PSQL_ADMIN=(sudo -u postgres psql -p 5433 -v ON_ERROR_STOP=1)

mountpoint -q /mnt/usb || { echo "usb_not_mounted"; exit 1; }
# /mnt/usb 는 chown·chmod 가능한 파일시스템(ext4 등)이어야 한다(보드 확인값: ext4)
case "$(findmnt -no FSTYPE /mnt/usb)" in
  ext2|ext3|ext4|xfs|btrfs) ;;
  *) echo "usb 파일시스템이 chown/chmod 를 지원하지 않을 수 있다. 중단."; exit 1 ;;
esac
command -v pg_lsclusters >/dev/null || { echo "pg_lsclusters 없음. 중단."; exit 1; }
CLUSTERS="$(pg_lsclusters --no-header)" || { echo "pg_lsclusters 실패. 중단."; exit 1; }
printf '%s
' "$CLUSTERS" | awk '$1=="17" && $2=="collector"{f=1} END{exit !f}' && { echo "17 collector 클러스터가 이미 있다. 중단."; exit 1; }
# 포트 5433 미사용(보드 확인값: 비어 있음)
if ss -tlnH | awk '{print $4}' | grep -q ':5433$'; then echo "포트 5433 사용 중. 중단."; exit 1; fi
[ -e "$DATA" ] && { echo "$DATA 가 이미 있다. 중단."; exit 1; }

# 1) 데이터 폴더(새 폴더만. /mnt/usb/postgresql, /mnt/usb/data 는 건드리지 않는다)
sudo mkdir -p /mnt/usb/anyang-collector
sudo install -d -m 700 -o postgres -g postgres "$DATA"

# 2) 클러스터 생성(로케일은 main template1 과 같은 en_US.UTF-8, 보드에서 2026-10-04 확인. 부팅 시 기동은 아래 enable: postgresql@.service 에 [Install] 있음 확인)
sudo pg_createcluster 17 collector -u postgres -d "$DATA" -p 5433 --start-conf=auto -- --encoding=UTF8 --locale=en_US.UTF-8

# 3) 설정: 자원 상한·소켓 전용(conf.d), peer 인증 파일
sudo tee "$CONF/conf.d/collector.conf" >/dev/null <<'CONF'
listen_addresses = ''
port = 5433
unix_socket_directories = '/var/run/postgresql'
shared_buffers = 32MB
max_connections = 10
work_mem = 4MB
maintenance_work_mem = 32MB
effective_cache_size = 256MB
max_wal_size = 256MB
autovacuum_max_workers = 2
CONF
sudo tee "$CONF/pg_hba.conf" >/dev/null <<'CONF'
local  anyang_collector  anyang_collector  peer  map=collector
local  all               postgres          peer
CONF
sudo tee "$CONF/pg_ident.conf" >/dev/null <<'CONF'
collector  arduino  anyang_collector
CONF
sudo chown --reference="$CONF/postgresql.conf" "$CONF/pg_hba.conf" "$CONF/pg_ident.conf" "$CONF/conf.d/collector.conf"

# 4) USB 가드 드롭인
sudo install -d /etc/systemd/system/postgresql@17-collector.service.d
sudo install -m 644 "$HERE/../systemd/postgresql@17-collector.service.d/usb.conf" \
  /etc/systemd/system/postgresql@17-collector.service.d/usb.conf
sudo systemctl daemon-reload

# 5) 기동(새 인스턴스에만)
sudo systemctl enable --now postgresql@17-collector

# 6) 롤·DB·권한(postgres = 부트스트랩 슈퍼유저, peer)
"${PSQL_ADMIN[@]}" postgres <<'SQL'
create role anyang_collector login;
create database anyang_collector owner anyang_collector;
revoke connect on database anyang_collector from public;
grant connect on database anyang_collector to anyang_collector;
SQL

# 7) 0001 up (postgres 접속 + set role anyang_collector 로 객체 소유자를 롤로 맞춘다. 파일은 stdin 으로 읽어 postgres 의 파일 권한 불필요)
{ echo "set role anyang_collector;"; cat "$HERE/0001_init.up.sql"; } | sudo -u postgres psql -p 5433 -v ON_ERROR_STOP=1 anyang_collector

echo "완료. F-1 5~6번 적용 후 스냅샷 비교를 이어서 한다."
