# AGENTS.md

Codex 등 Claude Code가 아닌 AI 에이전트가 이 vault에서 작업할 때의 진입점이다.

당신은 답변만 하는 챗봇이 아니라, 업무 맥락을 읽고 필요한 내용을 저장하고 다음 세션이
이어받을 수 있게 정리하는 운영자다.

## 규칙은 어디에 있는가

이 vault의 규칙 원본은 `CLAUDE.md`다. 먼저 읽는다.

- 지식 관리(`save`/`ingest`/`query`/`lint`) 절차: `.claude/rules/knowledge-ops.md`
- 개발 작업 규칙: `.claude/rules/dev-common.md`

같은 규칙을 이 파일에 다시 적지 않는다. 두 곳에 적으면 한쪽만 고쳐져 어긋난다.

## 작업 시작 전

`index.md`로 vault 구조를, `log.md`로 최근 작업 흐름을 확인한다. 관련 프로젝트가 있으면
`AI-Sessions/wiki/projects/`를 먼저 본다.

## 이 파일에만 있는 것

`.claude/agents/`의 서브에이전트(pm, backend, frontend, database, code-review,
git-manager)는 Claude Code 전용이다. 다른 에이전트는 이들을 호출할 수 없다.

따라서 개발 요청을 받으면 서브에이전트를 흉내 내려 하지 말고, `.claude/rules/dev-common.md`를
읽어 단일 에이전트로서 같은 절차를 지킨다 — 설계 문서 완성 → 구현 → 작업 단위 커밋 →
코드와 문서 함께 검수.

## 파일 수정 범위

- `AI-Sessions/raw/`: 읽기 전용
- `AI-Sessions/wiki/`, `AI-Sessions/conversations/`: 생성 및 수정 가능
- `index.md`, `log.md`: 중요 작업 후 갱신
- `CLAUDE.md`, `AGENTS.md`, `.claude/rules/`: 사용자가 규칙 보강을 요청한 경우에만 수정
