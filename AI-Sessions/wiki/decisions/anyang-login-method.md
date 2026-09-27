---
type: decision
date: 2026-09-27
status: active
owner: pm
decided_by: user
---

# 안양 청년정책 비서 — 로그인 방식 결정

## Summary

Google 소셜 로그인과 자체 회원가입(이메일·비밀번호)을 둘 다 제공한다.

## Context

사용자가 2026-09-27에 확정했다. Google 계정이 없거나 쓰기 싫은 사용자도 가입할 수 있게 한다.

## Details

| 항목 | 값 |
|---|---|
| 로그인 | Google 소셜 로그인 + 자체 회원가입(이메일·비밀번호) |

- 인증 라이브러리(계획서의 Auth.js 제안), 비밀번호 해시 방식은 미확정이다. backend 설계에서 정한다.
- Supabase Auth는 쓰지 않는다. 근거는 [[anyang-deployment-portability]].
- Google OAuth 리다이렉트는 도메인에 묶이므로 커스텀 도메인 결정이 필요하다([[anyang-youth-policy-assistant#확인이 필요한 항목]]).

## Links

- [[anyang-youth-policy-assistant]]
- [[anyang-stack-database]]
- [[anyang-deployment-portability]]
- [[anyang-backend-api]]
- [[anyang-frontend-screens]]
- [[anyang-service-scope]]
