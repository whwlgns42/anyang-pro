# CLAUDE.md — 라우터

Claude Code가 이 Obsidian vault에서 일할 때 따르는 업무 규약의 진입점이다.

목표는 개인 메모장이 아니라, 여러 AI 에이전트와 사람이 같은 업무 맥락을 공유할 수 있는
안정적인 비즈니스 프로세스다.

이 파일은 라우터다. 규칙 전문은 담지 않고 어디를 읽어야 하는지만 가리킨다.

## Core Operating Rules

1. 메인 세션과 pm은 작업을 시작하기 전에 `index.md`, `log.md`(최근 10개 항목), 관련 `AI-Sessions/wiki/` 문서를 먼저 확인한다. 다른 서브에이전트는 pm의 작업 지시서에 적힌 문서와, 규칙이 요구하는 참조(용어집, 중복 확인을 위한 `index.md` 검색, 호출 전 상대의 design 문서)만 읽는다.
2. `AI-Sessions/raw/` 안의 원본 자료는 수정하거나 삭제하지 않는다.
3. 가공된 지식, 결정, 에러, 프로젝트 문서는 `AI-Sessions/wiki/` 아래에 저장한다.
4. 세션 인수인계가 필요하면 `AI-Sessions/conversations/`에 저장한다.
5. 중요한 저장 작업 후에는 `index.md`와 `log.md`를 갱신한다. 개발 작업 중에는 pm만 갱신한다.
6. 사용자가 명시적으로 원하지 않는 한 민감정보, 토큰, 비밀번호, 고객 개인정보를 저장하지 않는다.

## 명령 키워드

사람이 읽는 가이드라인은 한국어로 쓰고, 명령 키워드는 영어로 고정한다.
사용자는 자연어로 말할 수 있다 — "옵시디언에 저장해줘"는 `save`로 해석한다.

- `save`: 현재 작업 맥락을 저장한다.
- `ingest`: raw 자료를 wiki 자료로 가공한다.
- `query`: 기존 wiki와 log를 참조해 이전 맥락을 복원한다.
- `lint`: vault 구조와 규칙 위반을 점검한다.

네 명령의 상세 절차는 `.claude/rules/knowledge-ops.md`에 있다.

## Development Agent Architecture

개발 요청(코드 작성, 페이지·기능 구현, 버그 수정, 설계)은 `pm` 서브에이전트가 받아
나머지 에이전트에게 분배한다.

위 네 개 vault 명령은 메인 세션이 직접 처리한다. pm을 거치지 않는다.

## Project Scope Only

이 프로젝트는 전역 설정(`~/.claude/`)의 규칙, 스킬, 에이전트, 메모리, 훅을 사용하지 않는다.
다른 사람이나 다른 환경에서 같은 폴더를 열어도 동작이 같아야 하기 때문이다.

규칙은 이 폴더 안의 `CLAUDE.md`와 `.claude/`만 따른다. 에이전트는 `.claude/agents/`에 있는
것만 쓰고, 스킬은 프로젝트 `.claude/skills/`에 설치해서 쓴다.

전역 규칙 중 이 프로젝트에 필요한 내용은 이미 이 폴더 안 규칙에 흡수되어 있다.
전역 파일이 로드되더라도 따르지 않는다. 전역에만 있는 것이 필요해 보이면 임의로 가져다
쓰지 말고 사용자에게 먼저 묻는다.

이것은 행동 규칙이다. 전역 파일이 읽히는 것 자체는 막지 못한다. 완전히 차단하려면 전역
설정 파일을 비우거나 별도 사용자 환경에서 실행한다.

## Progressive Loading

| 필요한 것 | 읽을 파일 |
|---|---|
| save / ingest / query / lint 실행 | `.claude/rules/knowledge-ops.md` |
| 문서 형식 (frontmatter, 섹션 구조) | `.claude/rules/knowledge-ops.md` |
| 개발 공통 규칙, 문서 일관성 규칙 | `.claude/rules/dev-common.md` |
| 규칙·에이전트 충돌 검토 | `.claude/rules/knowledge-ops.md`의 규칙 검토 절 |
| 에이전트별 역할과 절차 | `.claude/agents/` |
| 설치된 스킬·플러그인 대장 | `.claude/skills/README.md` |
| 개발 도구(gh CLI 등) 설치법 | `.claude/rules/dev-environment.md` |
| 용어 정의 | `AI-Sessions/wiki/concepts/glossary.md` |
| 현재 프로젝트 맥락 | `AI-Sessions/wiki/projects/` |
| 명령별 붙여넣기용 프롬프트 | `prompts/` |
