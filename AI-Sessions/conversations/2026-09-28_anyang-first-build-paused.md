---
type: handoff
date: 2026-09-28
status: active
owner: shared
---

# 안양 비서 1차 구현 후 중단 — 다음 세션 인수인계

## Summary

1차 구현(database·backend·frontend)과 code-review까지 끝났다(HEAD `0085938`, 로컬 커밋 22개, 원격 없음). 테스트 103개·빌드 통과, 외부 자원은 전부 모킹이라 실제 DB·브라우저 실행은 한 번도 안 했다. 사용자 지시로 여기서 중단했다(2026-09-28 01:59). 다음 세션은 아래 "다음 할 일" 1번부터 시작한다.

## Context

진행 맥락과 확인 항목은 [[anyang-youth-policy-assistant]]에 있다(확인 항목 22·23 참고). 이전 인수인계는 [[2026-09-27_anyang-implementation-paused]]. 설계 변경 22·23 때문에 [[anyang-backend-api]]는 "승인된 설계"에서 빠져 있다.

## Details

### 이번 중단 직전 사용자 결정 (프로젝트 문서에 아직 반영 안 됨 — pm이 반영)

- 22 채팅 공지 인용 카드: **(a) 넣는다**(2026-09-28, user). 채팅 스트림에 인용 공지 목록(id·제목·원문 URL·게시일)을 보내는 계약을 backend-api 3절에 추가. 계약 세부는 backend 제안대로 확정.
- 23 관리자 공지 숨김: **(a) 관리자 공지 목록 추가**(2026-09-28, user — "1번부터 시작"으로 답함, 선택지 1번 = `GET /api/admin/notices` + 관리자 목록 화면의 숨김/해제). 사용자가 다음 세션 시작점으로 지정.
- 포스터 이미지 OCR: **나중에 결정**(2026-09-28, user). 1차는 제목+본문만, 실제 수집 데이터로 매칭 품질 확인 후 재검토.
- taste-skill: frontend는 UI 개발에 `design-taste-frontend`를 쓴다(2026-09-28, user). 규칙은 `.claude/rules/dev-common.md` Skill Usage에 추가(미커밋).

### 다음 할 일 (순서)

1. **23번**: backend가 `GET /api/admin/notices`(숨김 포함, 페이지네이션) 설계 추가 → frontend가 관리자 공지 목록·숨김/해제 화면 설계 반영 → 22와 함께 "승인된 설계" 재기록 → 구현.
2. **22번**: backend-api 3절에 인용 공지 계약 추가 → backend 구현 → frontend 인용 카드 연결.
3. **수집기 셀렉터 수정(구현 버그, 설계 변경 아님)**: `web/lib/collector.ts`가 임시 셀렉터(`table.board-list`, `.board-view-*`)라 실제로는 0건 수집된다. 실제 구조(메인 세션 2026-09-28 확인, UTF-8, robots.txt 404 = 제한 없음 처리는 이미 맞음):
   - 목록 `table.p-table tbody tr` → `td.p-subject a`(제목, 상대 href `./selectBbsNttView.do?key=3543&bbsNo=1184&nttNo=<n>&...`, `&amp;` 디코드), 마지막 td `<time>` 게시일(YYYY-MM-DD). 고유키 nttNo.
   - 상세: 제목 `span.p-table__subject_text`, 본문 `td.p-table__content`, 첨부 `ul.p-attach a.p-attach__link`. 상세에는 게시일이 없으므로 목록 값을 쓴다.
   - 실제 구조 픽스처(목록 1행, 상세 1건)로 파서 테스트 교체. 원문은 `web/` 픽스처로만.
4. **taste-skill 적용**: frontend가 `Skill: design-taste-frontend`를 호출해 공통 레이아웃·디자인 토큰·로그인·온보딩·채팅·피드 화면에 적용. 관리자 표 화면은 스킬 범위 밖이라 가독성·일관성만 참고. 보고에 스킬 호출 여부 기재.
5. lint WARN 3건 정리: errors 문서 [[anyang-preferences-put-missing-mask-pii]]가 superseded로 링크됨(상태 확인), backend-api ← errors 역링크.
6. 위 변경분 code-review 재검수.

### 사용자 결정 대기 (기본값으로 진행 중)

- 정리 잡 2개(`web/db/jobs/UNAPPLIED_*.sql`) pg_cron 등록 — 보류(권장: DB 연결 후 첫 배포 때).
- 설계 문서의 `(미확정)` 표기 잔존(설계 잠금 훅이 문장 중간 표기 삭제를 막음) — 그대로(권장: 훅을 좁게 수정).
- 앱 위치 `web/` — 유지.
- 커밋 안 된 파일: `scripts/jev.py`(인코딩 1줄), `.claude/rules/dev-common.md`(jev dup 규칙 + taste-skill 규칙), `.claude/skills/README.md`, `skills-lock.json`, `.claude/skills/` 새 스킬 폴더들(사용자 설치). 커밋 여부 미정.

### 사용자 준비 필요

`DATABASE_URL`(개발용 Supabase), `psql` 또는 Supabase SQL Editor, `AUTH_SECRET`, Google OAuth 클라이언트, DeepSeek·Gemini 키, VAPID 키(+ `NEXT_PUBLIC_VAPID_PUBLIC_KEY`에 공개 키 같은 값), `ADMIN_EMAILS`, 수집기 User-Agent 문의 이메일.

### 운영 메모 (다음 세션 주의)

- 오래 실행된 pm 세션(`pm-resume`)은 작업 도중 도착한 메시지를 반영하지 못했다(수집기 수정·인용 카드 결정·taste-skill 지시가 세 번 누락). 이번엔 메인 세션이 중지했다. 다음에는 **새 pm을 이 문서 기준의 완전한 지시서로 호출**하고, 도중 지시는 pm이 한 단계를 끝낸 뒤 보낸다.
- pm이 부른 하위 에이전트의 완료 알림이 메인 세션으로 오는 경우가 있다. 메인이 pm에게 전달하거나 pm이 git log·파일로 확인한다.
- 재개 방법: 메인 세션이 이 문서를 읽고 `python scripts/jev.py docs "<작업>"`로 먼저 읽을 문서를 뽑아 pm을 "단계: 설계"(22·23)로 호출한다.

## Links

- [[anyang-youth-policy-assistant]]
- [[2026-09-27_anyang-implementation-paused]]
- [[anyang-backend-api]]
- [[anyang-frontend-screens]]
- [[anyang-preferences-put-missing-mask-pii]]
