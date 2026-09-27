---
paths:
  - "AI-Sessions/**"
  - "index.md"
  - "log.md"
---

# Knowledge Ops — 지식 관리 규칙

`save`, `ingest`, `query`, `lint`를 실행할 때, 그리고 vault 문서를 읽거나 쓸 때 적용된다.
vault 문서(`AI-Sessions/`, `index.md`, `log.md`)를 다룰 때만 자동 로드된다.

이 파일이 지식 관리 규칙의 유일한 원본이다. 같은 내용을 다른 파일에 복제하지 않는다.

## Raw / Wiki Separation

`AI-Sessions/raw/`는 불변 자료 저장소다. 계약서, 회의록, 기사 원문, 고객 문의 원문처럼
나중에 근거로 다시 확인해야 하는 자료를 둔다. 에이전트는 raw 파일을 수정하거나 삭제하지 않는다.

raw를 바탕으로 요약, 판단, 결정, 기획 자료를 만들 때는 반드시 `AI-Sessions/wiki/` 아래에
별도 문서를 만든다.

## Wiki Categories

| 폴더 | 담는 것 |
|---|---|
| `AI-Sessions/wiki/sources/` | raw 자료 요약과 출처 맥락 |
| `AI-Sessions/wiki/concepts/` | 반복해서 쓰는 개념, 용어, 프레임워크 |
| `AI-Sessions/wiki/decisions/` | 의사결정, 근거, 결정권자, 날짜 |
| `AI-Sessions/wiki/errors/` | 실패한 접근, 반복하면 안 되는 실수 |
| `AI-Sessions/wiki/projects/` | 프로젝트별 진행 맥락과 산출물 |
| `AI-Sessions/wiki/design/` | 디자인 원칙, IA, 화면 설계 가이드 |
| `AI-Sessions/wiki/dev-tasks/` | 개발 작업 단위, 의존성, 구현 메모 |
| `AI-Sessions/conversations/` | 세션 인수인계 (확정 전 임시 저장) |
| `AI-Sessions/conversations/archive/` | 통합 완료된 인수인계 보관 (과거 기록, 기본 조회 대상 아님) |

## Save Filter

무분별한 저장은 맥락 오염을 만든다. `save` 전에 확인한다 — 이 정보가:

1. 향후 실무에 반복해서 재사용될 데이터인가?
2. 다른 에이전트나 동료가 프로젝트를 이어받기 위해 반드시 읽어야 하는가?
3. 의사결정의 근거와 결정권자를 나중에 추적할 필요가 있는가?
4. 실패한 방식이라 다시 시도하면 안 되는 리스크 정보인가?
5. 팀 전체가 맞추어야 하는 공통 규칙이나 디자인 가이드인가?

하나도 만족하지 않는 일회성 답변, 감상, 사소한 표현 변경은 wiki에 저장하지 않는다.
저장하지 않았으면 그 이유를 짧게 설명한다. 판단은 아래 "Jev 보조 판단"의 `save-filter`로 먼저 한다.

## Jev 보조 판단

Bash가 있는 세션은 문서 판단 전에 `scripts/jev.py`를 먼저 돌린다. 결과는 참고용이다 — 최종 판단은
실행한 쪽이 하고, 확률을 보고에 옮겨 적지 않는다. 종료 코드 3(Jev 사용 불가)이면 예전처럼 직접 판단한다.

| 언제 | 명령 |
|---|---|
| 작업 시작 전 관련 wiki 문서 찾기, `query`, `ingest` 교차 참조 | `python scripts/jev.py docs "<작업 설명>"` |
| 새 wiki 문서를 만들기 전 중복 확인 | `python scripts/jev.py dup "<새 문서 주제>"` |
| `save` 전 Save Filter | `python scripts/jev.py save-filter "<저장 후보 요약>"` |

- 외부로 나가는 것은 넘긴 문장과 `index.md` 한 줄 요약뿐이다. `AI-Sessions/raw/` 원문, 개인정보,
  비밀정보는 넘기지 않는다. 요약해서 넘긴다.
- pm처럼 Bash가 없는 에이전트는 호출하는 쪽이 `docs` 결과를 작업 지시서의 "먼저 읽을 문서"에 넣는다.
- 강제 장치(훅 차단, 린트 FAIL, 권한)에는 쓰지 않는다. `scripts/test_rules.py`가 검사한다.

## Ingest와 Integration

`ingest`는 단순 요약이 아니라 **통합**이다. 새 자료를 받으면:

1. `sources/`에 출처 요약 문서를 만든다.
2. 기존 `concepts/`, `decisions/`, `projects/`, `errors/`를 검토해 교차 참조를 갱신한다.
3. 새 개념이나 결정이 있으면 별도 문서로 만든다.
4. 관련 프로젝트 문서에 backlink를 추가한다.

목표는 매번 원문을 재검색하지 않고도, 컴파일된 wiki 체계에서 바로 여러 문서를 합성하는
복잡한 질문에 답할 수 있게 유지하는 것이다.

## Document Format

새 wiki 문서는 이 형식을 따른다. 이것이 문서 형식의 유일한 원본이며,
개발 에이전트가 만드는 설계·태스크 문서에도 동일하게 적용된다.

```markdown
---
type: decision | source | concept | error | project | design | dev-task | handoff
date: YYYY-MM-DD
status: draft | active | superseded
owner: 작성한 에이전트 이름, 공용 문서는 shared
source: optional — raw 자료면 AI-Sessions/raw/ 경로
decided_by: type이 decision이면 필수 — 결정한 사람 (예: user)
---

# 제목

## Summary

## Context

## Details

## Links
```

`owner`는 필수다. 자신의 에이전트 이름을 쓴다. `shared`는 두 경우에만 쓴다: 여러 에이전트가
함께 쓰는 문서, 그리고 메인 세션이 쓴 문서(메인 세션에는 에이전트 이름이 없다).

인수인계 문서 이름은 `YYYY-MM-DD_<session-name>.md` 형식으로 한다.

인수인계 문서의 내용이 관련 wiki 문서(`decisions/`, `projects/`, `errors/`, `design/` 등)로
통합 완료되면 `AI-Sessions/conversations/archive/`로 옮긴다. `query`는 기본적으로
`AI-Sessions/conversations/`(통합 전 활성 문서)까지만 보고, `archive/`는 사용자가 과거
기록을 명시적으로 요청할 때만 조회한다. archive 문서 자체의 삭제 여부는 별도로
사용자가 정한다 — 임의로 지우지 않는다.

### 확정 값과 제안 값

에이전트가 추측하거나 제안한 값이 확정된 사실처럼 퍼지는 것을 막는 표기다.

- 사용자가 확정한 값만 표시 없이 쓴다. 확정 전 값에는 `(미확정)`을 붙이고, 해당 프로젝트
  문서의 "확인이 필요한 항목" 절에 올린다.
- 설계 문서의 값은 사용자의 설계 승인으로 확정된다. 표시를 지우는 시점은
  `.claude/rules/dev-common.md`의 Development Kickoff Order 4단계를 따른다.
- 결정 문서는 `decided_by`에 결정한 사람을 적는다. 결정권자가 없는 결정은 아직 제안이다.
- 다른 에이전트가 소유한 문서의 값은 옮겨 적지 않고 `[[문서#섹션]]`으로 링크한다.
  같은 값이 두 문서에 있으면 한쪽만 고쳐져 어긋난다.

## Link Rules

문서가 늘어도 서로 찾아갈 수 있게 하는 규칙이다. 이것이 링크 규칙의 유일한 원본이다.

- **양방향**: A가 B를 링크하면 B도 A를 링크한다. 역방향 링크는 `## Links` 섹션에 넣는다.
  한쪽만 있으면 그 문서를 고칠 때 영향 범위를 볼 수 없다. B의 소유자가 다르면 B를 직접
  고치지 않는다. 소유자에게 요청하거나 보고에 "역링크 필요: B ← A"로 적는다.
- **등록**: 문서를 만들면 `index.md`에 `- [[문서]] — 한 줄 요약` 형식으로 링크를 추가한다.
  요약은 문서를 열지 않고도 관련 여부를 가릴 수 있게 한다. 지우면 그 항목도 지운다.
  개발 작업 중에는 pm만 `index.md`와 `log.md`를 고친다. 다른 에이전트는 새 문서 경로를 보고한다.
- **로그**: `log.md` 항목은 `YYYY-MM-DD HH:mm | command | summary | linked files` 형식으로 맨 끝에
  시간순으로 추가한다. 시각을 확인할 수 없으면(Bash가 없는 pm 등) 추측하지 말고 `HH:mm` 자리에
  `--:--`를 쓴다. 형식과 순서는 린터가 검사한다.
- **고아 금지**: `index.md` 말고도 최소 한 문서가 링크해야 한다. 아무도 안 가리키는
  문서는 쓰이지 않는다는 뜻이므로, 관련 문서에서 링크하거나 지운다.
- **결정 교체**: 뒤집힌 결정은 `status: superseded`로 바꾸고 새 문서에서 링크한다.
  살아있는 문서가 superseded 문서를 근거로 링크하면 새 문서를 가리키도록 고친다.
- **이름 = 링크**: 문서 이름은 vault 전체에서 유일해야 한다. 같은 파일명이 두 폴더에
  있으면 `[[링크]]`가 어느 쪽인지 알 수 없다.
- **표기**: `[[문서]]`, `[[문서|표시명]]`, `[[문서#섹션]]` 모두 쓸 수 있다.

## 검증

문서 작업이 끝나면 실행한다.

```bash
bash scripts/lint-wiki.sh
```

- 검사 대상은 `AI-Sessions/wiki/` 전체와 `AI-Sessions/conversations/`의 인수인계 문서다
  (archive 제외). 인수인계 문서는 frontmatter와 파일명만 본다.
- `FAIL`은 깨진 것이다. 고치기 전에는 작업 완료를 보고하지 않는다.
- `WARN`은 사람 판단이 필요한 것이다(역링크 미완성, superseded 참조, 고아 문서 등).
  통과는 되지만 그대로 둘지 판단하고 넘어간다.
- 항목이 많으면 종류별 10개만 나온다. 전체는 `--all`로 본다.
- vault 검색(중복 확인, `query`, `ingest` 교차 참조)은 위 "Jev 보조 판단"을 따른다. 그 판단의
  재료가 `index.md` 한 줄 요약이므로, 요약은 문서를 열지 않고도 주제를 알 수 있게 쓴다.

## 규칙 검토

규칙·에이전트 설정의 충돌 검토를 요청받으면 따른다. 세션이 바뀔 때마다 처음부터 다시 검토해
개선 항목이 끝없이 나오는 것을 막는다.

1. 먼저 기준 문서 [[rule-review-baseline]]을 읽는다. 없으면 이 절차로 첫 검토를 한 뒤
   decisions 폴더에 만든다.
2. 기준 문서의 "해결한 항목"과 "수용한 한계"에 있는 것은 다시 보고하지 않는다. 적혀 있는
   재검토 조건이 실제로 발생했을 때만 다시 올린다.
3. 새로 찾은 항목은 차단 또는 보류로 판정한다. 차단은 실제 흐름에서 작업이 멈추거나 잘못된
   산출물이 남는 것이고, 파일:줄과 구체적인 시나리오를 함께 적는다. 그 밖은 모두 보류다.
4. 수정은 차단만 제안한다. 보류는 사용자 확인을 받아 기준 문서의 "수용한 한계"에 추가한다.
5. 새 차단 항목이 없으면 "기준 문서 대비 새 차단 항목 없음"이라고 답하고 끝낸다.
6. 규칙을 고치면 기준 문서의 "해결한 항목"에 올린다. 기계로 확인할 수 있는 것은
   `scripts/test_rules.py`에 검사를 추가해 같은 문제가 다시 생기지 않게 한다.

언제 규칙을 바꾸는지(변경 계기)는 기준 문서에 있다.

## Completion Rule

작업이 끝나면 보고한다. 개발 에이전트는 이 대신 `.claude/rules/dev-common.md` 규칙 10의 보고 형식을 따른다.

- 읽은 주요 파일
- 수정하거나 생성한 파일
- 저장 필터 적용 결과 (저장하지 않았다면 그 이유)
- 다음 세션에서 이어갈 때 먼저 볼 문서
