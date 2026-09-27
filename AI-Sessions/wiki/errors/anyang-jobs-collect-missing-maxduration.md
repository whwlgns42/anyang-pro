---
type: error
date: 2026-09-28
status: active
owner: code-review
---

# 안양 비서 — `/api/jobs/collect`·`/api/jobs/embed`에 `maxDuration` 설정 누락

## Summary

`d3a3a21`에서 수집 잡이 같은 요청 안에서 임베딩 파이프라인(`runEmbedJob`)을 이어 호출하도록
바뀌었다. [[anyang-backend-api]] 11절·739행은 이 연속 호출이 "Vercel Hobby 함수 실행 시간
한도(Fluid Compute 사용 시 최대 300초)" 안에 든다는 전제를 깔고 있는데, 실제 라우트 파일에는
그 한도를 300초로 끌어올리는 설정이 없다.

## Context

- 확인 파일: `web/app/api/jobs/collect/route.ts`, `web/app/api/jobs/embed/route.ts`,
  `web/vercel.json`, `web/next.config.ts` — 넷 중 어디에도 `export const maxDuration`이나
  `vercel.json`의 `functions.*.maxDuration`이 없다(`web/vercel.json`은 `regions`만 설정).
- backend 확인(2026-09-28, code-review 질문): 의도적 기본값 위임이 아니라 누락. Next.js
  Route Handler는 `maxDuration`을 다른 곳에서 자동으로 물려받지 않는다 — 라우트별
  `export const maxDuration` 또는 `vercel.json`의 `functions` 설정이 필요하다. 설정 없이는
  Vercel 기본 타임아웃(Hobby 10초, Fluid Compute라도 명시하지 않으면 300초까지 안 늘어남)이
  적용되어 수집+임베딩 연속 호출이 중간에 잘릴 수 있다.

## Details

- 위치: `web/app/api/jobs/collect/route.ts`(수집+임베딩 연속 호출의 실제 대상), 필요하면
  `web/app/api/jobs/embed/route.ts`(단독 호출 시에도 오래 걸릴 수 있음)에도 동일 적용.
- 영향: 실제 배포 환경에서 공지 수를 많이 처리해야 할 때(첫 수집, 오랜 미실행 후 재개 등)
  기본 타임아웃에 걸려 함수가 중간에 잘리고 임베딩 일부가 유실될 수 있다. 로컬 테스트(mock)로는
  드러나지 않는다 — 실제 Vercel 배포에서만 확인 가능.

## 재발 방지

설계 문서가 특정 시간 한도(300초 등)를 전제로 연속 처리를 설계할 때는, 그 한도를 실제로
적용하는 배포 설정(`maxDuration`)이 구현에 포함됐는지 구현 완료 시 함께 확인한다.

## 해결 기록 (2026-09-28, 재검수 1차)

커밋 `992e01e`에서 수정됨.

- `web/app/api/jobs/collect/route.ts`, `web/app/api/jobs/embed/route.ts`에
  `export const maxDuration = 300;` 추가(각각 anyang-backend-api 10절 근거 주석 포함).
- 같은 근거로 함께 누락돼 있던 `web/app/api/admin/collect-runs/route.ts`(POST가 `runCollectJob`을
  동기 호출 — 13-1절)와 `web/app/api/chat/route.ts`(DeepSeek 스트리밍 — 10절)에도 추가.
- `web/app/api/jobs/notify/route.ts`는 미추가 — [[anyang-backend-api]] 7절 어디에도 이 잡이
  300초 한도를 전제한다는 서술이 없다(pg_cron 5분 주기, 사용자별 코사인 유사도 매칭 정도로
  수집+임베딩 연속 호출과 성격이 다름). 설계 근거가 없는 라우트에 추가하지 않은 것은 타당함 —
  필요해지면 그때 설계에 근거를 먼저 적어야 한다.
- 검증: `web/test` 132/132 통과, `npm run build` 성공(2026-09-28 재검수 1차 실행 확인).
- 결론: 원 지적 사항 해결. 새 차단 항목 없음.

## Links

- [[anyang-backend-api]]
- [[anyang-youth-policy-assistant]]
