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

2026-09-27 pm 세션이 비정상 종료된 뒤 재개했다. 사용자가 확인 항목 대부분에 답해 [[anyang-service-scope]]로 확정했고, 배포 원칙 5(커스텀 도메인은 나중, base URL 환경변수)를 [[anyang-deployment-portability]]에서 바꿨다. 그에 맞춰 database → backend → frontend 순서로 설계를 수정했다.

## Details

### 현재 상태

- 설계 문서(draft): [[anyang-database-schema]], [[anyang-backend-api]], [[anyang-frontend-screens]]
- dev-task(draft): [[anyang-backend-tasks]], [[anyang-frontend-tasks]]
- "승인된 설계" 절: 비어 있음.
- git: 초기 커밋 `0b7166d` 이후 설계 수정분·누락 파일 커밋, 하네스 Jev 변경 별도 커밋. push 안 함.

### 사용자에게 받을 답 (설계 승인 전)

[[anyang-youth-policy-assistant#확인이 필요한 항목]]의 미해결 항목 중 설계 값에 영향을 주는 것:

1. 동의 기록: 탈퇴 시 삭제 vs 보존(14), 동의 체크 단일 vs 분리(15), 처리방침 개정 시 재동의 강제(18)
2. 비밀번호 재설정 기능 포함 여부와 이메일 발송 수단(16)
3. 알림 중복 발송 방지 방식(17) — 사용자 답보다 database·backend 설계 보완이 필요할 수 있다
4. 프로필 코드값 셋(19)
5. 공지 자격요건 구조화 컬럼 여부(9)
6. 설계 문서 5종 승인 여부, 확정하지 않을 값이 있는지

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
