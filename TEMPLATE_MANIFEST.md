# Template Manifest

## Name

AI-Agent-Wiki-Template

## Version

1.5.0

## Purpose

더미 데이터 없는 Obsidian 기반 AI 업무 위키 템플릿입니다.

Claude Code, Codex, 기타 AI 에이전트가 동일한 업무 맥락을 공유하고, 저장과 참조를 반복 가능한 프로세스로 운영하도록 돕습니다.

1.1.0부터는 지식 관리 위에 개발 멀티 에이전트 체계(pm, backend, frontend, database,
code-review, git-manager)와 문서 일관성 장치가 포함됩니다.

1.2.0에서 규칙 중복을 제거했습니다. `CLAUDE.md`는 라우터가 되고, 지식 관리 규칙은
`.claude/rules/knowledge-ops.md`로 분리했습니다.

1.3.0에서 린터를 `scripts/lint_wiki.py`로 재작성했습니다. 링크 그래프를 검사해
양방향 링크 누락, 고아 문서, superseded 참조, index.md의 죽은 링크를 잡습니다.
FAIL(깨짐)과 WARN(판단 필요)을 나눕니다. 문서 500개에서 0.5초가 걸립니다 —
이전 bash 판은 문서 61개에 63초가 걸려 실사용이 불가능했습니다.

1.4.0에서 `export-template` 스킬을 추가했습니다. 이 vault를 작업 공간으로 쓴 뒤
작업 기록(log.md 항목, 진행 중 프로젝트 문서, 개인 설정)을 초기 상태로 되돌린
깨끗한 배포 ZIP을 만듭니다. 원본은 건드리지 않습니다.

1.5.0에서 "Jev 도입 제안" 규칙(`.claude/rules/dev-common.md`)을 추가했습니다. 개발 중
좁고 반복되는 LLM 판단을 만나면 에이전트가 Jev(TypeSafe) 도입 시 속도·토큰 절감 추정치를
근거와 함께 보고합니다. index.md 항목에 한 줄 요약을 붙이는 관례도 함께 들어갔습니다.

## Required Files

- `README.md`
- `START_HERE.md`
- `CLAUDE.md`
- `AGENTS.md`
- `index.md`
- `log.md`
- `VERSION`
- `LICENSE.md`
- `TEMPLATE_MANIFEST.md`
- `.claude/rules/dev-common.md`
- `.claude/rules/knowledge-ops.md`
- `.claude/rules/dev-environment.md`
- `.claude/skills/README.md`
- `.claude/skills/export-template/SKILL.md`
- `.claude/skills/export-template/export.py`
- `.claude/agents/pm.md`
- `.claude/agents/backend.md`
- `.claude/agents/frontend.md`
- `.claude/agents/database.md`
- `.claude/agents/code-review.md`
- `.claude/agents/git-manager.md`
- `scripts/lint_wiki.py`
- `scripts/lint-wiki.sh`
- `scripts/agent_guard.py`
- `scripts/test_rules.py`
- `.claude/settings.json`
- `scripts/validate-template.sh`
- `prompts/bootstrap-dev-agents.md`
- `AI-Sessions/wiki/concepts/glossary.md`

## Required Directories

- `AI-Sessions/raw/`
- `AI-Sessions/conversations/`
- `AI-Sessions/conversations/archive/`
- `AI-Sessions/wiki/sources/`
- `AI-Sessions/wiki/concepts/`
- `AI-Sessions/wiki/decisions/`
- `AI-Sessions/wiki/errors/`
- `AI-Sessions/wiki/projects/`
- `AI-Sessions/wiki/design/`
- `AI-Sessions/wiki/dev-tasks/`
- `prompts/`
- `scripts/`
- `.claude/agents/`
- `.claude/rules/`
- `.claude/skills/`

## Scope Rule

이 템플릿은 사용자 전역 설정(`~/.claude/`)에 의존하지 않습니다. 규칙, 에이전트, 스킬은 모두 프로젝트 폴더 안에 둡니다. 다른 환경에서 같은 폴더를 열어도 동작이 같아야 하기 때문입니다.

## Distribution Rule

배포 ZIP에는 실제 고객 정보, 실제 프로젝트 자료, API 키, 인증 정보, 개인 메모, 예시 회의록을 넣지 않습니다.

## First Prompt

첫 실행 프롬프트는 `START_HERE.md`와 `prompts/first-setup.md`에 있습니다.

빈 폴더에서 이 체계 전체를 재현하는 프롬프트는 `prompts/bootstrap-dev-agents.md`에 있습니다.
