-- 설계: anyang-database-schema.md "pg_cron / pg_net 잡 정의" 절 (확인 항목 55).
-- 잡 두 개: collect-quick(10분마다, 새 글만), collect-full(하루 1회 새벽, 정밀 점검).
-- 스케줄 로직 본체는 앱 API(/api/jobs/collect)에 있다. 이 SQL은 호출 트리거만 등록한다.
--
-- <APP_API_URL>, <SCHEDULER_SECRET>은 실제 값으로 바꿔 실행한다(값은 문서·저장소에 남기지 않는다).
-- 운영 DB 실행(확장 설치·잡 등록)은 사용자 승인 후에만 한다. 옛 잡이 등록돼 있다면 먼저:
--   select cron.unschedule('collect-job-trigger');
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'collect-quick',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := '<APP_API_URL>/api/jobs/collect?mode=quick',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-scheduler-secret', '<SCHEDULER_SECRET>'
    )
  );
  $$
);

select cron.schedule(
  'collect-full',
  '0 19 * * *', -- UTC 19:00 = Asia/Seoul 04:00
  $$
  select net.http_post(
    url := '<APP_API_URL>/api/jobs/collect?mode=full',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-scheduler-secret', '<SCHEDULER_SECRET>'
    )
  );
  $$
);
