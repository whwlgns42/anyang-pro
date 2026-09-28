---
type: error
date: 2026-09-28
status: active
owner: pm
---

# 안양 비서 — Vercel 첫 배포에서 겪은 문제 3가지

## Summary

CLI로 Vercel 프로젝트를 처음 만들어 배포할 때 (1) 프레임워크가 "Other"로 잡혀 모든 경로가 404,
(2) 첫 배포가 자동으로 운영(production)에 배정, (3) Supabase Direct 주소가 IPv6 전용이라
이 PC와 Vercel에서 접속 불가였다. 다음 배포·이전 때 같은 실수를 반복하지 않도록 기록한다.

## Context

2026-09-28 메인 세션이 사용자 요청으로 `web/`을 Vercel CLI 60.1.3으로 배포했다.
`vercel project add anyang-youth-policy-assistant` → `vercel deploy --yes --project ...` 순서.

## Details

1. **프레임워크 Other → 전부 404**
   - 증상: 빌드 로그는 Next.js 라우트 목록까지 정상인데 `/`, `/login` 모두 404.
   - 원인: `vercel project add`로 만든 프로젝트는 Framework Preset이 `Other`로 남는다(`vercel project inspect`로 확인). 출력 디렉터리를 정적 사이트로 취급한다.
   - 해결: 프로젝트 설정 `framework: nextjs`(Vercel MCP `update_project`) 후 재배포 → `/` 307(`/login`), `/login` 200.
   - 다음에는: 프로젝트 생성 직후 framework를 확인한다.
2. **첫 배포가 운영으로 배정**
   - Vercel은 프로젝트의 첫 배포를 production으로 보낸다. 운영 주소가 404 버전을 가리킨 채 남았다(환경변수 입력 뒤 `--prod` 재배포로 교체 예정).
3. **Supabase Direct 주소는 IPv6 전용**
   - `db.<ref>.supabase.co:5432`는 이 PC에서 `getaddrinfo ENOENT`. Vercel 함수도 IPv6 아웃바운드를 쓰지 않으므로 `DATABASE_URL`은 pooler 주소(Transaction pooler 6543)를 쓴다.
   - pooler 사용자명은 `postgres.<ref>`이지만 롤은 `postgres`라서 0019 RLS(소유자 롤 접속 전제)와 충돌하지 않는다.
   - 서울 리전 pooler 호스트는 `aws-0-ap-northeast-2`(aws-1은 tenant not found).

## Links

- [[anyang-youth-policy-assistant]]
- [[anyang-deployment-portability]]
