-- 미적용. 등록 전 사용자 승인 필요 (dev-common.md 규칙 4, anyang-database-schema.md
-- "되돌릴 수 없는 마이그레이션 표시" 절).
--
-- collect_runs/api_usage_logs 90일 보존 정리 잡. 90일 보존 자체는 승인됐다
-- (user, 2026-09-27, anyang-service-scope.md). 하지만 이 pg_cron 등록은 되돌릴 수 없는
-- 삭제를 주기적으로 실행하는 것이므로, 구현 단계 지시서에 "이 잡을 지금 실제로 pg_cron에
-- 등록하는 것"에 대한 별도 사용자 승인이 적혀 있어야 실행한다. 2026-09-27 구현 지시서에는
-- 그 승인이 없으므로 이 파일은 작성만 하고 실행하지 않았다. notify_logs는 이 정리 대상이
-- 아니다(중복 발송 방지 근거 데이터, 확정).
select cron.schedule(
  'cleanup-logs',
  '0 18 * * *', -- UTC 18:00 = Asia/Seoul 03:00
  $$
  delete from collect_runs where started_at < now() - interval '90 days';
  delete from api_usage_logs where requested_at < now() - interval '90 days';
  $$
);
