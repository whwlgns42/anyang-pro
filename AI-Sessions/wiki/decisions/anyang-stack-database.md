---
type: decision
date: 2026-09-27
status: active
owner: pm
decided_by: user
---

# 안양 청년정책 비서 — 스택과 DB 결정

## Summary

Next.js(App Router) 풀스택 PWA 웹앱과 PostgreSQL + pgvector를 쓴다.

## Context

사용자 프로필·대화 이력으로 안양시 청년정책 공지를 골라 주고 푸시로 알리는 웹앱이다. 추천·검색에 벡터 유사도가 필요하다. 사용자가 2026-09-27에 확정했다.

## Details

| 항목 | 값 |
|---|---|
| 스택 | Next.js(App Router) 풀스택, PWA 웹앱 |
| DB | PostgreSQL + pgvector |

- DB 접속은 표준 PostgreSQL로만 한다(`DATABASE_URL`). 근거는 [[anyang-deployment-portability]]의 이전 가능성 원칙.
- 세부 스키마·프레임워크 설정은 각 설계 문서에서 정하며 사용자 승인 전까지 미확정이다.

## Links

- [[anyang-youth-policy-assistant]]
- [[anyang-ai-models-data-transfer]]
- [[anyang-login-method]]
- [[anyang-deployment-portability]]
- [[anyang-database-schema]]
- [[anyang-backend-api]]
- [[anyang-frontend-screens]]
- [[anyang-supabase-connection]]
