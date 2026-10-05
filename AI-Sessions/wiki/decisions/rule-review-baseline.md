---
type: decision
date: 2026-10-05
status: active
owner: shared
decided_by: user
---

# 규칙 검토 기준 문서

## Summary

규칙·에이전트·설정 검토의 기준선이다. 아래 "해결한 항목"과 "수용한 한계"는 다시 보고하지 않는다.
재검토 조건이 실제로 생겼을 때만 다시 올린다. 절차는 `.claude/rules/knowledge-ops.md`의 "규칙 검토".

## Context

2026-10-05 사용자 요청: 문서·스킬 참조와 Jev로 토큰을 아끼는 구조에 남은 문제를 찾고, 개발과
Supabase·Vercel MCP·CLI 사용에 영향 없이 확실한 것만 고친다. 첫 검토라 이 문서를 새로 만든다.

## Details

### 변경 계기

- 같은 문제가 두 번 이상 실제 작업을 멈추거나 잘못된 산출물을 남겼을 때
- 사용자가 규칙 변경을 요청했을 때
- 아래 재검토 조건이 생겼을 때

### 해결한 항목 (2026-10-05)

1. 전역 플러그인 중복 로드: superpowers·ponytail 플러그인이 프로젝트 `.claude/skills` 복사본과 함께 로드되고
   세션 시작 주입문이 붙었다. 프로젝트 `.claude/settings.json`의 `enabledPlugins`에서 두 플러그인을 끄고
   vercel은 켬으로 명시했다(이 키는 레이어 병합이 없어 가장 높은 파일의 맵 전체가 쓰인다). `test_rules.py` 검사.
2. 상위 폴더 CLAUDE.md 혼입: `C:/Users/whwlg/CLAUDE.md`(템플릿)가 메인과 서브에이전트에 로드됐다.
   `claudeMdExcludes`로 이 프로젝트에서만 제외했다. `test_rules.py` 검사.
3. 큰 문서 전체 읽기: 설계 문서 3종이 130~225KB다. dev-common Operating Rules 14(30KB 초과 문서는 절 단위로
   읽기)와 pm 작업 지시서에 문서#절 단위 표기를 추가했다.
4. 프로젝트 문서 비대: [[anyang-youth-policy-assistant]]의 닫힌 확인 항목 36개와 승인 차수 이력을
   [[anyang-youth-policy-assistant-history]]로 원문 그대로 옮겼다(194KB → 155KB). 남은 크기는 열린 항목 55~61이 대부분이라,
   그 항목이 닫힐 때 같은 방식으로 옮긴다. 판정은 소유자 pm, 이동은 스크립트.
   history 문서에는 "승인된 설계" 제목을 쓰지 않는다(설계 잠금 훅이 projects 문서의 그 제목을 읽는다). `test_rules.py` 검사.
5. 전역 설정(사용자 승인): 사용하지 않는 `SUPABASE_ACCESS_TOKEN` env 줄과, 판정만 돌려줘 효과가 없던
   UserPromptSubmit agent 훅을 지웠다. Supabase MCP 토큰(`~/.claude.json`)과 Vercel 플러그인·CLI는 그대로다.

### 수용한 한계

| 항목 | 이유 | 재검토 조건 |
|---|---|---|
| log.md 42KB | 월별 회전 시 미해결 flag가 archive로 숨고 export-template이 archive를 초기화하지 않는다 | log.md가 100KB를 넘을 때 |
| Jev docs·dup이 문서 단위 판정 | 문서가 크면 절약이 작지만 절 단위 판정은 index 형식 변경이 필요하다 | 절 단위 읽기 규칙으로도 비용이 줄지 않을 때 |
| 설계 문서가 기능 전체를 한 문서에 담음 | 새 요청마다 문서 전체가 잠금 해제·재승인된다. 분할은 링크·설계 잠금 재설계가 필요한 큰 작업 | 사용자가 설계 문서 분할을 요청할 때 |
| "Jev 도입 제안" 절이 dev-common에 상시 로드 | 약 2KB, `test_rules.py`가 위치를 고정 검사 | dev-common이 30KB를 넘을 때 |
| pm 모델 Opus | 판단 품질 우선 | 사용자가 비용 절감을 우선할 때 |

## Links

- [[anyang-youth-policy-assistant]]
- [[anyang-youth-policy-assistant-history]]
