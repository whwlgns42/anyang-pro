-- 되돌릴 수 없음: 수집 데이터 삭제. 사용자 승인 필요(설계 B-8). 수집 시작 전(행 0개)이면 손실 없음.
begin;
drop table collector_runs;
drop table collected_notices;
drop table collector_schema_migrations;
commit;
