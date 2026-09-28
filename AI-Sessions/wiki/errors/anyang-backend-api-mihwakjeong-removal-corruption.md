---
type: error
date: 2026-09-28
status: active
owner: code-review
---

# 안양 비서 — `anyang-backend-api.md` 설계 재승인 처리 중 `(미확정)` 제거가 문장·앵커를 깨뜨림

## Summary

backend가 `f525792..ed7c751` 구간에서 `anyang-backend-api.md`를 `status: draft` →
`active`로 바꾸며 승인으로 확정된 `(미확정)` 표시를 지우는 과정에서(`.claude/rules/dev-common.md`
Kickoff 4단계가 허용하는 범위), 일부 위치에서 문자열 `(미확정)`을 기계적으로 지우기만 해서
남은 문장이 깨졌다.

## Context

- Kickoff 4단계는 승인된 설계 문서에 대해 "`status` 줄과 `(미확정)` 표시만" 고칠 수 있다고
  허용한다. 이번 변경은 그 허용 범위 안에서 일어났지만 실행이 정확하지 않았다.

## Details

1. 문장 파손 — `AI-Sessions/wiki/design/anyang-backend-api.md:940`
   ```
   정체된 `pending` 재시도 임계값(제안 10분)은 backend 제안값이며이다.
   ```
   원문은 "backend 제안값이며 (미확정)이다."였다. `(미확정)`만 지우면서 앞뒤 조사가
   그대로 붙어 "이며이다"라는 비문이 됐다. `(미확정)이다` → `이다`로 고쳐야 한다(예: "backend
   제안값이다.").

2. 위키링크 앵커 훼손(같은 파일 여러 곳) — 예:
   `AI-Sessions/wiki/design/anyang-backend-api.md:409, 500, 541` 및 다른 다수 위치.
   `[[anyang-database-schema#notices (미확정)]]` 같은 링크에서 `(미확정)` 부분만 지워
   `[[anyang-database-schema#notices]]`처럼 앵커가 줄 바꿈 뒤에 남아 ` ]]`로 시작하는
   줄이 생겼다(예: 409줄 `\n ]]에 있다(컬럼: ...`). 렌더링 자체는 깨지지 않지만
   Obsidian에서 해당 섹션으로 정확히 이동하지 않는다 — 참고로 이 앵커들은 이번 diff
   이전부터도 `anyang-database-schema.md`의 실제 헤딩(`#### notices — 공지 자격요건
   구조화 컬럼 없음(확정)` 등)과 정확히 일치하지 않았으므로 새로 생긴 문제는 아니고,
   기존의 부정확한 앵커 표기가 이번 기계적 치환으로 더 잘려 나갔다.
   `bash scripts/lint-wiki.sh`는 링크 대상 문서의 존재만 확인하고 앵커(heading) 일치는
   검사하지 않아 이 문제를 잡지 못한다(기존 알려진 한계).

## 재확인 (2026-09-28, code-review)

사용자 결정 26 반영(2026-09-28)으로 backend가 문장·앵커를 고쳤다. `anyang-backend-api.md:1015`가
"backend 제안값이다."로 정상 문장이 됐고(과거 940행), 과거 409·500·541행 근방에 있던 줄 바꿈
뒤 ` ]]`로 시작하는 잘린 앵커도 더 이상 없다(현재 남은 유일한 줄바꿈 앵커는 150행
`[[anyang-database-schema#users ]]`로, 이 문서 Details 2절에 적었듯 이번 버그 이전부터 있던
것이라 새로 생긴 문제가 아니다). 문장·앵커 파손은 해결됐다. `status`는 재발 방지 참고용으로
`active` 유지.

## 재발 방지

`(미확정)` 표시를 지울 때 문자열 치환이 아니라 문장·링크 단위로 확인하며 지운다. 특히
`... (미확정)이다`, `... (미확정)]]`처럼 표시 앞뒤에 조사·괄호가 붙는 경우 남는 문장이
말이 되는지 확인한다.

## Links

- [[anyang-backend-api]]
- [[anyang-database-schema]]
- [[anyang-youth-policy-assistant]]
