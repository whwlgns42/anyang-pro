-- collect_runs.triggered_by에 on delete 규칙이 없어 기본값(no action)이 적용되고 있었다.
-- 관리자 계정이 탈퇴(users 행 삭제)하면 이 FK 때문에 탈퇴 자체가 실패한다.
-- triggered_by는 이미 null 허용(자동 실행 시 null)이므로, 관리자를 삭제해도 collect_runs
-- 이력(90일 보존 로그, anyang-database-schema.md collect_runs 절)은 남기고 연결만 끊는
-- on delete set null로 바꾼다. consents.user_id(0010)와 같은 원칙이다.
alter table collect_runs
  drop constraint collect_runs_triggered_by_fkey;

alter table collect_runs
  add constraint collect_runs_triggered_by_fkey
  foreign key (triggered_by) references users(id) on delete set null;
