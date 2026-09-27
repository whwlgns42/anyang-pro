# AI-Agent-Wiki-Template

더미 데이터 없는 Obsidian AI 업무 위키 템플릿입니다.

이 템플릿은 사용자가 직접 폴더와 규칙을 모두 설계하지 않아도, Claude Code나 Codex 같은 에이전트에게 업무용 AI 위키 세팅을 맡길 수 있도록 구성되어 있습니다.

핵심 목적은 개인 메모 정리가 아니라, 여러 AI 에이전트가 같은 업무 맥락을 공유하는 안정적인 비즈니스 프로세스를 만드는 것입니다.

## 빠른 시작

1. 이 폴더를 내려받아 압축을 풉니다.
2. Obsidian에서 `Open folder as vault`를 선택합니다.
3. 이 폴더를 vault로 엽니다.
4. Claude Code 또는 Codex를 이 폴더에서 실행합니다.
5. `START_HERE.md`의 첫 실행 프롬프트를 에이전트에게 붙여넣습니다.

## 추천 사용 순서

1. 먼저 빈 템플릿 상태로 에이전트에게 구조 점검을 맡깁니다.
2. `raw/`에 실제 자료를 조금만 넣고 `ingest`를 테스트합니다.
3. `save`, `query`, `lint`가 예상대로 동작하는지 확인합니다.
4. 그 다음 실제 프로젝트 자료를 단계적으로 추가합니다.

## 포함된 것

- 빈 raw 저장소
- 빈 wiki 저장소
- 세션 인수인계 폴더
- Claude Code용 `CLAUDE.md`
- Codex용 `AGENTS.md`
- vault 지도 `index.md`
- 작업 로그 `log.md`
- 복사해서 쓰는 첫 실행 프롬프트 `START_HERE.md`
- 상황별 프롬프트 모음 `prompts/`
- 템플릿 검증 스크립트 `scripts/validate-template.sh`
- 개발 서브에이전트 6종 `.claude/agents/`
- 개발 공통 규칙 `.claude/rules/dev-common.md`
- 문서 일관성 검사 스크립트 `scripts/lint-wiki.sh`
- 이 체계를 새 프로젝트로 옮기는 방법 `prompts/bootstrap-dev-agents.md`

## 포함하지 않는 것

- 예시 고객 정보
- 예시 프로젝트
- 예시 회의록
- 개인 메모
- API 키나 토큰

## 폴더 구조

```text
AI-Agent-Wiki-Template/
├── CLAUDE.md
├── AGENTS.md
├── START_HERE.md
├── README.md
├── VERSION
├── index.md
├── log.md
├── .claude/
│   ├── settings.json      (훅과 권한 설정)
│   ├── agents/
│   │   ├── pm.md
│   │   ├── backend.md
│   │   ├── frontend.md
│   │   ├── database.md
│   │   ├── code-review.md
│   │   └── git-manager.md
│   ├── rules/
│   │   ├── knowledge-ops.md
│   │   ├── dev-common.md
│   │   └── dev-environment.md
│   └── skills/
│       ├── README.md      (스킬 대장, 역할별 권장 스킬)
│       └── export-template/
├── prompts/
├── scripts/
└── AI-Sessions/
    ├── raw/
    ├── conversations/
    └── wiki/
        ├── sources/
        ├── concepts/
        ├── decisions/
        ├── errors/
        ├── projects/
        ├── design/
        └── dev-tasks/
```

## 중요한 운영 원칙

- `raw/`는 불변 자료 저장소입니다. 에이전트가 원본을 수정하지 않게 하세요.
- `wiki/`는 가공된 지식 저장소입니다. 요약, 결정, 프로젝트 맥락은 여기에 둡니다.
- `conversations/`는 진행 중인 작업의 임시 인수인계 공간입니다. 확정된 내용은 wiki로 승격합니다.
- 모든 저장은 5가지 저장 필터를 통과해야 합니다.
- 사람이 읽는 규칙은 한국어로, 에이전트 명령 키워드는 `save`, `ingest`, `query`, `lint`처럼 영어로 고정합니다.

## 개발 멀티 에이전트 체계

지식 관리만이 아니라 실제 개발까지 이 vault 안에서 진행할 수 있습니다. 개발 요청은 `pm` 에이전트가 받아 나머지 에이전트에게 분배합니다.

| 에이전트 | 역할 |
|---|---|
| `pm` | 개발 요청의 진입점. 분배와 최종 보고 취합. 코드는 쓰지 않음 |
| `backend` | 서버, API, 비즈니스 로직 |
| `frontend` | 화면과 사용자 인터페이스 |
| `database` | 스키마, 마이그레이션, 쿼리 |
| `code-review` | 코드와 문서 모순 검수. 수정 권한 없음 |
| `git-manager` | 커밋과 푸시 승인 관리 |

역할별 권장 스킬은 `.claude/skills/README.md`에 있습니다.

핵심 동작 원칙은 네 가지입니다.

- **설계 우선**: 설계 문서를 완성하기 전에는 코드를 쓰지 않습니다.
- **점진적 로드**: `CLAUDE.md`는 라우터 역할만 합니다. 지식 관리 규칙은 `.claude/rules/knowledge-ops.md`, 개발 규칙은 `.claude/rules/dev-common.md`에 각각 한 곳에만 둡니다. 각 에이전트는 필요한 문서만 읽습니다.
- **에이전트 간 직접 조율**: 필요하면 에이전트끼리 서로 호출해 대화하고, 결과는 문서로 남깁니다. 최종 보고는 pm이 취합합니다.
- **프로젝트 범위 한정**: 전역 설정(`~/.claude/`)의 규칙, 스킬, 에이전트를 쓰지 않습니다. 다른 환경에서 열어도 동작이 같아야 하기 때문입니다.

## 문서 모순 방지

문서가 늘어나도 서로 어긋나지 않도록 다섯 가지 장치를 둡니다.

1. **소유권**: 모든 wiki 문서에 `owner`를 적고, 소유자가 아닌 에이전트는 고치지 않습니다.
2. **중복 금지**: 새 문서를 만들기 전에 `index.md`를 검색해 같은 주제가 있으면 갱신합니다.
3. **용어 사전**: `AI-Sessions/wiki/concepts/glossary.md`로 용어를 고정합니다.
4. **결정 교체**: 결정을 뒤집을 때 덮어쓰지 않고 이전 문서를 `superseded`로 남깁니다.
5. **자동 검사**: `scripts/lint-wiki.sh`가 frontmatter 누락, 깨진 링크, 미등록 문서, 제목 중복을 잡아냅니다.

```bash
bash scripts/lint-wiki.sh
```

## 다른 프로젝트에 적용하기

두 가지 방법이 있습니다.

**방법 1. 폴더를 복사한다**

이 폴더를 통째로 복사한 뒤 `AI-Sessions/wiki/` 아래 문서와 `index.md`의 등록 목록만 비웁니다. `.claude/`와 `scripts/`는 그대로 두면 됩니다.

**방법 2. 빈 폴더에서 프롬프트로 재현한다**

원본 폴더에 접근할 수 없을 때만 씁니다. `prompts/bootstrap-dev-agents.md`의 방법 2 프롬프트를 새 폴더의 Claude Code에 붙여넣습니다. 이 경우 에이전트가 규칙을 재구성하므로 원본과 정확히 일치하지는 않습니다 — 접근할 수 있다면 방법 1이 항상 낫습니다.

어느 쪽이든 마지막에 아래를 실행해 확인합니다.

```bash
bash scripts/validate-template.sh
bash scripts/lint-wiki.sh
```

## Karpathy LLM Wiki 원칙

이 템플릿은 Karpathy의 [LLM Wiki 설계](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)를 기반으로 합니다.

**핵심**: 매번 원문을 재검색하는 RAG 방식이 아니라, **LLM이 지속적으로 wiki를 컴파일**합니다.

- **ingest**는 단순 요약이 아니라 **통합**입니다. 기존 wiki 페이지를 업데이트하고 교차 참조를 유지합니다.
- **query** 결과는 wiki에 저장되어, 탐색이 **지식 축적**으로 변환됩니다.
- **lint**는 모순, 진부한 정보, 고아 페이지를 감지해 체계를 깨끗이 유지합니다.

## 배포 전 검증

터미널에서 아래 명령을 실행합니다.

```bash
./scripts/validate-template.sh
```

검증 스크립트는 필수 파일과 폴더가 있는지, 템플릿에 더미 데이터로 오해될 수 있는 파일이 섞이지 않았는지 확인합니다.
