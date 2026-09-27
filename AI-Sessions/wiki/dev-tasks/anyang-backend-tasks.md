---
type: dev-task
date: 2026-09-27
status: active
owner: backend
---

# 안양 청년정책 비서 — Backend 구현 작업 단위

## Summary

[[anyang-backend-api]] 설계 승인 후 구현할 작업을 기능 단위로 나눈 목록이다. 각 단위는
독립적으로 테스트·커밋 가능하도록 쪼갰다(dev-common 규칙 4). 순서는 의존 관계를 따른다 —
database의 마이그레이션이 먼저 적용돼야 한다.

## Context

의존: [[anyang-database-schema]]의 테이블(users/accounts/credentials/profiles/notices/
notice_chunks/conversations/messages/user_preferences/push_subscriptions/notify_settings/
consents/collect_runs/notify_logs/api_usage_logs, users.suspended_at, notices.hidden_at)이
먼저 마이그레이션돼 있어야 아래 작업을 시작할 수 있다. 서비스 범위는
[[anyang-service-scope]](수집 대상 게시판 1개, 프로필 4항목, 알림 자유 시각+on/off, 기억·
대화 히스토리 화면, 인증 부가 테이블 미사용, 가입 시 동의, 관리자 페이지 `ADMIN_EMAILS`
기반 기능 4종)로 확정됐다.

## Details

### 작업 단위 (모두 [[anyang-backend-api]] 승인 후 착수, 값은 그 문서 기준 미확정)

1. **인증·동의** — Auth.js v5 설정(Google + Credentials provider, JWT 세션, `jwt`/`session`
   콜백에서 로그인 provider를 `token.provider`/`session`에 기록 — 12번 관리자 인가가
   의존), `/api/auth/register`(동의 항목 2개 — 수집·이용/국외 이전 — 게이트 포함, 이메일이
   `ADMIN_EMAILS`면 403 `ADMIN_EMAIL_RESERVED`로 거부 — backend 설계 1절·13-0절),
   `/api/auth/consent`(Google 로그인 동의·재동의 겸용), `POLICY_VERSION` 코드 상수,
   재동의 판정 미들웨어(1-2절 정지 확인과 같은 위치). `signIn` 콜백의 `OAuthAccountNotLinked`
   실패는 그대로 두고(자동 연결 off 유지, backend 설계 1-5절) 별도 처리 코드를 추가하지
   않는다. 비밀번호 재설정은 1차 출시 제외로 해결됨(backend 설계 1-1절) — 이 단위에
   포함하지 않는다. 테스트: 로그인/가입/동의/재동의/오류 케이스
   ([[anyang-backend-api#테스트 방법]] 1번).
1-4. **사용자 탈퇴** — `DELETE /api/account`(1-3절, consents 보관 순서). 1번 의존. 테스트:
   탈퇴 후 `consents` 보관·`user_id` null 확인.
2. **프로필 CRUD** — `GET/PUT /api/profile`(4항목: birth_year/gender/occupation_type/
   enrollment_status). 테스트: 인증·본인 확인.
2-1. **알림 설정** — `GET/PUT /api/notify-settings`. PUT은 생성 시 `enabled_at=now()` 채움,
   `false→true` 전환 시 `enabled_at` 갱신 포함(backend 설계 2-2절). 테스트: 인증·형식 검증·
   `enabled_at` 갱신 규칙.
2-2. **기억(user_preferences)** — `GET/PUT/DELETE /api/preferences`. PUT은 동기 재임베딩
   포함(3번 의존). 테스트: 수정 시 임베딩 갱신, 실패 시 롤백.
2-3. **대화 히스토리** — `GET /api/conversations`, `GET /api/conversations/:id/messages`,
   대화 생성 시 `title` 자동 생성(첫 메시지 앞부분).
3. **Gemini 임베딩 클라이언트 + 재시도·배치** — 공통 유틸(임베딩 호출, 백오프, 배치 처리).
   이후 2-2·4·6번이 의존.
4. **임베딩 파이프라인** — `/api/jobs/embed`. 3번 의존.
5. **공지 수집기** — `/api/jobs/collect`(대상 게시판 URL 확정됨). robots.txt 404(제한 없음)와
   게시판 HTML 구조는 2026-09-28 메인 세션이 확인했고 커밋 766ea20에서 구현·테스트됨
   (backend 설계 5절, [[2026-09-28_anyang-first-build-paused]]). 구조가 바뀌면 파서를 갱신한다.
6. **채팅 + RAG** — `/api/chat`(DeepSeek 스트리밍, 검색, 선호 추출). 공용 가림 함수
   (`lib/mask-pii.ts` 등, 미확정 경로)를 만들어 Gemini 임베딩·DeepSeek 전송·선호 추출 결과
   문장의 Gemini 임베딩까지 세 지점 모두에서 재사용(backend 설계 3절 0번, 2차 재점검 반영 —
   기존에는 Gemini 임베딩에만 적용). **인용 공지 스트림(신규, 확인 항목 22, backend 설계
   3-2절)** — RAG 검색 결과(notice_id 중복 제거)를 `event: citations` SSE 이벤트로 DeepSeek
   청크 전에 먼저 전송, 빈 목록도 `data: []`로 전송. 3번 의존.
7. **알림 잡** — `/api/jobs/notify`(시각 창 매칭 + 코사인 유사도 + Web Push 호출,
   `notify_logs` pending 선점·정체 재시도 포함). 3·8번 의존. 중복 발송 방지 방식은
   database·backend 조율 완료(backend 설계 7절).
8. **Web Push** — `POST/DELETE /api/push/subscribe`, `web-push` 연동.
9. **스케줄러 공유 시크릿 미들웨어** — `/api/jobs/*` 공통 인증. 4·5·7번이 의존.
10. **환경변수·배포 설정** — `output: 'standalone'`, Vercel 프로젝트 설정(icn1), 9절 환경변수
    실제 값 채우기(비밀 값은 문서에 남기지 않음). `APP_ORIGIN`은 배포 시 Vercel 기본 도메인
    사용, 커스텀 도메인은 나중에(12-1절 절차). `ADMIN_EMAILS`도 이 단위에서 채운다.
11. **UNO Q 전환 runbook 리허설** — 로컬 PostgreSQL 덤프/복원 1회(개발 환경 한정).
12. **관리자 공통 인가** — `requireAdmin` 헬퍼(13-0절, 세션의 `provider === 'google'`
    확인 후 `ADMIN_EMAILS` 파싱·비교, 401/403 — `accounts` 테이블 조회 방식 아님, 2차
    재점검 반영). 1·9번 의존(1번의 `token.provider`/`session` 클레임, 세션·미들웨어 재사용).
13. **관리자 — 공지 수집 관리** — `GET/POST /api/admin/collect-runs`,
    `GET /api/admin/notices`(신규, 확인 항목 23, 숨김 포함·페이지네이션),
    `PATCH /api/admin/notices/:id/hide`·`/unhide`(13-1절). 5·12번 의존. 5번(수집기 로직
    재사용)이 끝난 뒤 착수. `GET /api/admin/notices`는 스키마 변경이 필요 없다(database
    작업 없이 이 단위 안에서 구현).
14. **관리자 — 알림 발송 현황 / 사용자 관리·통계 / 외부 API 사용량** —
    `GET /api/admin/notify-logs/summary`, `GET/PATCH/DELETE /api/admin/users*`,
    `GET /api/admin/stats`, `GET /api/admin/api-usage/summary`(13-2~13-4절). 12번 의존.
    정지 계정 차단(1-2절 미들웨어)은 이 단위에서 함께 구현.
15. **`api_usage_logs` 기록 래퍼** — DeepSeek(6번)·Gemini(3번) 호출 공통 래퍼에 로그 기록 추가.
    3·6번 의존, 14번이 이 데이터를 조회하므로 14번보다 먼저 끝나야 한다.
16. **로그 정리 잡 등록(`collect_runs`/`api_usage_logs` 90일)** —
    [[anyang-database-schema#로그성 테이블 보존 기간·정리 잡]]의 `cleanup-logs` pg_cron
    SQL을 database가 등록한다(app API 엔드포인트 없음, backend 작업 아님). 보존 기간(90일)과
    정리 잡 등록 자체는 이미 승인됐다(user, 2026-09-27, [[anyang-service-scope]]). 다만 이
    항목은 되돌릴 수 없는 삭제를 주기적으로 실행하는 것이므로, 착수 전 이 구현 단계
    지시서에 **이 잡을 지금 실제로 pg_cron에 등록하는 것**에 대한 별도 사용자 승인이 적혀
    있는지 반드시 확인한다(dev-common 규칙 4,
    [[anyang-database-schema#되돌릴 수 없는 마이그레이션 표시]]). 승인 기록이 없으면
    등록하지 않고 멈춰서 보고한다. `notify_logs`는 이 정리 대상이 아니다(확정).
17. **동의 기록(`consents`) 보관 만료분 정리 잡 등록(1년)** —
    [[anyang-database-schema#consents — 가입 시 개인정보 필수 동의 기록]]의
    "탈퇴 후 보관" 절 `delete from consents where withdrawn_at is not null and withdrawn_at
    < now() - interval '1 year'` pg_cron SQL을 database가 등록한다(app API 엔드포인트 없음,
    backend 작업 아님). 보관 기간(1년)은 이미 승인됐다(user, 2026-09-27,
    [[anyang-service-scope]]). 16번과 마찬가지로 되돌릴 수 없는 삭제이므로, 착수 전 이
    구현 단계 지시서에 **이 잡을 지금 실제로 pg_cron에 등록하는 것**에 대한 별도 사용자
    승인이 적혀 있는지 반드시 확인한다. 승인 기록이 없으면 등록하지 않고 멈춰서 보고한다.
    16번과 대상 테이블·보존 기간이 달라 별도 작업 단위로 둔다(YAGNI에 위배되지 않음 —
    합치면 오히려 조건 분기가 늘어난다).

### 순서 제안

3, 9, 12 → (1, 2, 2-1 병렬 가능) → 1-4, 2-2, 4, 15 → 6, 8, 2-3 → 7 → 13, 14 → 10, 16, 17. 5는
robots.txt·HTML 구조 확인이 끝나는 대로 별도로 끼워 넣고, 13은 5 이후. 11은 나머지가 끝난 뒤
여유 있을 때. 16·17은 각 정리 잡 등록에 대한 별도 사용자 승인이 구현 단계 지시서에 먼저
적혀 있어야 착수한다(보존 기간 자체는 둘 다 이미 확정됨).

## 테스트 방법

각 작업 단위의 테스트는 [[anyang-backend-api#테스트 방법]]에 이미 기술돼 있다. 여기서는
중복하지 않는다.

## Links

- [[anyang-backend-api]]
- [[anyang-database-schema]]
- [[anyang-youth-policy-assistant]]
- [[anyang-service-scope]]
