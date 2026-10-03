---
type: handoff
date: 2026-10-03
status: draft
owner: shared
---

# 안양 비서 — Supabase MCP 연결 끊김으로 구현 중단, 재시작 후 이어가기

## Summary

확인 항목 48(모순 선호 정정) 설계는 13차로 최종 승인·확정됐다. 구현 첫 단계인 0020
마이그레이션(`user_preferences.previous_fact` 컬럼 추가)을 운영 DB에 적용하려 했으나
이 세션 시작부터 Supabase MCP 서버가 `CONNECT_TIMEOUT`으로 연결되지 않아 중단했다.
메인 세션과 database 서브에이전트 양쪽 모두 Supabase MCP 도구를 쓸 수 없는 상태를 확인했다.
사용자가 Claude Code를 재시작해 MCP 연결을 다시 확인하기로 했다.

## Context

- 확인 항목 48: "대화할수록 학습하되, 모순된 선호는 즉시 올바르게 수정"하는 로직 설계.
  방식은 추출 시 기존 기억 목록(최근5+유사5, 최대10)을 LLM에 같이 보여줘 모순이면
  기존 기억을 대체(UPDATE)하게 함. 추가 LLM 호출 없음(기존 추출 호출에 통합).
- 이력 보관 구조는 "안 2a"로 확정: 같은 행을 UPDATE하고 직전 문장 1단계만
  `previous_fact` 컬럼에 보관. 기억 id는 바뀌지 않아 화면 쪽 수정/삭제가 계속
  같은 id로 동작함(안 1의 "새 행 분리 + id 변경" 방식은 기각).
- 그 외 미확정 세부값(목록 크기, 모순 판단 호출 방식, replaces 필드 검증, 중복 순번
  처리 등)은 모두 pm/backend/database의 제안값을 그대로 채택해 확정함.
- 설계 승인: 프로젝트 문서 "승인된 설계" 13차에 `anyang-database-schema`,
  `anyang-backend-api`, `anyang-backend-tasks` 3개 문서 기록(승인일 2026-10-03,
  승인자 user). backend 두 문서 안의 46(Jev 게이트) 절은 이 승인 범위에서 제외.
- cheongan 디자인 적용(확인 항목 49)은 팀원 실제 소스코드를 받기 전까지 전면 보류
  (설계 조사 draft만 존재, 추가 작업 금지).
- push는 로컬 커밋이 원격보다 8개 앞선 상태지만 사용자 결정으로 계속 보류.

## 막힌 지점

- database 서브에이전트가 `mcp__supabase__*` 도구를 호출하면 "No such tool available".
- 메인 세션에서 `ToolSearch`로 같은 도구를 찾아도 동일하게 실패 —
  세션 시작 시스템 알림에 `supabase (CONNECT_TIMEOUT): "Request timed out"`로
  이미 표시돼 있었음. 이 프로젝트 전체의 MCP 연결 문제이고, 특정 에이전트만의
  문제가 아님.
- 사용자가 Claude Code 재시작(또는 `.mcp.json`/환경변수 확인)으로 연결을 복구하기로 함.

## 재시작 후 할 일

1. 이 세션(또는 새 세션)에서 Supabase MCP가 연결됐는지 확인한다
   (`ToolSearch`로 `mcp__supabase__list_tables` 등이 뜨는지, 또는 시스템 알림에
   더 이상 `CONNECT_TIMEOUT`이 안 뜨는지 확인).
2. 연결되면 pm을 호출해 다음을 지시한다:
   - "확인 항목 48 구현 이어서 진행해줘. database가 `web/db/migrations/0020_user_preferences_previous_fact.up.sql`을
     운영 DB에 적용하고 `schema_migrations` 기록·점검 SQL까지 확인한 뒤, backend가
     `web/app/api/chat/route.ts`(선호 추출/모순 대체 로직)를 구현. 테스트 통과하면
     git-manager에게 커밋을 맡기되 push는 하지 마."
   - 프로젝트 문서의 확인 항목 48·50, "승인된 설계" 13차를 먼저 읽게 한다.

## 현재 작업 트리 상태 (미커밋)

```
 M .claude/rules/dev-common.md               — 메인 세션이 추가한 overview 자동갱신 금지 규칙 (미커밋)
 M AI-Sessions/wiki/design/anyang-database-schema.md — 48 최종 결정 이후 자잘한 수정 2줄 (미커밋)
?? web/db/migrations/0020_user_preferences_previous_fact.up.sql   — 작성됨, 운영 DB 미적용이라 의도적으로 미커밋
?? web/db/migrations/0020_user_preferences_previous_fact.down.sql — 위와 동일
?? AI-Sessions/wiki/overview/안양비서-채팅요청흐름.visual-check.*  — archify 부산물 6개, 커밋할지 삭제할지 미결정(확인 항목 47-j)
```

마이그레이션 2개 파일은 운영 DB 적용 후 database가 커밋하는 것이 맞다(저장소와 DB
상태가 어긋나는 걸 막기 위함). `dev-common.md`와 `database-schema.md`의 미커밋 수정분은
다음 pm 호출 때 함께 커밋 대상에 포함시킬 것.

## Links

- [[anyang-youth-policy-assistant]] — 확인 항목 48·49·50, 승인된 설계 13차
- [[anyang-database-schema]] — user_preferences `previous_fact` 설계
- [[anyang-backend-api]] — 3-3-4절 모순 대체 로직
- [[anyang-backend-tasks]] — 6-2
