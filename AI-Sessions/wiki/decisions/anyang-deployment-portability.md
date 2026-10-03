---
type: decision
date: 2026-09-27
status: active
owner: pm
decided_by: user
---

# 안양 청년정책 비서 — 배포와 이전 가능성 원칙 결정

## Summary

Vercel Hobby(함수 리전 `icn1` 서울) + Supabase 무료(서울 리전, pgvector)에 배포한다. Arduino UNO Q는 쓰지 않지만, 두 환경 사이를 양방향으로 옮길 수 있게 설계한다. Docker는 쓰지 않는다.

## Context

푸시 알림이 핵심 기능이라 가동률이 중요하다. UNO Q 4GB 보드는 개발 서버·소규모 파일럿은 가능하지만 eMMC 수명, 가정용 회선·전원 단일 장애점, HTTPS 터널 필요 때문에 운영 서버로 비권장으로 검토됐다. 그래서 클라우드를 채택하되 이전 경로를 남긴다. 사용자가 2026-09-27에 확정했다.

## Details

### 확정 값

| 항목 | 값 |
|---|---|
| 배포 | Vercel Hobby(함수 리전 `icn1`) + Supabase 무료(서울 리전, pgvector). UNO Q 미사용 |
| 스케줄 | Vercel Hobby Cron은 하루 1회 제한 → 알림 잡은 Supabase `pg_cron` + `pg_net`이 몇 분마다 Vercel API를 호출 |
| 이용 조건 | Hobby는 비상업 전용. 수익화하면 Pro 전환. 수익화 계획 없음 → Hobby 유지(user, 2026-09-27) |
| 로컬 개발 | 개발용 Supabase 무료 프로젝트에 접속(운영용과 분리). Docker 미사용 |

### 이전 가능성 원칙 (Vercel+Supabase ↔ UNO Q)

모든 설계에 적용한다. 목표: 전환 = DB 덤프/복원 + 환경변수 + DNS 변경.

1. DB는 표준 PostgreSQL+pgvector만 사용. Supabase Auth/Storage/Edge Functions/전용 클라이언트 금지, `DATABASE_URL`로만 접속.
2. 스케줄 로직은 앱 API 엔드포인트에 두고 트리거만 교체(클라우드: pg_cron+pg_net / 보드: 리눅스 cron+curl).
3. Next.js `output: 'standalone'`, Vercel 전용 기능(KV, Blob, Cron, Edge 전용 API) 금지.
4. Docker 미사용. 로컬 개발은 개발용 Supabase 무료 프로젝트. UNO Q 전환 시 apt로 PostgreSQL+pgvector 설치, 앱은 Node.js standalone + systemd.
5. 커스텀 도메인은 배포 시점에 정해 나중에 붙인다(user, 2026-09-27 — 처음부터 사용하던 원안을 대체). 그래서 앱의 base URL은 환경변수로만 받고 코드에 도메인을 하드코딩하지 않는다. 웹 푸시 구독·Google OAuth 리다이렉트가 도메인에 묶이므로, 도메인을 붙일 때 OAuth 리다이렉트 URI 추가와 푸시 재구독이 필요하다. VAPID 키는 환경변수로 보관해 환경 간 동일하게 유지.
6. 전환 절차(runbook)를 backend 설계 문서에 포함.

원칙 3에 따라 Vercel Cron은 쓰지 않는다. 계획서 아키텍처의 "수집 잡은 Vercel Cron 가능" 제안은 이 원칙과 맞지 않으므로, 수집 잡 트리거는 원칙 2에 맞춰 설계에서 정한다(미확정).

수집 잡 트리거 결정(user, 2026-10-04, "새 글 즉시 반영" 요구): Supabase `pg_cron` + `pg_net`이 수집 API를 호출한다. 가벼운 확인(목록 1페이지, 새 글만 상세)을 10분마다, 정밀 점검(최근 1~2페이지 수정 감지)을 하루 1회(서울 04:00) 돌린다. 10분은 권장 주기라 조정할 수 있다. Vercel Cron은 Hobby가 하루 1회·실행 시각 ±59분이라 쓰지 않는다(원칙 3과도 일치). 세부는 [[anyang-backend-api]]·[[anyang-database-schema]] 설계에서 정한다.

**수집 주체 변경(user, 2026-10-04)**: 안양시 사이트가 클라우드 IP를 차단한다(메인 세션 실측 2026-10-04 — Supabase·Vercel icn1(AWS 서울)에서 목록 GET 시 200 "IP 차단 안내" 페이지, 가정용 회선(개발 PC·UNO Q)은 정상, 차단 기준은 미확인). 그래서 위 pg_cron → Vercel 수집 트리거 결정은 수집에 대해서는 대체된다. 공지 수집은 **UNO Q 보드가 수집 전용으로** 맡는다(앱 서버 아님). 보드 PostgreSQL은 "수집 보관함 + 전송 대기열"(USB 저장)로만 쓰고, 앱의 주 DB는 Supabase 그대로다(앱·추천·임베딩·푸시 불변). 보드는 수집 결과를 Vercel 받기 API로 보낸다. 기존 비밀번호·키·환경변수는 바꾸지 않고, 새 키 추가만 허용한다. `DATABASE_URL`은 로컬에 두지 않는다. 위 표의 "UNO Q 미사용"은 앱 배포에 대해서만 유효하다. 알림 잡 트리거(pg_cron + pg_net)는 그대로다. 보드나 회선이 꺼지면 새 글 반영만 늦어진다. 세부는 [[anyang-database-schema]]·[[anyang-backend-api]] 설계에서 정한다.

## Links

- [[anyang-youth-policy-assistant]]
- [[anyang-stack-database]]
- [[anyang-login-method]]
- [[anyang-database-schema]]
- [[anyang-backend-api]]
- [[anyang-frontend-screens]]
- [[anyang-board-collector]]
- [[anyang-board-collector-db]]
