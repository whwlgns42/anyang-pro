---
type: decision
date: 2026-09-28
status: active
owner: pm
decided_by: user
---

# 안양 청년정책 비서 — Supabase 연결 설정

## Summary

Supabase PostgreSQL 데이터베이스 연결 설정 완료. `DATABASE_URL` 환경변수로 표준 PostgreSQL 접속.

## Context

[[anyang-stack-database]]에서 PostgreSQL + pgvector 결정. Supabase 서울 리전 프로젝트를 사용해 한국 데이터 주권 충족.

## Details

### Supabase 프로젝트
- **프로젝트 ref**: ytcxcvspsqaygbxzvffi
- **리전**: Seoul (Southeast Asia)
- **상태**: 2026-09-28 Vercel 연결 완료

### 데이터베이스 연결
- **연결 방식**: PostgreSQL standard connection (호스트:db.ytcxcvspsqaygbxzvffi.supabase.co, 포트:5432)
- **데이터베이스**: postgres
- **환경변수**: `DATABASE_URL` (Production)
  - 로컬: `web/.env.local`에 저장 (git 제외)
  - Vercel: 환경변수로 설정 (2026-09-28)

### 마이그레이션
**미적용 상태** — 다음 단계:
```bash
cd web
npx prisma migrate deploy
```

19개 마이그레이션 파일 (0000-0018) 대기:
- 스키마 생성 (테이블, 인덱스, 함수)
- pgvector 활성화
- RLS 정책 설정
- pg_cron 잡 설정

## Links

- [[anyang-stack-database]] — 스택과 DB 결정
- [[anyang-deployment-portability]] — 이전 가능성 원칙
- [[anyang-database-schema]] — 스키마 설계
