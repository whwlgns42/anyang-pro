---
type: decision
date: 2026-09-28
status: active
owner: pm
decided_by: user
---

# 안양 비서: Google OAuth 설정

## Summary

Google OAuth 2.0을 통한 소셜 로그인 구현 완료. Auth.js v5에 Google provider 연동.

## Context

[[anyang-login-method]]에서 "Google 로그인 + 이메일·비밀번호 가입"으로 결정. 프론트엔드와 백엔드 구현은 완료했고, Google Cloud Console에서 OAuth 2.0 클라이언트 ID 발급 후 환경변수 설정.

## Details

### Google Cloud 프로젝트
- **프로젝트명**: anyang-youth-policy
- **클라이언트 ID**: 환경변수 `GOOGLE_CLIENT_ID`에 저장
- **클라이언트 보안 비밀**: 환경변수 `GOOGLE_CLIENT_SECRET`에 저장

### 승인된 JavaScript 원본 (3개)
```
http://localhost:3100
https://anyang-youth-policy-assistant-qjbcrfrj.vercel.app
https://web-jtg3svh76-whwlgns42-1220s-projects.vercel.app
```

### 승인된 리디렉션 URI (3개)
```
http://localhost:3100/api/auth/callback/google
https://anyang-youth-policy-assistant-qjbcrfrj.vercel.app/api/auth/callback/google
https://web-jtg3svh76-whwlgns42-1220s-projects.vercel.app/api/auth/callback/google
```

### 환경변수 설정
**파일**: `web/.env.local` (git에 커밋되지 않음, `.gitignore` 등록)

필요한 환경변수:
- `AUTH_SECRET`: JWT 서명용 시크릿
- `AUTH_URL`: 로컬 개발 환경 `http://localhost:3100`
- `GOOGLE_CLIENT_ID`: Google Cloud Console에서 발급받은 클라이언트 ID
- `GOOGLE_CLIENT_SECRET`: Google Cloud Console에서 발급받은 클라이언트 보안 비밀

**주의**: 자격증명은 `.env.local` 파일에만 저장하고, 절대 git 저장소에 커밋하지 않음.

### 백엔드 구현
**파일**: `web/lib/auth.ts`

- Auth.js v5 설정에서 Google provider 등록
- JWT 세션 전략 사용 (DB 세션 테이블 미사용)
- provider 정보를 JWT 클레임에 저장 (admin 권한 판정용, [[anyang-backend-api]] 13-0절)

### 프론트엔드 구현
**파일**: `web/app/login/page.tsx`

- `handleGoogle()` 함수로 signIn("google") 호출
- OAuthAccountNotLinked 오류 처리: 같은 이메일로 이미 비밀번호 가입된 경우 안내
- 로그인 성공 시 `/post-login`으로 리다이렉트

## Vercel 배포 설정 (2026-09-28 완료)

**배포된 프로젝트:**
- **URL**: https://web-jtg3svh76-whwlgns42-1220s-projects.vercel.app
- **Alias**: https://web-beta-smoky-16.vercel.app
- **프로젝트 ID**: prj_plVcLE93J2TGssFdPpLZnlM3Tdzz

**환경변수 (Production):**
- ✅ `GOOGLE_CLIENT_ID` = 563672437433-aeo9ikqmj3c9efnkfsejedq7sdcf69v.app
- ✅ `GOOGLE_CLIENT_SECRET` = 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
- ✅ `AUTH_SECRET` = VMybPwvTgKZIEW9taBYykqqkuvN7xTJEF2KAhfn0V2U=
- ✅ `AUTH_URL` = https://web-jtg3svh76-whwlgns42-1220s-projects.vercel.app

**GitHub 연동:**
- 상태: 진행 중 (계정 권한 문제 해결 필요)
- 계획: whwlgns42 계정으로 anyang-pro 저장소 연결 후 Root Directory를 `./web`으로 설정

## Links

- [[anyang-login-method]] — 로그인 방식 결정
- [[anyang-backend-api]] — API 설계 (1절, 13-0절)
- [[anyang-frontend-screens]] — 화면 설계 (1절)
