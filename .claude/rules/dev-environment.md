# Dev Environment Setup

개발에 필요한 **도구**(스킬이 아닌 CLI·프로그램)의 설치법을 모아둔다.

스킬·플러그인 설치는 여기가 아니라 `.claude/skills/README.md`의 대장에 있다.

에이전트는 도구가 없어서 막히면 이 표의 설치 명령을 사용자에게 그대로 안내한다.
`winget` / `npx` 같은 명령은 에이전트가 직접 실행하지 못한다. 설치는 사용자가 한다.

## 도구 대장

| 도구 | 상태 | 용도 | 설치 명령 (Windows) | 비고 |
|---|---|---|---|---|
| GitHub CLI (`gh`) | 미설치 | GitHub PR·이슈·릴리스·클론을 터미널에서 처리 | `winget install --id GitHub.cli` | 설치 후 `gh auth login`으로 계정 인증. 이 vault가 git 저장소가 되고 GitHub 원격이 생긴 뒤에 필요 |
| TypeSafe Python SDK (`typesafe-sdk`) | 설치됨 (0.7.2) | Jev 모델 API 호출 (`from typesafe_sdk import TypeSafeClient`) | `pip install typesafe-sdk` | API 키는 https://console.typesafe.ai/keys 에서 발급해 `TYPESAFE_API_KEY` 환경변수로 둔다. 문서: https://docs.typesafe.ai/introduction/quickstart |

- **상태**: `설치됨` / `미설치`
- 새 도구를 설치하거나 제거하면 이 표를 즉시 갱신한다.

## Links

- `.claude/skills/README.md` — 스킬·플러그인 대장
- `.claude/rules/dev-common.md` — 개발 공통 규칙
