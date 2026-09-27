-- 미적용. 등록 전 사용자 승인 필요 (dev-common.md 규칙 4, anyang-database-schema.md
-- "되돌릴 수 없는 마이그레이션 표시" 절).
--
-- consents 탈퇴 후 1년 경과분 정리 잡. 1년 보관 자체는 승인됐다
-- (user, 2026-09-27, anyang-service-scope.md). 하지만 이 pg_cron 등록은 되돌릴 수 없는
-- 삭제를 주기적으로 실행하는 것이므로, 구현 단계 지시서에 별도 사용자 승인이 적혀 있어야
-- 실행한다. 2026-09-27 구현 지시서에는 그 승인이 없으므로 이 파일은 작성만 하고 실행하지
-- 않았다.
select cron.schedule(
  'cleanup-consents-retention',
  '0 18 * * *', -- UTC 18:00 = Asia/Seoul 03:00
  $$
  delete from consents
  where withdrawn_at is not null and withdrawn_at < now() - interval '1 year';
  $$
);
