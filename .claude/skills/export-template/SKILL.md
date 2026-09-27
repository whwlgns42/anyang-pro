---
name: export-template
description: 이 vault를 남에게 나눠줄 깨끗한 템플릿 ZIP으로 내보낸다. 우리 작업 기록(log.md 항목, 진행 중인 프로젝트 문서, 개인 설정)을 초기 상태로 되돌린 복사본을 만들고 ZIP으로 묶는다. 원본은 건드리지 않는다. "템플릿 내보내기", "배포용으로 정리", "기록 지우고 export", "남에게 줄 zip"이라고 하면 쓴다.
---

# export-template

이 vault는 배포용 템플릿이면서 동시에 우리 작업 공간이다. 그대로는 남에게 못 준다 —
`log.md`에 우리 작업 이력, `AI-Sessions/wiki/`에 진행 중인 프로젝트 문서,
`.claude/settings.local.json`에 개인 permission 설정이 들어 있다.

이 스킬은 그 기록을 전부 초기 상태로 되돌린 **복사본**을 만들어 ZIP으로 내보낸다.
초기화 규칙은 `prompts/bootstrap-dev-agents.md`의 "방법 1"과 같다. 원본 폴더는
읽기만 하고 수정하지 않는다.

## 실행

프로젝트 루트에서:

```bash
python .claude/skills/export-template/export.py <출력경로>
```

`<출력경로>.zip` 이 생성된다. 출력 경로는 vault 바깥이어야 한다. 예:

```bash
python .claude/skills/export-template/export.py ~/Desktop/ai-wiki-template
```

## 무엇을 되돌리는가

| 대상 | 조치 |
|---|---|
| `log.md` | `## Log` 아래 항목 전부 삭제 |
| `index.md` | Projects/Concepts/Decisions/Sources/Errors 섹션을 빈 상태 문구로. Concepts는 `[[glossary]]`만 |
| `AI-Sessions/wiki/**/*.md` | `concepts/glossary.md` 빼고 전부 삭제 |
| `glossary.md` | 파일·frontmatter·구조 유지, 도메인 용어 표와 미확정 용어 목록만 비움 |
| `.claude/settings.local.json` | 삭제 |
| `.claude/rules/dev-environment.md` | gh CLI 행 상태를 `미설치`로 되돌림 |
| `.obsidian/workspace*`, `cache` | 복사에서 제외 |

프레임워크(규칙, 에이전트 6종, 스크립트, 프롬프트, 이 스킬 자신, 빈 폴더 + `.gitkeep`)는
그대로 포함된다.

## 검증

`export.py`는 ZIP을 만들기 전에 staging 사본에서
`bash scripts/validate-template.sh` 와 `bash scripts/lint-wiki.sh` 를 돌린다.
둘 중 하나라도 실패하면 ZIP을 만들지 않고 멈춘다.

스킬 자체를 점검하려면:

```bash
python .claude/skills/export-template/export.py --self-check
```

## 판단이 필요한 경우

- `AI-Sessions/wiki/`에 glossary 말고도 **유지해야 할** 공용 문서가 생겼다면
  (예: 여러 프로젝트가 공유하는 개념 문서), `export.py`의 `reset_wiki_docs`
  `keep` 집합에 추가한다.
- `AI-Sessions/raw/`에 실제 자료가 들어 있으면 이 스킬은 그것도 복사한다.
  배포 전에 `raw/`를 비웠는지 사용자에게 확인한다 — `TEMPLATE_MANIFEST.md`의
  Distribution Rule은 실제 자료를 배포물에 넣지 말라고 한다.
