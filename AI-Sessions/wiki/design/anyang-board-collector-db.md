---
type: design
date: 2026-10-04
status: draft
owner: database
---

# 안양 청년정책 비서 — 보드 수집 DB(anyang_collector) 설계

## Summary

안양시 사이트가 클라우드 IP를 막아(확인 항목 56) 공지 수집은 UNO Q 보드가 맡는다. 보드의 기존 PostgreSQL 17에
새 DB `anyang_collector`를 만들어 "수집 보관함 + 전송 대기열"로 쓴다. 저장은 USB(`/mnt/usb`)의 새 테이블스페이스다.
앱 주 DB(Supabase)는 바뀌지 않는다. 테이블은 둘이다. `collected_notices`(원문 HTML + 정리 값 + `sync_status` 대기열)와
`collector_runs`(보드 수집·전송 실행 이력). 접속은 로컬 소켓, 비밀번호 없음, 새 롤 `anyang_collector`. 기존 `pg_hba.conf`·
설정·비밀번호·기존 DB는 한 글자도 바꾸지 않는다. Supabase 쪽 스키마 변경은 필요 없다(권장). 아래 값은 모두 제안이며
`(미확정)`이다. 구현은 사용자 승인 뒤에만 한다.

## Context

- 사용자 결정(2026-10-04): [[anyang-deployment-portability]] "수집 주체 변경", [[anyang-youth-policy-assistant#확인이 필요한 항목]] 56.
  보드 PostgreSQL = 수집 보관함 + 전송 대기열, USB 저장, 앱 주 DB는 Supabase 불변, 기존 비밀번호·키·환경변수 변경 금지.
- 이 문서는 보드 DB 한 곳만 다룬다. 보드 수집기 프로그램은 A, 받기 API는 C이고 [[anyang-backend-api]]가 소유한다.
  Supabase 쪽(`notices`·`collect_runs`)은 [[anyang-database-schema]]가 원본이다.
- 문서에 접속 정보·자격 증명을 적지 않는다. 보드 접속 방법은 raw 문서 `AI-Sessions/raw/arduino-server/`에 있다(읽기만).

### 보드 읽기 전용 확인 결과 (2026-10-04, SSH로 조회만 함, 보드 변경 없음)

| 항목 | 확인 값 |
|---|---|
| PostgreSQL | 17.10 aarch64, 서비스 `postgresql@17-main`, `data_directory=/var/lib/postgresql/17/main`(eMMC `/`, 4.6G 여유) |
| 기존 DB | `postgres`, `agentvault_licensing`(8MB), `aura_cafe`(7.8MB). 클러스터 전체 약 71MB. 접속 세션 8개, `max_connections=100`, `shared_buffers=128MB` |
| 롤 | 슈퍼유저 `postgres` 하나뿐. 기존 앱들은 이 롤로 붙는 것으로 보인다(미확인) |
| `pg_hba.conf` | 활성 줄이 `local all all trust`, `host ... 127.0.0.1/32 trust`, `::1/128 trust`, replication 같은 trust. peer·password 인증이 아니다. **비밀번호 없이 소켓 접속이 이미 된다** |
| 확장 | `pgcrypto`만 사용 가능. pgvector 없음(보드 DB에서 필요 없음) |
| 테이블스페이스 | `pg_default`, `pg_global`뿐. 사용자 정의 없음 |
| USB | `/dev/sda1` ext4 15G, `/mnt/usb`에 마운트(fstab `defaults,nofail`), 1.1G 사용 13G 여유. 회전식 디스크(ROTA=1)라 eMMC보다 느리다 |
| `/mnt/usb/postgresql` | 소유 postgres, 모드 700. 안에 `17/main`이 있다. 2026-08-01 00:55에 만든 **PostgreSQL 데이터 디렉터리 복사본**(71MB, 실행 중인 서버는 `-D /var/lib/postgresql/17/main`이라 쓰지 않음, `pg_tblspc` 비어 있음). 용도·만든 사람은 알 수 없다 |
| `/mnt/usb/data` | 소유 postgres, 비어 있음. 용도 모름 |
| 메모리 | 총 3.6G, 사용 약 0.84G, 가용 약 2.8G |
| pg_hba·설정 | `postgresql.conf`에 `default_tablespace`·`temp_tablespaces` 설정 없음 |

- 위 두 USB 폴더는 건드리지 않는다. 이 설계는 둘 다 쓰지 않고 새 폴더를 쓴다(아래 B-1). 용도를 사용자에게 묻는다(확인이 필요한 항목 2).

## Details

### B-0. 구성안 (사용자 결정 필요 — 위험이 다르다)

| | A안: 같은 클러스터 + USB 테이블스페이스 (지시서 안) | B안: USB에 별도 클러스터 |
|---|---|---|
| 방식 | 기존 `postgresql@17-main` 안에 DB·롤·테이블스페이스 추가 | `pg_createcluster 17 collector -d /mnt/usb/...`로 새 인스턴스(소켓 전용 또는 5433) |
| 기존 서비스 | 같은 서버 프로세스를 공유 | 프로세스·설정·`pg_hba`·WAL이 모두 분리 |
| USB 오류 시 | 아래 위험 R1(기존 DB까지 영향 가능) | 새 인스턴스만 멈춘다 |
| 인증 | 기존 `trust` 그대로 사용(변경 없음) | 새 `pg_hba.conf`에서 peer 인증 가능, 기존 파일 무변경 |
| 비용 | 없음 | 추가 프로세스 약 30~50MB(추정, 근거: 빈 PG 인스턴스 일반값, 보드 미측정), systemd 유닛 1개 추가 |

- **R1 (A안의 위험)**: PostgreSQL은 fsync 실패를 재시도하지 않고 서버를 PANIC으로 내린다(`data_sync_retry=off` 기본). USB가
  운영 중에 빠지거나 I/O 오류가 나면 `anyang_collector`의 더러운 버퍼를 디스크에 쓰다 실패해 **기존 DB(AgentVault 등)를 쓰는
  클러스터 전체가 재시작될 수 있다.** 테이블스페이스가 없는 상태에서 서버가 비정상 종료 후 복구되는 경우도 시작이 막힐 수 있다.
  (PostgreSQL 일반 동작에 대한 설명이며 이 보드에서 재현해 확인한 것은 아니다. 구현 단계 격리 시험 F-2로 확인한다.)
- database 권고: **B안**. "기존 DB·서비스 무영향"을 근거로 증명할 수 있는 쪽이 B안뿐이다. 다만 지시서 안(A안)이 사용자 결정에
  가깝게 적혀 있어 이 문서는 A안을 기본으로 쓰고 B안 차이는 B-1·F-1에 따로 적었다. 어느 쪽이든 아래 테이블(B-3)은 같다.
  선택은 사용자 결정 `(미확정)`.

### B-1. 저장 위치

- 새 폴더 `/mnt/usb/anyang-collector/pg` (소유 postgres, 모드 700) `(미확정)`. 기존 `/mnt/usb/postgresql`·`/mnt/usb/data`와 겹치지 않는다.
- A안: 테이블스페이스 `anyang_usb`를 그 폴더에 만들고 **DB 자체를 그 테이블스페이스에 둔다**(`create database ... tablespace anyang_usb`).
  그러면 테이블·인덱스·TOAST(원문 HTML)·이 DB의 시스템 카탈로그가 모두 USB에 놓인다. WAL(`pg_wal`)은 클러스터 공용이라 eMMC에 남는다(수집 쓰기량이
  작아 문제 없음, 추정).
- B안: 새 클러스터의 데이터 디렉터리를 `/mnt/usb/anyang-collector/pg`로 한다. WAL까지 USB다.
- 임시 정렬 파일은 `temp_tablespaces` 미설정이라 eMMC다.

### B-2. USB가 마운트되지 않았을 때

| 상황 | A안 | B안 | 수집기 동작 |
|---|---|---|---|
| 부팅 때 USB가 늦게/안 올라옴 | `postgresql@17-main`은 `/mnt/usb`를 기다리지 않아 먼저 뜬다. 기존 DB는 정상. `anyang_collector`만 파일을 못 열어 접속 오류 | 새 인스턴스 시작 실패, 기존 클러스터 무관 | 아래 가드로 실행하지 않고 종료 |
| 운영 중 USB 분리·오류 | R1 위험 | 새 인스턴스만 오류 | 접속 오류로 종료 |
| 복구 | USB 재마운트 뒤 PostgreSQL 재시작이 필요할 수 있다(미검증) | 새 인스턴스만 재시작 | 다음 타이머에서 자동 재개 |

- 하지 않는 것: `postgresql@17-main`에 `RequiresMountsFor=/mnt/usb`를 넣지 않는다. USB 문제로 **기존 DB까지 안 뜨게** 되기 때문이다.
- 수집기 가드(구현은 A 몫): 실행 전 `mountpoint -q /mnt/usb` 검사(systemd 유닛 `ConditionPathIsMountPoint=/mnt/usb` 또는 스크립트 첫 줄).
  실패하면 사이트를 가져오지 않고 로그만 남기고 끝낸다 — 저장할 곳이 없는데 가져와 봐야 버려진다.
- 데이터 손실 영향: 보드 DB는 원본이 아니라 **사이트가 원본인 사본**이다. 보드 DB를 잃어도 `full`/`backfill`로 다시 모을 수 있다. 잃는 것은
  아직 전송 안 한 `pending` 행과 원문 보관 이력이다.

### B-3. 테이블

용어: `sync_status`는 보드→Vercel 전송 상태다. 이 문서에서 처음 쓰는 용어이며 glossary에 넣을 후보다(보고에 기록).

#### collected_notices — 수집 결과 + 전송 대기열

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint, identity PK | 보드 내부 번호. Supabase의 uuid와 무관 |
| source_url | text, unique, not null | 원문 URL. Supabase `notices.source_url`과 같은 값(중복 판정 키) |
| title | text, not null | 정리 값. Supabase `notices.title`과 맞춤 |
| body | text, not null | 정리 본문 |
| content_hash | text, not null | 해시 정의는 기존 수집기 코드와 같게 한다([[anyang-backend-api]], A 몫) |
| published_at | timestamptz, null 허용 | 게시일 |
| is_pinned | boolean, not null, default false | 고정 공지 |
| image_count | int, not null, default 0 | 확정된 규칙(`p-photo`·이모지 제외)은 [[anyang-backend-api]] |
| attachments | jsonb, not null, default '[]' | `[{name, url}]`, 링크만 |
| raw_html | text, null 허용 | 상세 페이지 원문 HTML 전체. 사본 확인·파서 수정 뒤 재파싱용. null이면 보관 기간이 지나 비운 것 |
| first_collected_at | timestamptz, not null, default now() | 처음 수집한 시각 |
| collected_at | timestamptz, not null, default now() | 마지막으로 사이트에서 가져온 시각 |
| sync_status | text, not null, default 'pending', check in (pending, synced, failed) | 전송 상태 |
| retry_count | int, not null, default 0 | 연속 전송 실패 횟수 |
| last_error | text, null 허용 | 마지막 실패 요약(스택 전체·시크릿 금지) |
| last_attempt_at | timestamptz, null 허용 | 마지막 전송 시도 |
| next_attempt_at | timestamptz, not null, default now() | 이 시각 이후에 다시 보낸다(백오프) |
| synced_at | timestamptz, null 허용 | 받기 API가 받아들인 시각 |

- Supabase `notices`와 맞춘 컬럼: source_url·title·body·content_hash·published_at·is_pinned·image_count·attachments. 맞추지 않은 것: `id`(uuid),
  `hidden_*`(관리자 숨김은 Supabase 몫), `collected_at`(Supabase는 받은 시각을 기본값으로 둔다. 보드의 `collected_at`을 보낼지는 확인이 필요한 항목 6).
- 인덱스는 두지 않는다. 462건 규모라 전체 훑기가 더 싸다. 행이 수만 건이 되면 `(next_attempt_at) where sync_status='pending'`을 추가한다.
- 임베딩은 Vercel 쪽 일이라 이 테이블에 임베딩 상태를 두지 않는다. `synced`는 "받기 API가 `notices`에 반영했다"는 뜻이다.

#### collector_runs — 보드 수집·전송 실행 이력

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint, identity PK | |
| kind | text, not null, check in (quick, full, backfill, sync) | 실행 종류. `sync`는 대기열 재전송만 하는 실행 |
| started_at | timestamptz, not null, default now() | |
| finished_at | timestamptz, null 허용 | 실행 중이면 null |
| status | text, not null, default 'running', check in (running, success, failed) | |
| pages_fetched | int, not null, default 0 | 가져온 목록 페이지 수 |
| found_count | int, not null, default 0 | 목록에서 본 글 수 |
| new_count | int, not null, default 0 | 새로 들어온 행 수 |
| changed_count | int, not null, default 0 | 내용이 바뀌어 다시 `pending`이 된 행 수 |
| synced_count | int, not null, default 0 | 이번 실행에서 전송 성공한 행 수 |
| sync_failed_count | int, not null, default 0 | 이번 실행에서 전송 실패한 행 수 |
| error_summary | text, null 허용 | 실패 요약. 차단 페이지는 `ip_blocked`, 마운트 없음은 `usb_not_mounted` 같은 짧은 코드로 시작(코드 값 `(미확정)`, A 몫) |

- 규칙(A와 같이 적용): 차단 안내 페이지(`p-subject` 0개)이거나 목록 0건이면 `status='success'`로 쓰지 않고 `failed`로 쓴다. Supabase
  시험 호출이 "success 0건"을 남긴 것과 같은 실수를 보드에서 반복하지 않기 위함이다.
- 시작 때 `running`이 10분 넘게 남은 행은 `failed`('stale')로 바꾼다(Supabase `collect_runs`의 N=10분과 같은 방식).
- 겹침 방지: 보드 DB의 advisory lock(`pg_try_advisory_lock`, 키 상수 `(미확정)`)으로 한 번에 하나만 돈다. 잡히지 않으면 조용히 끝낸다.
- 보존: 90일(Supabase `collect_runs`와 같은 값, `(미확정)`). 삭제는 수집기 시작 때 하는 정리 쿼리이며 승인 대상(B-8).

#### 대기열 상태 전이 (backend가 알아야 할 점)

| 지금 | 사건 | 다음 | 갱신 값 |
|---|---|---|---|
| (없음) | 새 글 수집 | pending | insert, next_attempt_at=now() |
| pending | 받기 API가 그 항목을 성공 처리 | synced | synced_at=now(), retry_count=0, last_error=null |
| pending | 받기 API 항목 결과 `unchanged`(`created`·`updated`와 같이 성공 취급) | synced | 위 성공 행과 같음 |
| pending | 네트워크 오류·5xx·시간 초과(그 배치 전체) 또는 항목 결과 `error`(`DB_ERROR`, 일시) | pending | retry_count+1, last_error, last_attempt_at, next_attempt_at=now()+백오프 |
| pending | retry_count가 상한(5, `(미확정)`)에 도달 | failed | last_error, last_attempt_at |
| pending | 항목 결과 `rejected`(`INVALID_FIELD`/`INVALID_URL`/`HASH_MISMATCH`, 영구 거부) | failed | last_error=코드, last_attempt_at (재시도 없이 즉시) |
| pending | 응답 401(인증 오류) 또는 400/413(요청 형식·크기 오류) | pending (불변) | **retry_count를 소모하지 않는다.** 항목 컬럼을 바꾸지 않는다. 키 설정·보드 버그는 항목의 잘못이 아니다. 실행 이력만 `failed`(`ingest_auth`/`ingest_bad_request`)로 남긴다 |
| synced · failed | 재수집에서 정리 값이 달라짐(title·body·content_hash·published_at·is_pinned·image_count·attachments 중 하나) | pending | retry_count=0, last_error=null, next_attempt_at=now() |
| failed | 운영자가 되살림 | pending | 수동 update 한 줄 |
| synced · failed · pending | 재수집에서 값이 같음 | 그대로 | `collected_at`, `raw_html`만 갱신 |

- 항목별 결과(`created`/`updated`/`unchanged`/`rejected`/`error`)와 응답 해석의 원본은 [[anyang-board-collector#C-2. 요청·응답 계약 (제안)]]와 [[anyang-board-collector#A-4. 흐름·성공 판정·겹침 방지]] 5번이다. 이 표는 그 결과가 만드는 상태 전이만 적는다.
- 백오프: `next_attempt_at = now() + 10분 × 2^retry_count`(10·20·40·80·160분, `(미확정)`).
- 전송 대상 선택: `where sync_status='pending' and next_attempt_at <= now() order by id limit <배치 크기>`. 배치 크기는 받기 API의 시간 예산에서 정해진다(C, backend).
- "값이 달라짐" 판정은 upsert 한 번으로 끝낸다. `on conflict (source_url) do update`에서 위 7개 값을 행 비교(`is distinct from`)해
  달라졌을 때만 `sync_status='pending'`으로 되돌린다. 구현 SQL은 구현 단계에서 쓴다.

### B-4. 접속 방식·권한

- 롤 `anyang_collector`: `LOGIN`, 슈퍼유저·`CREATEDB`·`CREATEROLE` 없음, **비밀번호 설정 안 함**. 새 DB의 소유자다.
- 접속: 유닉스 소켓 `/var/run/postgresql`, DB `anyang_collector`, 롤 `anyang_collector`. 포트·`DATABASE_URL` 형태의 비밀 값이 필요 없다. 예시 형태
  `postgres:///anyang_collector?host=/var/run/postgresql&user=anyang_collector` (값 없는 형태일 뿐 비밀 아님).
- 실행 OS 사용자: 기존 서비스 사용자 `arduino`(uid 1000) `(미확정)`. 새 OS 사용자를 만들지 않는다.
- **`pg_hba.conf` 변경 불필요.** 현재 `local ... trust`라 `arduino`가 소켓으로 바로 붙는다. 이 인증은 peer가 아니라 trust다 — 이 보드에서
  같은 컴퓨터의 누구든 어떤 롤로도 붙을 수 있다는 뜻이며, 이미 있는 상태다(이 설계가 만든 위험 아님, 바꾸지도 않음).
- 이 DB에 대한 방어는 롤 권한으로 한다: `revoke connect on database anyang_collector from public`, `grant connect to anyang_collector`. 기존 롤이
  `postgres` 하나라 실효는 작지만, 나중에 롤이 늘어도 새 DB가 열려 있지 않게 한다.
- peer 인증을 쓰려면 `pg_hba.conf`에 줄 추가 + `pg_ident.conf` 매핑(OS 사용자 `arduino` ≠ 롤 이름)이 필요하고 reload가 든다. 기존 설정 파일을
  건드리고 다른 줄과의 순서 문제가 생기므로 A안에서는 채택하지 않는다. B안은 새 인스턴스의 새 파일이라 peer를 쓸 수 있다.

### B-5. 기존 DB·서비스 무영향 근거

1. 만드는 것은 새 롤·새 테이블스페이스·새 DB뿐이다. `postgresql.conf`·`pg_hba.conf`·`pg_ident.conf`·기존 DB·기존 롤·기존 비밀번호는 바꾸지 않는다.
2. `create database`는 template0을 복사하며 다른 DB에 잠금을 걸지 않는다. 서버 재시작·reload가 필요 없다(A안).
3. 자원: 세션 1~2개(`max_connections` 100 중 현재 8), 메모리는 공용 `shared_buffers` 안에서 쓴다. 보드 가용 메모리 약 2.8G.
4. 디스크: 데이터는 USB(13G 여유), WAL만 eMMC(4.6G 여유)에서 공간을 쓴다.
5. 구현 단계에서 적용 전·후 스냅샷을 비교한다(F-1). 남는 위험은 R1(A안)뿐이며 B안이 이를 없앤다.

### B-6. 원문 보관 기간·용량 추정

- 실측: 안양시 목록 1페이지 HTML 약 90KB(메인 세션 실측, 글 10개). 상세 페이지 크기는 **실측하지 않았다.**
- 가정: 상세 1건 100KB(`(미확정)`, 근거: 목록과 같은 사이트 틀을 쓴다고 보는 상한 가정). PostgreSQL TOAST가 긴 텍스트를 압축하므로 저장은 이보다 작다.
- 합계(추정): 462건 × 100KB ≈ 46MB 원문, 압축 후 십수 MB. 정리 값 + 인덱스 + 실행 이력은 수 MB. 새 글이 하루 1건이면 연 약 10MB(추정, 근거: 게시 속도를
  알려진 값 없이 가정). 13G 여유 대비 무시할 수준이다.
- 보관 기간: `raw_html`은 같은 글이 다시 수집되면 **덮어쓴다**(이력 테이블 없음 — 462건 규모에서 버전 보관은 과하다). 기본은 기간 제한 없이 보관하고 DB가
  500MB를 넘으면 사람이 판단한다(`(미확정)`). 1년 넘은 `synced` 행의 `raw_html`을 null로 비우는 정리를 둘지는 사용자 결정(행은 남고 비우기만 한다).
- 용량 경보는 두지 않는다(규모가 작다). 필요하면 보드 모니터(`unoq-monitor`)가 디스크를 이미 본다.

### B-7. 스키마 문서 위치 판단

새 문서로 둔다(이 문서). 이유: 물리적으로 다른 DB(다른 서버·인스턴스)이고 마이그레이션 파일도 따로이며, [[anyang-database-schema]]는 이미 1,450줄이다. 중복 확인:
`jev dup` 결과 가장 가까운 문서가 `anyang-database-schema`(0.54)뿐이고 같은 주제는 없었다. `index.md`에 보드 DB 문서는 없다. 파일명 소문자-하이픈, owner database.
`anyang-database-schema`에는 이 문서로 가는 링크와 56 반영 단락만 넣었다.

### B-8. 마이그레이션 계획 (보드 DB, Supabase `0021`과 번호 체계가 다르다)

- 파일 위치 `(미확정)`: `web/collector/db/0001_init.{up,down}.sql` (수집기 소스와 같은 폴더의 `db/`, [[anyang-board-collector#A-1. 코드 구조와 파서 공유 (제안)]]).
- `collector_schema_migrations(version text primary key, applied_at timestamptz default now())` 한 테이블로 적용 여부를 기록한다. 도구는 `psql -f`이면 충분하다(별도 도구 없음).
- **0001_init up**(`anyang_collector` 롤로 새 DB 안에서 실행): 위 테이블 3개(`collected_notices`, `collector_runs`, `collector_schema_migrations`). 단일 트랜잭션.
- **0001_init down**: `drop table` 3개. **되돌릴 수 없다**(수집 데이터 삭제). 사용자 승인 필요. 수집이 시작되기 전(행 0개)이면 손실이 없다.
- **인프라 단계(`postgres` 슈퍼유저, 마이그레이션 파일이 아니라 일회성 절차)**: ① 폴더 생성·소유 변경 ② `create role anyang_collector login` ③ `create tablespace anyang_usb location ...`
  ④ `create database anyang_collector owner anyang_collector tablespace anyang_usb template template0 encoding 'UTF8'` (로케일은 `template1`에서 확인한 값 상속) ⑤ `revoke/grant connect`.
  B안은 ①~⑤ 대신 `pg_createcluster`·유닛 활성화.
- **되돌릴 수 없는 작업 표**(구현 단계 지시서에 항목별 사용자 승인이 있어야 실행):

  | 작업 | 이유 |
  |---|---|
  | 0001 down | 수집 데이터 삭제 |
  | `drop database anyang_collector` · `drop tablespace anyang_usb` · `drop role` · 폴더 삭제 | 데이터·인프라 삭제 |
  | `collector_runs` 90일 정리 쿼리 실행, `raw_html` 비우기 | 데이터 삭제·변경 |
  | `failed` 행 일괄 삭제 | 데이터 삭제 |

  테이블스페이스·DB·롤 **생성**과 0001 up은 되돌릴 수 없는 작업이 아니다(제거하면 되돌릴 수 있고, 제거 자체가 승인 대상).

### D. 서버 쪽(Supabase) 수집 경로 정리 — database 몫

읽기 전용 확인(2026-10-04, Supabase MCP):

- `pg_cron`: **설치되지 않음**(`cron` 스키마 없음, 사용 가능 확장 목록에는 있고 설치 버전 없음). 따라서 `collect-quick`·`collect-full`·`collect-job-trigger`는 등록된 적이 없고
  빼야 할 잡도 없다.
- `pg_net` 0.20.4: 진단용으로 설치돼 있다(55 4단계 승인 범위). 알림 잡(`notify-job-trigger`)에도 필요하므로 지우지 않는다.
- 결론: 운영 경로에서 빼는 일은 **설치·등록을 하지 않는 것**뿐이다. [[anyang-database-schema]]의 "pg_cron / pg_net 잡 정의" 수집 잡 두 개와 템플릿 교체 계획은
  이 결정으로 대체된다(그 문서에 표시함). `pg_cron` 설치는 알림 잡 때 따로 사용자 승인을 받는다.
- Vercel `/api/jobs/collect`(직접 수집)를 코드에서 지울지 남길지는 backend 몫(확인이 필요한 항목 6). 이 라우트는 클라우드 IP에서 항상 차단 페이지를 받는다.

시험 호출이 남긴 `collect_runs` 1행(id `68023809-1be2-45fe-9dbf-510e3f781b78`, 2026-10-03 18:19 UTC, `scheduled`, `success`, `collected_count` 0, `error_summary` null) 처리:

| 안 | 내용 | 평가 |
|---|---|---|
| (가) **failed로 갱신 — 권고** | `update ... set status='failed', error_summary='ip_blocked: 시험 호출, 차단 안내 페이지를 성공으로 잘못 기록' where id=...` 1행 | 이력이 남고 관리자 화면의 거짓 "성공"이 사라진다. 데이터 변경이라 사용자 승인 필요 |
| (나) 삭제 | 1행 delete | 이력이 사라진다. 사용자 승인 필요 |
| (다) 그대로 | 변경 없음 | 관리자 화면 "마지막 성공"이 거짓이 된다. 90일 정리 잡은 아직 등록 안 됐다 |

- 어느 안이든 운영 DB 쓰기라 구현 단계 지시서에 사용자 승인이 별도로 있어야 한다. 이번 설계 단계에서는 실행하지 않았다.

`collect_runs`와 보드 이력:

- 보드 실행 이력의 원본은 보드 `collector_runs`다. Supabase `collect_runs`에는 받기 API가 **호출 1회당 1행**을 남기는 것을 권고한다(`trigger_type='scheduled'`,
  `collected_count`=그 호출에서 새로 반영한 공지 수). 관리자 화면 "공지 수집 관리"가 이어서 동작한다.
- **Supabase 스키마 변경은 필요 없다**(권고). 받기 API가 쓰는 `notices` 컬럼은 모두 있고, upsert 키는 `source_url`(unique 있음)이다. `collect_runs.mode`
  컬럼(55 미확정)은 여전히 선택이다 — 관리자 화면에서 quick/full/backfill을 구분해 보여야 한다면 0022가 필요하다. 권고는 추가하지 않는 것이다(구분은 보드 이력으로 충분). 사용자·backend 결정.
- backend 답변(2026-10-04, 모두 제안 `(미확정)`): 0건·차단 보고는 받는다(`items: []` + `report`, `failed` 행), 보드 `collected_at`은 보내지 않는다(서버가 받은 시각),
  `/api/jobs/collect`는 지우지 않고 `DIRECT_COLLECT_ENABLED` 스위치로 닫는다, `collect_runs`는 호출 1회당 1행, `collect_runs.mode`(0022)는 불필요.
  근거와 계약은 [[anyang-board-collector#보드 DB 문서에 대한 답 (database 문서 확인이 필요한 항목 6, 미해결 5번)]], [[anyang-board-collector#C-4. 저장·임베딩·실행 기록]], [[anyang-board-collector#D. Vercel 직접 수집 경로 정리]]. 이 문서는 그에 맞춰 위 권고(Supabase 스키마 변경 없음)를 유지한다.
- (원래 한계, 위 답변으로 해소 예정) 차단 페이지 때문에 **보드가 아무것도 보내지 않으면** Supabase에는 행이 생기지 않아 관리자가 "수집 실패"를 볼 수 없다. 받기 API가 0건 상태 보고(예 `blocked`)를 받아
  `failed` 행을 남기게 할지는 backend와 맞출 부분이다(확인이 필요한 항목 6). 받지 않는 경우의 대안은 "마지막 성공 이후 N분 경과"를 관리자 화면에서 계산하는 것이다.

### F. 테스트 방법·적용 절차·롤백·장애 영향

#### F-1. 보드 DB 생성·적용 절차 (구현 단계, 기존 서비스 무중단 — 승인 필요)

1. 적용 전 스냅샷(읽기 전용): `pg_database`(이름·크기·`datacl`), `pg_roles`, `pg_tablespace`, `pg_hba.conf`·`postgresql.conf`의 sha256, `systemctl is-active`(agentvault-api, agentvault-public, exam-server,
   unoq-monitor, anyang-docs, nginx, postgresql@17-main), `pg_stat_activity` 수, 최근 `journalctl -u postgresql@17-main`.
2. 마운트 확인: `mountpoint -q /mnt/usb`, 여유 용량. 새 폴더 생성. 기존 `/mnt/usb/postgresql`·`/mnt/usb/data` 비접촉 확인.
3. 인프라 단계(B-8): `sudo -u postgres psql`로 role → tablespace → database → connect 권한. 각 문장은 서버 재시작·reload 없이 끝난다. 하나 실패하면 거기서 멈추고 보고한다(자동 되돌림 없음).
4. `anyang_collector` 롤로 0001 up 적용. `collector_schema_migrations`에 기록.
5. 적용 후 스냅샷 비교: 2·3·4번 해시·`datacl`·기존 DB 크기·서비스 상태가 1번과 같아야 한다(차이는 새 DB·롤·테이블스페이스뿐). `journalctl`에 새 오류 없음.
6. 위치 확인: `select pg_relation_filepath('collected_notices')` 결과가 `pg_tblspc/...`(USB 쪽)이고 `df`로 USB 사용량만 늘었는지 본다.
7. B안이면 3번 대신 `pg_createcluster`로 새 인스턴스를 만들고 시작한다. 기존 클러스터에는 명령 자체를 내리지 않는다.

#### F-2. 시험

- **격리 시험(라이브 클러스터를 건드리지 않음)**: 보드에서 임시 클러스터(`initdb -D <임시 폴더>`, 다른 포트·소켓 폴더, `postgres` OS 사용자)를 만들어 아래를 확인한다. 끝나면 임시 폴더를 지운다(자기가 만든 임시 폴더만, 사용자 승인된 정리 범위로 지시서에 적는다).
  1. 0001 up이 오류 없이 적용되고, 테이블 제약(check, unique, not null)이 동작한다.
  2. 대기열 전이 SQL(B-3 표 전체, 401/400 횟수 미소모 포함)을 `insert`/`update`로 재현해 기대 상태가 나온다. 같은 값 재수집은 `synced`를 유지하고, 값이 달라지면 `pending`+`retry_count=0`이 된다.
  3. 백오프·상한: `retry_count` 4→5에서 `failed`.
  4. **USB 미마운트 모사**: 테이블스페이스 폴더를 일시 이름 변경한 뒤 서버 재시작·접속·다른 DB 접속이 어떻게 되는지 확인한다(R1 포함 여부 판단 근거). 결과를 이 문서에 반영한다.
  5. 동시 실행: advisory lock이 두 번째 세션을 막는다.
- **라이브 확인(F-1 5~6번)**: 새 DB 접속 `select 1`, 테이블 존재, 소켓·`arduino` 사용자로 비밀번호 없이 접속, 기존 DB 접속·쿼리가 그대로.
- Supabase 쪽(`notices` 컬럼, `collect_runs`)은 바꾸지 않으므로 이 문서 범위의 Supabase 시험은 없다. 시험 호출 행 처리(D) 적용 시 해당 1행만 조회로 확인한다.
- 받기 API와의 결합 시험(보드 `pending` → Vercel → `synced`)은 [[anyang-backend-api]] 시험 방법이 원본이다.

#### F-3. 롤백

| 단계 | 방법 | 승인 |
|---|---|---|
| 수집기만 멈춤 | 타이머 비활성화. DB·데이터 그대로 | 불필요 |
| 테이블 비우기·재수집 | `truncate`는 데이터 삭제 | 필요 |
| DB 제거 | `drop database anyang_collector` → `drop tablespace anyang_usb`(비어야 함) → `drop role` → 폴더 삭제 | **필요(삭제)** |
| B안 | `pg_dropcluster 17 collector` | **필요(삭제)** |
| 부분 실패 | 만든 것만 역순으로 제거(위 표). 기존 객체는 건드리지 않는다 | 제거는 필요 |

보드 DB는 사본이라 제거해도 Supabase 데이터는 영향이 없다. 제거 전에 `pending`/`failed` 행 수를 확인한다(전송 안 된 것이 있으면 수집을 다시 하면 된다).

#### F-4. 장애 영향

| 장애 | 영향 | 복구 |
|---|---|---|
| 보드 전원·회선 꺼짐 | 새 글 반영만 늦어진다. 앱·추천·알림은 Supabase로 그대로 동작 | 켜지면 타이머 재개, `full`이 놓친 글을 메운다 |
| USB 미마운트 | 수집 중단(가드). A안은 R1 위험 | 마운트 후 재개 |
| 보드 PostgreSQL 다운 | 수집 중단. 기존 앱(AgentVault 등)도 같은 서버라 같은 영향(이 설계가 만든 의존 아님) | 서버 재시작 |
| 안양시가 보드 IP도 차단 | 수집기가 `ip_blocked`로 실패 기록. 새 글 반영 불가(차단 기준 미확인) | 사용자 판단(다른 회선 등) |
| Vercel 받기 API 장애 | `pending`이 쌓이고 백오프. 복구되면 자동 전송 | 자동 |
| 대기열 증가 | 용량은 무시할 수준(B-6) | — |

## 확인이 필요한 항목

(pm이 프로젝트 문서에 반영한다. 모든 제안값은 `(미확정)`)

1. 구성안: A안(같은 클러스터 + USB 테이블스페이스) 대 B안(USB 별도 클러스터). database 권고는 B안(R1).
2. 폴더 `/mnt/usb/anyang-collector/pg`, 실행 OS 사용자 `arduino`, 기존 `/mnt/usb/postgresql`(미사용 데이터 디렉터리 복사본)·`/mnt/usb/data`(빈 폴더)의 용도.
3. `retry_count` 상한 5, 백오프 10분×2^n, `collector_runs` 보존 90일, `raw_html` 보관 정책(무제한 + 500MB 판단 / 1년 후 비우기).
4. Supabase `collect_runs` 시험 호출 1행: (가) failed 갱신 권고 / (나) 삭제 / (다) 그대로 — 사용자 승인.
5. Supabase 스키마 변경 없음(권고) 확정 여부, `collect_runs.mode` 컬럼(0022) 추가 여부.
6. backend와 맞춘 것(답변 받음, 사용자 확정 대기): 0건·차단 보고 수신, `collected_at` 미전송, `/api/jobs/collect` 존치 + 스위치, 호출 1회당 `collect_runs` 1행 — [[anyang-board-collector#보드 DB 문서에 대한 답 (database 문서 확인이 필요한 항목 6, 미해결 5번)]]. 항목 5의 `mode` 컬럼은 backend도 불필요로 답했다.

## Links

- [[anyang-youth-policy-assistant]] — 확인 항목 56
- [[anyang-database-schema]] — Supabase 스키마 원본(`notices`, `collect_runs`), 수집 잡 대체 표시
- [[anyang-deployment-portability]] — 수집 주체 변경 결정
- [[anyang-backend-api]] — 보드 수집기(A)·받기 API(C) 설계, 해시·image_count 규칙
- [[anyang-board-collector]] — 보드 수집기·받기 API 설계(backend 소유), 항목별 결과·401/400 처리·미해결 답변
- [[anyang-backend-tasks]] — 작업 단위 5-6~5-9
