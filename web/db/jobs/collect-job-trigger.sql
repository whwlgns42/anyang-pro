-- 설계: anyang-database-schema.md "pg_cron / pg_net 잡 정의" 절.
-- 스케줄 로직 본체는 앱 API(/api/jobs/collect)에 있다. 이 SQL은 하루 1회(새벽) 그
-- 엔드포인트를 호출하는 트리거만 등록한다.
--
-- <APP_API_URL>, <SCHEDULER_SECRET>은 배포 환경변수가 채워진 뒤(backend 구현 단계 10번)
-- 실제 값으로 바꿔 실행한다. database는 이 템플릿만 준비하고 값이 없어 지금 실행하지 않는다.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'collect-job-trigger',
  '0 19 * * *', -- UTC 19:00 = Asia/Seoul 04:00
  $$
  select net.http_post(
    url := '<APP_API_URL>/api/jobs/collect',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-scheduler-secret', '<SCHEDULER_SECRET>'
    )
  );
  $$
);
