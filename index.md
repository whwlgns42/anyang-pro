# AI Agent Wiki Index

이 문서는 vault 전체의 지도입니다.

에이전트는 중요한 wiki 문서를 만들거나 갱신한 뒤 이 문서에 링크를 추가해야 합니다.

## Start Here

- [[START_HERE]]
- [[CLAUDE]]
- [[AGENTS]]
- [[README]]
- [[TEMPLATE_MANIFEST]]
- [[log]]

## Vault Structure

- `AI-Sessions/raw/`: 수정하지 않는 1차 자료
- `AI-Sessions/conversations/`: 세션 인수인계
- `AI-Sessions/wiki/sources/`: raw 자료 요약
- `AI-Sessions/wiki/concepts/`: 반복 사용 개념
- `AI-Sessions/wiki/decisions/`: 의사결정
- `AI-Sessions/wiki/errors/`: 실패와 리스크
- `AI-Sessions/wiki/projects/`: 프로젝트 맥락
- `AI-Sessions/wiki/design/`: 디자인 가이드와 IA
- `AI-Sessions/wiki/dev-tasks/`: 개발 태스크
- `AI-Sessions/wiki/overview/`: 비개발자용 서비스 소개 문서(정의서·아키텍처 요약)
- `.claude/agents/`: 개발 서브에이전트 정의 (pm, backend, frontend, database, code-review, git-manager)
- `.claude/rules/knowledge-ops.md`: 지식 관리 규칙 (save/ingest/query/lint, 문서 형식)
- `.claude/rules/dev-common.md`: 개발 에이전트 공통 규칙
- `.claude/skills/`: 이 프로젝트에 설치한 스킬
- `.claude/skills/export-template/`: 작업 기록을 지운 깨끗한 배포 ZIP 생성 스킬
- `scripts/lint_wiki.py`: 문서 구조·링크 그래프 검사기 (`bash scripts/lint-wiki.sh`로 실행)
- `scripts/agent_guard.py`: 에이전트 규칙을 강제하는 훅 (호출 허용 목록, git 쓰기 제한, 종료 시 린트)
- `scripts/test_rules.py`: 한 번 고친 규칙이 다시 깨지지 않는지 보는 회귀 검사 (`python scripts/test_rules.py`)
- `scripts/jev.py`: Jev 보조 판단 — 관련 문서 순위, 중복 확인, Save Filter (실패 시 종료 코드 3, 직접 판단)
- `.claude/settings.json`: 훅과 권한 설정 (push·init 등은 항상 사용자 확인)

## Projects

- [[anyang-youth-policy-assistant]] — 안양 청년정책 공지 맞춤 추천·푸시 알림 PWA. 확정 값, 확인 항목, 승인된 설계

## Conversations

- [[2026-09-28_anyang-first-build-paused]] — 안양 비서 1차 구현 후 중단: 결정 22·23·OCR·taste-skill, 다음 할 일(23번부터), 수집기 셀렉터, 준비 항목
- [[2026-09-27_anyang-implementation-paused]] — (superseded, archive 이동 대상) 안양 비서 구현 중단 인수인계. 2026-09-28 재개·완료, 프로젝트 문서로 통합
- [[2026-09-27_anyang-design-approval-wait]] — (superseded, archive 이동 대상) 안양 비서 설계 승인 대기 인수인계

## Design

- [[anyang-database-schema]] — 안양 비서 DB 설계(active, 공개 API 차단 반영 재승인 2026-09-28, 0019 운영 적용 완료): 테이블, HNSW, 동의 기록, 관리자용 로그, pg_cron+pg_net 잡(알림·수집·정리), 재임베딩 절차, RLS·anon 권한 회수(0019)
- [[anyang-backend-api]] — 안양 비서 API 계약(active, 재승인 2026-09-28): 인증·동의·정지, 채팅 RAG·인용 공지 SSE, 임베딩, 수집기(실제 셀렉터), Web Push, 관리자 API(공지 목록 포함), 배포, UNO Q runbook
- [[anyang-frontend-screens]] — 안양 비서 화면 설계(active, 재승인 2026-09-28): 로그인·동의·온보딩·채팅·추천 공지·알림 설정·기억·대화 히스토리·탈퇴·처리방침, 관리자 4종, PWA

## Dev Tasks

- [[anyang-backend-tasks]] — 안양 비서 backend 구현 작업 단위(active, 22·23 인용 공지 스트림·관리자 공지 목록 추가)
- [[anyang-frontend-tasks]] — 안양 비서 frontend 구현 작업 단위(active, 22·23 인용 카드·관리자 공지 목록 탭 추가)

## Concepts

- [[glossary]] — 프로젝트 용어 사전. 같은 개념을 다른 이름으로 부르지 않도록 고정
- [[서비스-소개]] — 안양 비서 비개발자용 서비스 소개(이용 흐름·기능·개인정보 원칙). 같은 내용 html 아티팩트 원본 포함
- `AI-Sessions/wiki/overview/안양비서-{전체구성도,채팅요청흐름,수집알림파이프라인}.html` — 개발자용 아키텍처 다이어그램 3종(archify 생성, 같은 이름 .json이 원본. 코드·마이그레이션 기준 2026-09-28)

## Decisions

- [[anyang-stack-database]] — 안양 비서: Next.js App Router PWA + PostgreSQL/pgvector
- [[anyang-ai-models-data-transfer]] — 안양 비서: DeepSeek 대화, Gemini 무료 임베딩, 외부 AI에 식별정보 전송 금지, 채팅 메시지 임베딩은 정규식 가림 후 허용
- [[anyang-login-method]] — 안양 비서: Google 로그인 + 이메일·비밀번호 가입
- [[anyang-google-oauth-setup]] — 안양 비서: Google OAuth 2.0 클라이언트 설정(프로젝트명 anyang-youth-policy, 로컬·Vercel 리디렉션 URI, 환경변수 추가)
- [[anyang-supabase-connection]] — 안양 비서: Supabase PostgreSQL 연결 (서울 리전, DATABASE_URL 환경변수, 마이그레이션 대기)
- [[anyang-service-scope]] — 안양 비서: 수집 게시판 1개, 프로필 4항목, 사용자별 알림 시각·on/off, 기억·히스토리 화면, 인증 부가 테이블 미사용, 가입 시 개인정보 동의, 관리자 페이지(ADMIN_EMAILS)
- [[anyang-deployment-portability]] — 안양 비서: Vercel Hobby icn1 + Supabase 서울, UNO Q 양방향 이전 원칙, Docker 미사용

## Sources

아직 등록된 source 문서가 없습니다.

## Errors / Lessons

- [[anyang-preferences-put-missing-mask-pii]] — 안양 비서: 선호 수정 API가 가림 없이 Gemini로 전송(해결 622962b, embedText 내부 강제 가림)
- [[anyang-jobs-collect-missing-maxduration]] — 안양 비서: 수집·임베딩 잡 라우트에 maxDuration 누락으로 설계의 300초 전제 미적용(해결 992e01e)
- [[anyang-vercel-first-deploy-pitfalls]] — 안양 비서: Vercel 첫 배포 시 framework Other 404, 첫 배포 운영 배정, Supabase Direct IPv6 전용(pooler 사용)
- [[anyang-backend-api-mihwakjeong-removal-corruption]] — 안양 비서: 승인 후 (미확정) 기계적 삭제로 backend-api 문장 비문·위키링크 앵커 공백 잔존(2026-09-28 사용자 결정 26으로 복구)

## Prompt Library

- [[prompts/first-setup]]
- [[prompts/save]]
- [[prompts/query]]
- [[prompts/ingest]]
- [[prompts/lint]]
- [[prompts/handoff]]
- [[prompts/bootstrap-dev-agents]]
