# Handoff Prompt

```text
현재 진행 중인 작업을 다음 세션이나 다른 에이전트에게 인수인계하기 위해 정보를 저장해줄래.

AI-Sessions/conversations/에 문서를 만들어줘. 형식은 .claude/rules/knowledge-ops.md의
Document Format을 따르고, frontmatter에는 type: handoff와 owner(작성한 에이전트 이름,
메인 세션이면 shared)를 넣어줘.

본문에는 다음을 포함해줘.

- 세션 날짜와 참여자
- 지금까지 이룬 것과 완료된 액션
- 현재 진행 중인 작업과 상태
- 다음 단계와 블로킹 요소
- 참조할 wiki 문서 링크 (특히 decisions/, projects/)
- 확인 필요한 사항과 의사결정 대기 중인 항목 — 확정되지 않은 값에는 (미확정)을 붙여줘

문서 이름은 YYYY-MM-DD_<session-name>.md 형식으로 해줘. session-name은 영문 소문자와 하이픈으로 써줘.

이 문서는 임시 저장이야. 내용이 decisions/, projects/ 같은 관련 wiki 문서로 통합되면
AI-Sessions/conversations/archive/로 옮겨줘.
```
