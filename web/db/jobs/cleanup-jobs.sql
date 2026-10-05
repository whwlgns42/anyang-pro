-- 보관 기간 정리 잡 4종. 설계: anyang-database-schema.md "보관 기간 정리 잡 4종 등록 설계" (확인 항목 63).
-- 작성만 했고 아직 cron에 등록하지 않았다(코드 배포 뒤, 등록 직전 대상 행 수 재확인과 함께 별도 호출).
-- 등록 후 이 줄 아래에 등록 날짜를 주석으로 남긴다. 같은 이름으로 다시 실행하면 기존 잡이 갱신된다.
-- 되돌릴 수 없는 삭제를 주기적으로 실행한다. 중지: select cron.unschedule('<이름>');
-- 시각은 UTC (괄호는 Asia/Seoul). notify-job-trigger의 */5와 겹치지 않는 분을 쓴다.

select cron.schedule(
  'cleanup-logs',
  '2 18 * * *', -- 03:02
  $$
  delete from collect_runs where started_at < now() - interval '90 days';
  delete from api_usage_logs where requested_at < now() - interval '90 days';
  $$
);

select cron.schedule(
  'cleanup-consents-retention',
  '3 18 * * *', -- 03:03
  $$
  delete from consents where withdrawn_at is not null and withdrawn_at < now() - interval '1 year';
  $$
);

-- messages는 cascade, user_preferences.source_conversation_id는 set null (0023)
select cron.schedule(
  'cleanup-conversations',
  '4 18 * * *', -- 03:04
  $$
  delete from conversations where updated_at < now() - interval '1 year';
  $$
);

select cron.schedule(
  'cleanup-auth-attempts',
  '17 * * * *', -- 매시 17분
  $$
  delete from auth_attempts where created_at < now() - interval '24 hours';
  $$
);
