-- 미적용. 등록 전 사용자 승인 필요 (dev-common.md 규칙 4, anyang-database-schema.md
-- "되돌릴 수 없는 마이그레이션 표시" 절).
--
-- auth_attempts 1일 경과분 정리 잡. 1일 보존은 (미확정) 제안이므로 보존 기간 자체가 먼저
-- 설계 승인으로 확정돼야 하고, 그 뒤 구현 단계 지시서에 이 정리 잡 등록에 대한 별도 사용자
-- 승인이 적혀 있어야 실행한다. 2026-09-28 구현 지시서에는 그 승인이 없으므로 이 파일은
-- 작성만 하고 실행하지 않았다.
select cron.schedule(
  'cleanup-auth-attempts',
  '0 * * * *',
  $$ delete from auth_attempts where created_at < now() - interval '1 day'; $$
);
