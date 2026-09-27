# Bootstrap — 이 체계를 새 프로젝트로 옮기기

이 문서는 자동으로 로드되지 않는다. 필요할 때만 읽는다.

## 방법 1 — 폴더 복사 (권장)

이 폴더에서 아래를 복사한다. 이것이 체계의 전부다.

```text
CLAUDE.md  AGENTS.md  index.md  log.md
.claude/rules/  .claude/agents/  .claude/skills/
scripts/  prompts/
AI-Sessions/   (빈 폴더 구조 + .gitkeep)
```

복사 후 새 프로젝트에서 정리할 것:

1. `index.md`의 Projects / Concepts / Decisions / Sources / Errors 섹션을 비운다.
2. `log.md`의 Log 항목을 비운다.
3. `AI-Sessions/wiki/`의 프로젝트별 문서를 지운다. `concepts/glossary.md`는 파일을 남기고
   도메인 용어 표만 비운다 — lint가 glossary 존재를 검사한다.
4. `bash scripts/validate-template.sh`와 `bash scripts/lint-wiki.sh`가 통과하는지 확인한다.
5. 프로젝트 고유 정보(기술 스택, 페이지, 도메인 용어)를 `AI-Sessions/wiki/projects/`와
   `glossary.md`에 채운다.

1~4단계는 `export-template` 스킬이 자동화한다 — 원본 폴더에서
`python .claude/skills/export-template/export.py <출력경로>` 를 실행하면 위 정리를 마친
배포용 ZIP이 나온다. 원본은 건드리지 않으므로, 원본을 계속 쓰면서 배포본만 뽑을 때 쓴다.

## 방법 2 — 빈 폴더에서 재생성 요청

원본 폴더에 접근할 수 있다면 방법 1이 항상 낫다. 접근할 수 없을 때만 쓴다.
이 경우 규칙 내용을 에이전트가 재구성하므로 원본과 정확히 일치하지 않을 수 있다.

아래를 붙여넣는다.

```text
Obsidian 기반 AI 업무 위키에 개발 멀티 에이전트 체계를 얹어서 만들어줘.

폴더: .claude/{rules,agents,skills}/, AI-Sessions/{raw,conversations}/,
AI-Sessions/wiki/{sources,concepts,decisions,errors,projects,design,dev-tasks}/,
prompts/, scripts/. 빈 폴더에는 .gitkeep을 둔다.

CLAUDE.md는 라우터로 만든다 — 규칙 전문을 담지 말고 어디를 읽을지만 가리킨다.
지식 관리 규칙은 .claude/rules/knowledge-ops.md, 개발 규칙은
.claude/rules/dev-common.md에 각각 하나씩만 둔다. 같은 규칙을 두 파일에 적지 않는다.

지식 관리 명령은 save / ingest / query / lint 네 개로 고정한다. 저장 전에 5가지 필터를
적용한다: 반복 재사용 / 인수인계 필수 / 결정 근거 추적 / 반복 금지 리스크 / 팀 공통 규칙.
하나도 해당하지 않으면 저장하지 않고 이유를 설명한다.

개발 에이전트 6종을 .claude/agents/에 만든다: pm(진입점·분배·코드 안 씀), backend(서버·API),
frontend(화면), database(스키마), code-review(검수·수정 권한 없음), git-manager(커밋·푸시).
개발 순서는 설계 → 문서화 완료 → 구현이다. 문서가 끝나기 전에 코드를 쓰지 않는다.
push와 git init은 사용자 승인 없이 하지 않는다.

wiki 문서 frontmatter는 type/date/status/owner/source, 본문은
Summary/Context/Details/Links로 한다. 문서를 만들면 index.md에 등록한다.

scripts/lint-wiki.sh를 만들어 frontmatter 누락, 깨진 [[링크]], index.md 미등록,
제목 중복, 규칙 문서가 가리키는 경로의 실재 여부를 검사하게 한다.

사람이 읽는 가이드라인은 한국어로, 명령 키워드는 영어로 고정한다.
```

## 왜 전문 복제를 두지 않는가

이전 버전(1.1.0)은 `CLAUDE.md`, `dev-common.md`, 에이전트 정의 6종, `lint-wiki.sh`를
이 파일에 전문 그대로 복제해 담고 있었다(666줄). 원본을 고치면 이 사본이 조용히 낡아,
이 프롬프트로 만든 프로젝트가 낡은 규칙을 갖게 된다.

`dev-common.md`의 "같은 내용을 다른 파일에 복제하지 않는다"에 직접 위배되므로 제거했다.
체계의 원본은 항상 이 폴더의 실제 파일이다.
