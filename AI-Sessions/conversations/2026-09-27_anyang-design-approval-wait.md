---
type: handoff
date: 2026-09-27
status: active
owner: pm
---

# 안양 청년정책 비서 — 설계 승인 대기 인수인계

## Summary

사용자 답변을 반영한 설계 수정 라운드가 끝났다. 설계 문서 3종과 dev-task 2종이 `status: draft`로 사용자 승인을 기다린다. 구현 단계는 아직 지시하지 않았다.

## Context

2026-09-27 pm 세션이 비정상 종료된 뒤 재개했다. 사용자가 확인 항목 대부분에 답해 [[anyang-service-scope]]로 확정했고, 배포 원칙 5(커스텀 도메인은 나중, base URL 환경변수)를 [[anyang-deployment-portability]]에서 바꿨다. 그에 맞춰 database → backend → frontend 순서로 설계를 수정했다. 이어서 사용자 새 요청인 관리자 페이지(`ADMIN_EMAILS`, 기능 4종, 대화·기억 원문 비노출)를 같은 순서로 설계에 추가했다. 마지막으로 메인 세션의 승인 전 재점검(탈퇴 예외, 관리자는 Google 로그인 계정만, 403 에러 코드, 알림 쿼리 자정 경계, 채팅 메시지 임베딩 허용 등)을 반영했다.

## Details

### 현재 상태

- 설계 문서(draft): [[anyang-database-schema]], [[anyang-backend-api]], [[anyang-frontend-screens]]
- dev-task(draft): [[anyang-backend-tasks]], [[anyang-frontend-tasks]]
- "승인된 설계" 절: 비어 있음.
- git: 초기 커밋 `0b7166d` 이후 설계 수정분·누락 파일 커밋, 하네스 Jev 변경 별도 커밋. push 안 함.

### 사용자에게 받을 답 (설계 승인 전)

[[anyang-youth-policy-assistant#확인이 필요한 항목]]의 미해결 항목 중 설계 값에 영향을 주는 것:

1. 설계 문서 5종 승인 여부, 확정하지 않을 값이 있는지

사용자 결정이 필요한 미해결 항목은 없다(배포·전환 시점 항목 7·13 제외). 9·14·15·16·18·19·20·21은 2026-09-27 사용자가 답해 [[anyang-service-scope]]에 반영하고 설계를 수정했다. 설계 문서의 나머지 (미확정) 제안값(예: `occupation_type` 입력을 select로, 수집 잡 주기)은 설계 승인으로 확정된다.

배포·전환 시점에 정해도 되는 것: 커스텀 도메인(7), UNO Q HTTPS(13).

### 다음 할 일

1. 메인 세션이 위 질문과 설계 승인 여부를 사용자에게 받는다.
2. 수정 요청이면 pm이 기록하고 해당 설계만 database → backend → frontend 순서로 다시 맡긴다.
3. 승인이면 pm이 "승인된 설계" 절에 기록한 뒤 `단계: 구현`으로 분배한다.

## Links

- [[anyang-youth-policy-assistant]]
- [[anyang-service-scope]]
- [[anyang-deployment-portability]]
- [[anyang-database-schema]]
- [[anyang-backend-api]]
- [[anyang-frontend-screens]]
- [[anyang-backend-tasks]]
- [[anyang-frontend-tasks]]
