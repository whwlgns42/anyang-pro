-- 설계: anyang-database-schema.md "pg_cron / pg_net 잡 정의" 절.
-- 스케줄 로직 본체는 앱 API(/api/jobs/notify)에 있다. 이 SQL은 5분마다 그 엔드포인트를
-- 호출하는 트리거만 등록한다(이전 가능성 원칙 3 — UNO Q 전환 시 리눅스 cron + curl로 교체).
--
-- <APP_API_URL>, <SCHEDULER_SECRET>은 배포 환경변수가 채워진 뒤(backend 구현 단계 10번,
-- anyang-backend-tasks.md 10번) 실제 값으로 바꿔 실행한다. database는 이 템플릿만 준비하고
-- 값이 없어 지금 실행하지 않는다 — 데이터 삭제가 아니므로 되돌릴 수 없는 마이그레이션은
-- 아니지만, 값 없이는 적용할 수 없다.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'notify-job-trigger',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := '<APP_API_URL>/api/jobs/notify',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-scheduler-secret', '<SCHEDULER_SECRET>'
    )
  );
  $$
);
