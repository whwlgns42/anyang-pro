---
type: handoff
date: 2026-09-27
status: active
owner: pm
---

# 안양 청년정책 비서 — 구현 중단 인수인계

## Summary

설계는 사용자 승인을 받았다(2026-09-27, user, 기준 커밋 `ef51d3c`). 구현 도중 사용자 지시로 작업 전체를 중단했다. database 구현은 끝났고, backend는 1차 시작 직후 중지되어 산출물이 없다. frontend·code-review는 시작하지 않았다.

## Context

설계 과정은 [[2026-09-27_anyang-design-approval-wait]]에 있다(이 문서로 대체, archive 이동 대상). 승인 기록은 [[anyang-youth-policy-assistant#승인된 설계]]에 있다.

## Details

### 현재 상태

- 설계 5종 승인: [[anyang-database-schema]], [[anyang-backend-api]], [[anyang-frontend-screens]], [[anyang-backend-tasks]], [[anyang-frontend-tasks]]. 문서 안 (미확정) 제안값도 함께 확정.
- database 구현 완료(커밋 `df067cd`): `web/db/migrations/` up/down 16쌍(순수 `.sql`), `web/db/migrate.sh`(`DATABASE_URL` + `psql`), `web/db/jobs/` pg_cron/pg_net 트리거 템플릿 2개, 정리 잡 2개(`UNAPPLIED_*.sql`, 작성만 하고 등록·실행 안 함). 실제 DB 적용·롤백 검증은 건너뜀(DB 없음), 정적 검사만 통과.
- backend 구현 1차: 시작 직후 메인 세션이 중지. 파일을 남기지 않았다(메인 세션 git status 확인).
- frontend 구현, code-review: 시작하지 않음.
- git: 로컬 커밋 12개, 원격 없음. push는 원격을 연결할 때 사용자 확인을 받는다.

### 다음 할 일

1. backend 구현을 세 묶음으로 나눠 순서대로 진행
   - 1차: 앱 스캐폴딩(`web/`, Next.js App Router, `output: 'standalone'`, `.env.example`), 작업 9·1·1-4·2·2-1·2-2·2-3(스케줄러 시크릿, 인증·동의, 탈퇴, 프로필, 알림 설정, 기억, 대화 히스토리)
   - 2차: 작업 3~8·15(임베딩, 수집기, 채팅 RAG, 알림 잡, Web Push, API 사용량 기록)
   - 3차: 작업 12~14(관리자 API). 11(UNO Q 리허설)과 16·17(정리 잡 등록)은 사용자 준비·승인 후
2. frontend 구현
3. code-review 검수

### 사용자 결정 대기

1. 정리 잡 2개(`web/db/jobs/UNAPPLIED_cleanup-logs.sql`, `UNAPPLIED_consents-retention-cleanup.sql`) pg_cron 등록 승인. 메인 세션 권장: DB 연결 후 첫 배포 때.
2. 설계 잠금 훅이 문장 중간·복합 괄호의 "(미확정 — …)" 삭제를 막아 [[anyang-database-schema]]에 표기가 남아 있다(값은 확정대로 구현됨). 메인 세션 권장: 훅을 좁게 수정.
3. 커밋되지 않은 하네스 변경 2건 — `scripts/jev.py`(인코딩 1줄), `.claude/rules/dev-common.md`(중복 금지 규칙에 `jev.py dup` 추가). `log.md`에 변경 기록 한 줄(작성자 표시 없음)과 관련 `[stale?]` flag가 있다. 커밋 여부 미정이라 이번 커밋에서 제외했다.
4. 앱 위치 `web/`(pm 결정, Vercel Root Directory = `web`) 유지 여부.

### 사용자 준비 필요

개발용 Supabase `DATABASE_URL`, `psql`(또는 Supabase SQL Editor), Google OAuth 클라이언트, DeepSeek·Gemini API 키, VAPID 키, `ADMIN_EMAILS`.

### 재개 방법

메인 세션이 이 문서를 읽고 pm을 "단계: 구현"으로 호출한다. pm은 먼저 git-manager로 `git status`를 확인한 뒤 backend 1차부터 분배한다.

## Links

- [[anyang-youth-policy-assistant]]
- [[2026-09-27_anyang-design-approval-wait]]
- [[anyang-database-schema]]
- [[anyang-backend-api]]
- [[anyang-frontend-screens]]
- [[anyang-backend-tasks]]
- [[anyang-frontend-tasks]]
