---
type: design
date: 2026-10-04
status: active
owner: backend
---

# 안양 청년정책 비서 — 보드 수집기·Vercel 받기 API 설계 (확인 항목 56)

## Summary

안양시 사이트가 클라우드 IP를 막아(확인 항목 56) 공지 수집은 UNO Q 보드가 맡고, 결과를 Vercel의 새 받기 API
`POST /api/ingest/notices`로 보낸다. 앱 주 DB(Supabase)·추천·임베딩·푸시는 바뀌지 않는다. 이 문서가 다루는 것은
A 보드 수집기, C 받기 API, D Vercel 직접 수집 경로 정리, F 테스트·배포·롤백이다. 보드 DB(B)는 database 소유 문서
[[anyang-board-collector-db]]가 원본이고, 파서 규칙·해시·`image_count`는 [[anyang-backend-api]] 5절·5-1절이 원본이다.

핵심 결정(모두 제안, ``, 설계 승인으로 확정):

- 파서는 `web/lib/notice-parser.ts` 한 곳으로 분리해 Vercel(`web/`)과 보드가 같은 코드를 쓴다. 보드 수집기 소스는
  `web/collector/`에 두고 번들러로 **파일 1개(`anyang-collector.mjs`)**로 묶어 보드에 복사한다. 보드에서 `npm install`·Docker 없음.
- 실행은 **systemd timer**(cron 아님). quick 10분, full 서울 04:00, backfill은 수동.
- 인증용 새 키 **`COLLECTOR_INGEST_SECRET`**(헤더 `x-collector-secret`) 하나. `BACKFILL_SECRET`은 재사용하지 않는다.
- 받기 API는 한 번에 최대 20건, 항목별 결과를 돌려주고, 호출 1회당 Supabase `collect_runs` 1행을 남긴다.
- Vercel 직접 수집 라우트는 지우지 않고 **환경변수 스위치(기본 꺼짐)로 닫는다**. 관리자 화면 "수동 수집" 버튼은 영향을 받는다 —
  frontend 설계가 필요하다.

## Context

- 사용자 결정(2026-10-04): 수집은 보드, 앱 주 DB Supabase 불변, 기존 비밀번호·키·환경변수 변경 금지(새 키 추가는 가능),
  `DATABASE_URL` 로컬 미보관. 기록: [[anyang-deployment-portability]] "수집 주체 변경", [[anyang-youth-policy-assistant]] 확인 항목 56.
- 보드 읽기 전용 확인(2026-10-04, SSH 조회만, 변경 없음): systemd 257, 시간대 Asia/Seoul, `/usr/bin/node` v20, cron 서비스도 켜져 있음,
  `arduino` 사용자는 linger 꺼짐(사용자 단위 systemd는 로그아웃 뒤 안 돈다), 저널 디스크 사용 45.5M, 기존 타이머는 시스템 유틸뿐,
  `/home/arduino`에 기존 앱 폴더(`anyang-docs`, `exam-server`, `monitor` 등), `/mnt/usb` 마운트됨(13G 여유), 보드에서 Vercel 도메인에 HTTPS 응답이
  온다(루트 GET이 307 — 배포 보호 여부는 아직 모름, 아래 미확인). 포트·접속 정보는 이 문서에 쓰지 않는다.
- 보드 DB의 테이블·대기열 상태 전이·백오프·보존은 [[anyang-board-collector-db]]를 따르고 여기서 값을 복제하지 않는다.

## Details

### A. 보드 수집기

#### A-1. 코드 구조와 파서 공유 (제안)

검토한 방식: (1) 파서만 모듈로 분리해 한 저장소에서 공유, (2) 빌드 산출물만 복사, (3) 보드용 별도 패키지 폴더(코드 복사).
(3)은 두 벌이 어긋난다. (1)+(2)를 합친다 — 소스는 한 곳, 보드에는 번들 1개만 둔다.

| 위치 | 내용 |
|---|---|
| `web/lib/notice-parser.ts` (신규) | `collector.ts`에서 **순수 부분만** 옮긴다: `BOARD_*` 상수, `detailUrlFor`, `parseListPage`, `parseDetailPage`, `contentHash`, `userAgent()`, `DEFAULT_REQUEST_DELAY_MS`, 타입. DB·Next 의존 없음(cheerio만). 신규 `isBlockedPage(html)`·`hasDetailContent(html)`(A-4). `robots.ts`는 이미 순수라 그대로 쓴다. |
| `web/lib/collector.ts` | 위를 import해 다시 export한다(기존 `web/test/collector.test.ts`의 import 경로 유지). 동작은 바뀌지 않는다. |
| `web/lib/notice-store.ts` (신규) | `runCollectJob`의 항목 저장 블록(5-1절 3번: 같은 해시면 메타 4개만, 다르면 upsert + `notice_chunks` 삭제, 없으면 삽입)을 함수 `saveNotice(client, item)`로 뺀다. 서버 수집기와 받기 API가 같이 쓴다. 한 항목은 **한 트랜잭션**이다(upsert와 청크 삭제 사이에 끊겨 재임베딩이 영영 안 걸리는 구멍을 막는다). |
| `web/collector/` (신규) | 보드 프로그램 소스: `main.ts`(명령·흐름), `store.ts`(보드 DB SQL), `ingest-client.ts`(받기 API 호출). 위 `lib/` 모듈은 상대 경로로 import한다. `@/` 별칭과 `lib/db.ts`(Supabase 풀)는 쓰지 않는다. |
| `web/collector/db/` | 보드 DB 마이그레이션 `0001_init.{up,down}.sql`. database 문서가 `collector/db/`로 적었으므로 경로 확정은 그쪽 수정 필요(미해결 질문 2). |
| `web/scripts/build-collector.mjs` (신규) | `esbuild`로 `web/collector/main.ts` → `web/dist-collector/anyang-collector.mjs`(node20, ESM, cheerio·pg 포함, `pg-native`는 external). `dist-collector/`는 커밋하지 않는다(.gitignore). |

- 새 devDependency는 `esbuild` 하나 ``. `vite`가 `rolldown`을 끌고 오지만 직접 쓰지 않는다(전이 의존에 기대면 vite 업데이트 때 깨진다).
  cheerio·pg는 `web/package.json`에 이미 있는 같은 버전을 쓴다 — 파서 동작이 Vercel과 보드에서 같다.
- 보드에 필요한 것은 Node 20(있음)과 이 파일 1개뿐이다. 보드의 Node가 바뀌어도 번들은 target만 맞으면 된다.
- 이전 가능성 원칙([[anyang-deployment-portability]]): Docker 미사용, 표준 PostgreSQL(`pg` 드라이버, 소켓), Vercel 전용 기능 없음 — 지킨다.

#### A-2. 실행 방식 — systemd timer 채택 (제안)

| | systemd timer | cron |
|---|---|---|
| 꺼져 있던 시간 보충 | `Persistent=true`로 켜질 때 한 번 실행 | 없음(놓치면 끝) |
| 겹침 | 같은 service가 돌고 있으면 새로 시작하지 않음 | 직접 막아야 함 |
| 로그 | journald에 자동(`journalctl -u`), 회전도 journald가 함 | 메일/리다이렉트 파일을 따로 관리 |
| 자원·권한 제한 | 유닛 옵션(`Nice`, `MemoryMax`, `NoNewPrivileges` 등) | 없음 |
| USB 가드 | `ConditionPathIsMountPoint=/mnt/usb` | 스크립트에서 직접 |
| 비용 | 유닛 파일 4개 | crontab 2줄 |

보드에는 cron도 켜져 있지만 위 이유로 timer를 고른다. 시스템 유닛(`/etc/systemd/system/`)으로 둔다 — `arduino`의 linger가 꺼져 있어 사용자 유닛은
로그아웃 뒤 멈춘다. 설치에는 `sudo`가 든다(구현 단계 사용자 승인).

| 유닛 | 내용 |
|---|---|
| `anyang-collector@.service` | `Type=oneshot`, `User=arduino`, `ExecStart=/usr/bin/node /home/arduino/anyang-collector/anyang-collector.mjs %i`, `EnvironmentFile=/etc/anyang-collector/collector.env`, `ConditionPathIsMountPoint=/mnt/usb`, `TimeoutStartSec=900`, `Nice=10`, `MemoryMax=300M`, `CPUQuota=50%`, `NoNewPrivileges=yes`, `PrivateTmp=yes`, `ProtectSystem=strict`, `ProtectHome=read-only`. 값 ``(자원 값은 보드 실측 전 가정). |
| `anyang-collector-quick.timer` | `OnCalendar=*:3/10`(매 시 03·13·…·53분), `Unit=anyang-collector@quick.service`. 04:00 full과 겹치지 않게 3분 비켜 둔다(겹치면 락 때문에 한쪽이 조용히 건너뛰어 full을 놓칠 수 있다). |
| `anyang-collector-full.timer` | `OnCalendar=*-*-* 04:00:00 Asia/Seoul`, `Persistent=true`, `Unit=anyang-collector@full.service`. 서울 04:00은 확정값(user, 2026-10-04). |
| backfill | 타이머 없음. 수동(F-3 절차): `sudo systemd-run --unit=anyang-collector-backfill --uid=arduino -p EnvironmentFile=/etc/anyang-collector/collector.env -p ConditionPathIsMountPoint=/mnt/usb -p RuntimeMaxSec=7200 /usr/bin/node …/anyang-collector.mjs backfill --from 1 --to 47`. |

- 10분 주기는 확정(user)이다. `quick`의 분 오프셋(03분)만 제안이다.
- 포트를 열지 않는다(밖으로 나가는 HTTPS 요청과 로컬 소켓뿐). 기존 서비스와 포트 충돌이 없고, 자원은 위 상한으로 묶는다.
  실행 사용자는 database 문서가 제안한 기존 `arduino`와 같다. 새 OS 사용자는 만들지 않는다.

#### A-3. 설치 경로·설정·로그

| 항목 | 값 (제안) |
|---|---|
| 코드 | `/home/arduino/anyang-collector/anyang-collector.mjs` (eMMC. 기존 `anyang-docs` 등과 같은 위치 관례). 직전 버전은 `anyang-collector.mjs.prev`로 남겨 롤백에 쓴다. |
| 설정·비밀값 | `/etc/anyang-collector/collector.env` — 소유 `root:root`, 모드 `0600`. systemd가 root로 읽어 환경변수로 넘기므로 `arduino`가 파일을 읽을 필요가 없다. 값은 문서·로그·명령줄(`ps`)에 나타나지 않는다. |
| DB 접속 | 별도 변수 없이 libpq 표준 변수를 쓴다: `PGHOST=/var/run/postgresql`, `PGDATABASE=anyang_collector`, `PGUSER=anyang_collector`. 비밀번호 없음([[anyang-board-collector-db#B-4. 접속 방식·권한]]). `DATABASE_URL`이라는 이름은 쓰지 않는다(Supabase 값과 혼동 방지). |
| 로그 | stdout/stderr → journald. `journalctl -u 'anyang-collector@*'`. 회전·용량은 journald 설정을 따른다(보드 저널 현재 45.5M). 별도 로그 파일·logrotate 없음. 로그에는 건수·상태·오류 코드만 쓰고 본문·HTML·키는 쓰지 않는다. |
| 보관 이력 | 실행 이력의 원본은 보드 `collector_runs`([[anyang-board-collector-db#collector_runs — 보드 수집·전송 실행 이력]]). |

`collector.env`에 들어가는 변수:

| 변수 | 비밀 | 설명 |
|---|---|---|
| `COLLECTOR_INGEST_SECRET` | 예 | C의 인증 키. Vercel 쪽과 같은 값. 사용자가 만든 임의 문자열(길이 32자 이상 권장). 에이전트는 값을 만들지도 보지도 않는다. |
| `COLLECTOR_INGEST_URL` | 아니오 | 받기 API 기준 주소(Vercel 운영 주소). 코드에 하드코딩하지 않는다(이전 가능성). |
| `COLLECTOR_CONTACT` | 아니오 | 요청 User-Agent의 문의 연락처. **값은 사용자가 정한다**. 비어 있으면 연락처 없는 UA `anyang-youth-policy-bot/1.0`(5-1절 8번과 같은 동작). |
| `PGHOST` · `PGDATABASE` · `PGUSER` | 아니오 | 위 DB 접속. |

#### A-4. 흐름·성공 판정·겹침 방지

명령: `quick` · `full` · `backfill --from N --to M [--no-sync]` · `sync` (대기열 재전송만, `collector_runs.kind='sync'`) · `--dry-run`(목록 1페이지를 받아
파싱 결과만 출력하고 아무것도 저장·전송하지 않음, F-3 시험용).

1. **겹침 방지**: 보드 DB에 접속해 `pg_try_advisory_lock`(세션 락. 보드는 소켓 직결이라 풀러 문제가 없다)을 잡는다. 못 잡으면 로그 한 줄 남기고 종료 코드 0.
   `running`으로 10분 넘게 남은 행은 `failed('stale')`로 바꾼다([[anyang-board-collector-db]]). systemd 쪽의 "같은 유닛 중복 시작 안 함"이 1차, 이 락이 2차(quick·full·backfill 사이)다.
2. **수집**(모드별 범위·상세 대상은 [[anyang-backend-api#5-1. 전체 수집·모드·겹침 방지·백필 (신규, 2026-10-04, 확인 항목 55, 사용자 확정 반영)]] 2번 표와 같다. 다른 점:
   "DB에 이미 있음" 판정은 **보드 `collected_notices`** 기준이고, `backfill`은 한 호출 5페이지 제한이 없다(보드에는 300초 한도가 없다) — `--from 1 --to 47`을 한 번에 돌 수 있고,
   이미 보드에 있는 `source_url`은 건너뛴다(중간에 끊겨도 같은 명령으로 이어진다)).
   - 요청 간격 2초(맨 처음 제외 모든 요청 사이), `robots.txt`는 실행마다 1회 확인(`Crawl-delay`가 있으면 그 값). 모두 서버 수집기와 같은 코드다.
   - 항목 처리: 상세를 받아 `parseDetailPage`, 정리 값 + `raw_html`을 보드 DB에 upsert(같은 값이면 `synced` 유지, 달라지면 `pending`).
3. **성공 판정 — 차단 페이지·0건은 성공이 아니다**(보드 DB 문서의 규칙과 같다):

   | 상황 | 판정 | 코드(`error_summary` 접두, ``) |
   |---|---|---|
   | 응답 `meta[name=description]`에 `IP 차단`이 있음(목록·상세 어느 쪽이든) | 즉시 중단, 실행 `failed`. 이 응답으로는 아무것도 저장하지 않음 | `ip_blocked` |
   | 첫 목록 페이지에서 `p-subject` 0개(차단 표지 없음) | `failed` | `empty_list` |
   | `backfill`에서 2페이지 이상이 빈 목록 | 게시판 끝으로 보고 정상 종료(5-1절 2번과 같음) | — |
   | 상세에 본문 칸 `td.p-table__content`가 없음 | 그 항목은 저장하지 않고 건너뜀, 실행은 끝까지 간 뒤 `failed` | `parse_failed` |
   | HTTP 오류·시간 초과 | 그 요청에서 중단, `failed` | `fetch_failed` |
   | `robots.txt` Disallow | `failed` | `robots_disallowed` |

   `isBlockedPage`는 `meta description`의 문구와 `p-subject` 부재로 판정한다. 문구가 사이트에서 바뀌면 `empty_list`로 떨어지므로 어느 쪽이든 성공으로 기록되지 않는다.
   본문이 빈 공지(이미지만 있는 글)는 정상이라 본문 길이로는 판정하지 않는다.
4. **차단 중 쉬기**: 마지막 실행이 `ip_blocked`였고 60분이 안 지났으면 사이트를 가져오지 않고 3단계(전송)만 한다. 막힌 사이트를 10분마다 두드리지 않기 위함이다(60분 ``).
5. **전송**: 3번 이후(수집이 실패했어도) `sync_status='pending' and next_attempt_at <= now()` 항목을 id 순으로 **20건씩** 받기 API에 보낸다([[anyang-board-collector-db]] 전송 대상 선택).
   배치는 순차(병렬 없음 — Gemini 한도와 서버 시간 예산 때문). 한 실행의 전송 상한은 `quick`/`full` 30배치, `backfill`·`sync` 무제한(전체 실행 2시간 제한).
   응답 해석:

   | 응답 | 보드 동작 |
   |---|---|
   | 200, 항목 `created`/`updated`/`unchanged` | `synced` |
   | 200, 항목 `rejected` | 영구 거부 → `failed`, `last_error`에 코드 |
   | 200, 항목 `error` (일시) | `pending` 유지, `retry_count`+1, 백오프 |
   | 네트워크 오류·시간 초과·5xx | 그 배치 전체 `retry_count`+1, 백오프 |
   | 401 | **항목 상태를 바꾸지 않고** 전송 중단, 실행 `failed('ingest_auth')`. 키 설정 오류는 항목의 잘못이 아니므로 재시도 횟수를 소모하지 않는다 |
   | 400/413 (요청 형식·크기) | 항목 상태 변경 없이 중단, 실행 `failed('ingest_bad_request')`. 보드 버그 신호 |

   재시도 상한·백오프 값은 database 문서([[anyang-board-collector-db]] 대기열 상태 전이)가 원본이다. 401/400의 "횟수 미소모"는 그 표에 없는 보강이라 database에 반영을 요청한다(미해결 질문 2).
   요청 타임아웃은 280초 ``(함수 한도 300초 안).
6. **0건·실패 보고**: Supabase 관리자 화면이 "수집 실패"를 볼 수 있도록, 아래 경우에 **항목 없는 호출**(`items: []`, `report` 포함)을 보낸다.
   - `full` 실행은 성공이든 실패든 끝에 한 번 보고한다(하루 1행의 "살아 있음" 신호).
   - `quick`은 **직전 실행이 실패가 아니었는데 이번에 실패했을 때만** 보고한다(차단이 계속돼도 10분마다 행이 쌓이지 않고, 연속 실패의 첫 번째만 남는다).
   - 새 글이 없는 정상 `quick`은 호출하지 않는다(Supabase `collect_runs`가 10분마다 쌓이지 않게. 하루 144행 방지).
7. **남은 임베딩**: 받기 API 응답의 `remaining_unembedded`가 0보다 크면 보드가 `POST /api/jobs/embed`(헤더 `x-collector-secret`)를 부른다.
   `embedded_chunks === 0`이 나오거나 한 실행당 10회에 닿으면 멈춘다(다음 실행이 이어간다). 임베딩 실패는 수집·전송 결과에 영향을 주지 않는다(5-1절 5번과 같음).
8. 종료: `collector_runs` 갱신(`status`, 건수, `error_summary`), 락 해제. 종료 코드는 `success`면 0, `failed`면 1(journald에 실패가 남는다).

- 이 절의 10·60·20·30 같은 상수는 모두 구현 시 코드 상수 한 곳에 둔다. 값은 ``.
- Jev 판단 후보는 없다(차단·빈 목록·파싱 실패는 결정적 규칙으로 판정한다).

### C. Vercel 받기 API — `POST /api/ingest/notices`

파일: `web/app/api/ingest/notices/route.ts`(신규), 헬퍼는 `web/lib/scheduler-auth.ts`에 `requireCollectorSecret` 추가, 저장은 `notice-store.ts`.
`maxDuration = 300`.

#### C-1. 인증 — 새 키 `COLLECTOR_INGEST_SECRET` (이름 제안)

- 헤더 `x-collector-secret` ↔ 환경변수 `COLLECTOR_INGEST_SECRET`, 기존과 같은 `timingSafeEqual` 비교(길이가 다르면 비교 전에 불일치). 환경변수가 비어 있거나 없으면 이 라우트는 **어떤 헤더로도 401**(비활성). 401은 빈 body(기존과 같음).
- `x-scheduler-secret`·`x-backfill-secret`으로는 이 라우트를 열 수 없다(권한 분리). 반대로 `/api/jobs/embed`는 `x-collector-secret`도 받는다(기존 둘 + 이것, 셋 중 하나).
- **`BACKFILL_SECRET`을 재사용하지 않는 이유**: 그 키는 "백필이 끝나면 지운다"는 수명으로 설계됐다(5-1절 7번). 보드는 백필 뒤에도 quick/full마다 영구히 호출하므로, 재사용하면 백필 정리(키 삭제)가 보드의 상시 수집을 멈춘다.
  `SCHEDULER_SHARED_SECRET`은 값을 아무도 모르고(프로젝트 문서 55-v) 바꾸는 것도 금지라 쓸 수 없다. 서버 백필은 클라우드 IP 차단으로 쓸 수 없게 됐으므로 `BACKFILL_SECRET`은 쓸 곳이 없다 — 사용자가 원하면 Vercel에서 지워도 되지만(선택, 환경변수 변경이라 사용자 몫) 이 설계는 요구하지 않는다.
- 키가 새면 가짜 공지를 DB·RAG에 넣을 수 있다. 완화: 입력 검증(C-3, 안양시 도메인·URL 형식 고정), 해시 재계산, 키 교체는 양쪽(Vercel·보드 `collector.env`) 값 교체 + 보드 서비스 재시작 없이 다음 실행부터 적용.

#### C-2. 요청·응답 계약 (제안)

요청: `Content-Type: application/json`

```text
{
  "kind": "quick" | "full" | "backfill" | "sync",        // 보드 실행 종류. 서버는 로그·error_summary에만 쓴다
  "items": [ {
      "source_url": "https://www.anyang.go.kr/youth/selectBbsNttView.do?key=3543&bbsNo=1184&nttNo=<숫자>",
      "title": string, "body": string, "content_hash": 64자 hex,
      "published_at": "YYYY-MM-DD" | null,
      "is_pinned": boolean, "image_count": 정수,
      "attachments": [ { "name": string, "url": string } ]
  } ],                                                    // 0~20건
  "report": { "status": "failed", "error_code": "ip_blocked" | "empty_list" | "parse_failed" | "fetch_failed" | "robots_disallowed" }  // 선택
}
```

- `raw_html`·`collected_at`은 보내지 않는다. `raw_html`은 보드 보관용이고 서버는 필요 없다(요청 크기 절감). `collected_at`은 **받은 시각(`now()`)을 서버가 정한다** — 알림 대상 판정(`collected_at > enabled_at`)과 임베딩 대기 순서가 "Vercel이 받은 시각"에 의존하고, 보드가 늦게 켜져서 오래된 시각으로 들어오면 그사이 알림을 켠 사용자가 놓칠 수 있다.

응답:

| 상황 | 상태 | body |
|---|---|---|
| 정상 처리(일부 항목 거부·오류 포함) | 200 | `{ "results": [ { "source_url", "result": "created" \| "updated" \| "unchanged" \| "rejected" \| "error", "code"?: string } ], "collected_count": number, "remaining_unembedded": number \| null }` |
| 인증 실패 | 401 | 빈 body |
| JSON이 아님, 항목 21건 이상, 필드 누락 등 **요청 전체 형식 오류** | 400 | `{ "error": "INVALID_BODY" }` |
| 본문 총 크기 초과 | 413 | `{ "error": "PAYLOAD_TOO_LARGE" }` |
| 서버 오류 | 500 | `{ "error": "INGEST_FAILED" }` |

- `results`는 요청 `items`와 같은 순서·같은 길이다. 항목 `result`: `created`(새 글) · `updated`(해시가 달라 갱신 + 청크 삭제) · `unchanged`(해시 같음, 메타 4개만 갱신) · `rejected`(`code`: `INVALID_FIELD`/`INVALID_URL`/`HASH_MISMATCH` — 영구 거부, 재전송해도 같다) · `error`(`code`: `DB_ERROR` — 일시적, 재전송 가능).
- `collected_count`는 `created`+`updated` 합계다(5-1절 3번 규칙과 같음).
- 같은 항목을 다시 보내도 결과가 같다(멱등). 보드가 시간 초과로 응답을 못 받고 재전송해도 `unchanged`가 된다.
- 항목 하나의 실패가 다른 항목을 막지 않는다(항목별 트랜잭션).

#### C-3. 입력 검증 (서버는 파싱하지 않고 검증만)

| 대상 | 규칙 (상한 값 ``) |
|---|---|
| 요청 | 항목 최대 20건, 요청 본문 최대 4MB(Vercel 함수 본문 한도 4.5MB 아래) — 초과는 400/413. |
| `source_url` | 정확히 `https://www.anyang.go.kr/youth/selectBbsNttView.do?key=3543&bbsNo=1184&nttNo=<숫자>` 형식(`notice-parser`의 `detailUrlFor`와 같은 정규식). 다른 도메인·`http`·추가 쿼리는 `rejected: INVALID_URL`. |
| `title` | 문자열, 1~500자(공백 제거 뒤). 제어 문자 제거는 하지 않고 NUL(`\u0000`)이 있으면 거부(PostgreSQL이 받지 못함). |
| `body` | 문자열, 0~200,000자(빈 본문 허용 — 이미지만 있는 글). |
| `content_hash` | 64자 hex, 그리고 서버가 `contentHash(title, body)`로 다시 계산한 값과 같아야 함(다르면 `rejected: HASH_MISMATCH`). 해시 정의는 한 곳(`notice-parser`)이라 비용이 없다. |
| `published_at` | `null` 또는 실제 달력 날짜 `YYYY-MM-DD`. |
| `is_pinned` | boolean. `image_count`: 0~1000 정수. |
| `attachments` | 최대 50개, 각 `name` 1~300자, `url`은 `https://www.anyang.go.kr/` 아래이고 경로에 `downloadBbsFile.do` 포함, 같은 `url` 중복 거부. |
| `report` | `status`는 `failed`만, `error_code`는 위 5개 중 하나. 아니면 400. `report`가 있으면 `items`가 비어 있어도 된다. |

SQL은 모두 매개변수 바인딩이다(문자열 이어붙이기 없음). 응답·로그에 본문을 되돌려 보내지 않는다.

#### C-4. 저장·임베딩·실행 기록

1. 항목마다 `saveNotice` 호출 — 규칙은 5-1절 3번 그대로: `source_url` 기준 upsert, 해시 같으면 `is_pinned`·`image_count`·`attachments`·`published_at`만 갱신(`collected_at`·`notice_chunks` 불변),
   해시 다르면 전체 upsert + `notice_chunks` 삭제(재임베딩 대기열), 없으면 삽입. 숨김(`hidden_at`) 공지는 값만 갱신하고 숨김 상태는 건드리지 않는다.
2. 저장이 끝나면 `runEmbedJob()`을 반복한다: 요청 시작부터 **200초가 지나면 새 묶음(15건)을 시작하지 않는다**(5-1절 7번의 200초와 같은 상수 — 구현 시 `collect` 라우트와 같은 상수 한 곳으로 모은다).
   수집용 대기 시간(2초 간격 × 요청 수)이 서버에 없으므로 5-1절 때처럼 수집이 시간을 먹지 않는다. 대기열이 비면(`embedded_chunks === 0`) 끝낸다. 임베딩 실패는 응답을 실패로 바꾸지 않는다(로그만).
   응답 직전에 `countUnembedded()`로 `remaining_unembedded`를 채운다(실패하면 `null`, 응답은 200).
   보드 요청 타임아웃(280초)은 이 200초 + 마지막 묶음 여유보다 길다.
3. 항목이 하나도 없고 `report`도 없으면(보드 버그) 400 `INVALID_BODY`.
4. **`collect_runs` 호출 1회당 1행**(database 권고와 같음, [[anyang-database-schema]] 56 단락): `trigger_type='scheduled'`, `triggered_by=null`, `started_at`=요청 시작, `finished_at`=응답 직전.
   - `report` 없음 → `status='success'`, `collected_count`=위 합계. 항목이 전부 `rejected`/`error`여도 호출 자체는 처리됐으므로 `success`이되 `error_summary`에 `rejected=<n>, error=<n>`을 적는다.
   - `report` 있음 → `status='failed'`, `error_summary`=`<error_code>` (+ `kind`). 임베딩은 부르지 않는다.
   - 행은 **끝에 한 번 insert**한다(`running` 행을 만들지 않는다). 그래서 5-1절 4번의 `running` 기반 겹침 방지·stale 정리와 얽히지 않는다 — 받기 API는 멱등이라 겹쳐도 안전하고, 겹침 방지는 보드의 락이 맡는다. 함수가 도중에 죽으면 행이 안 남는데, 그 사실은 보드 `collector_runs`와 `pending` 잔류로 보인다.
   - `collect_runs.mode` 컬럼 추가(0022)는 필요 없다(권고: 추가하지 않음, 구분은 보드 이력). 결정은 database 문서 확인 항목 5.
5. 로그: 건수·결과 코드만. 본문·키·요청 헤더 금지.

#### C-5. `/api/jobs/embed`

`requireSchedulerOrBackfillSecret`에 `x-collector-secret`을 더한 `requireAnyJobSecret`(셋 중 하나가 맞으면 통과, 비어 있는 환경변수는 불허). 응답·동작은 기존 그대로(한 번에 15건, `{processed_notices, embedded_chunks}`).
`BACKFILL_SECRET`이 지워져 있으면 그 헤더 경로는 자동으로 닫힌다(코드 변경 없음).

### D. Vercel 직접 수집 경로 정리

database 확인(`pg_cron` 미설치, 수집 잡 등록된 적 없음 — [[anyang-board-collector-db#D. 서버 쪽(Supabase) 수집 경로 정리 — database 몫]])에 따라 **트리거는 이미 없다**. 남은 것은 코드의 입구 두 곳이다.

| 입구 | 처리 (제안) |
|---|---|
| `POST /api/jobs/collect` (quick/full/backfill) | **라우트 유지, 환경변수 `DIRECT_COLLECT_ENABLED`(새 키)가 `true`일 때만 동작**. 기본(없음)은 인증 통과 뒤 `410 { error: "DIRECT_COLLECT_DISABLED" }`. 인증은 기존 그대로 먼저 본다. 운영 환경변수를 추가·변경할 필요가 없다(없으면 꺼짐). |
| `POST /api/admin/collect-runs` (관리자 수동 수집) | 같은 스위치. 꺼져 있으면 410 `DIRECT_COLLECT_DISABLED`. `GET`(이력 조회)은 그대로 — 보드가 남긴 행을 계속 보여 준다. |
| `web/scripts/backfill.ts`, `mode=backfill`·`BACKFILL_SECRET` | 코드는 그대로 둔다(이미 "사용 안 함"). 스위치가 꺼지면 backfill 모드도 410이다. |

- 라우트를 지우지 않는 이유: 이전 가능성 원칙. 앱 전체가 UNO Q(가정용 회선)로 옮겨지면 안양시가 막지 않으므로 직접 수집이 다시 쓸 만하다 — 그때 스위치만 켠다. 삭제는 사용자 승인 대상이라 이번에는 제안하지 않는다. 대안 "그냥 둔다(스위치 없음)"는 운영에서 관리자 버튼이 항상 차단 페이지를 받아 `failed` 행을 만드는 동작이 되어, 거짓은 아니지만 무의미하다.
- **서버 수집기 보강**(스위치가 켜졌을 때를 위해, 그리고 시험 호출이 남긴 "success 0건"을 반복하지 않기 위해): `runCollectJob`이 목록·상세 응답에서 `isBlockedPage`이거나 첫 목록 페이지가 0건이면 예외로 처리해 `collect_runs`를 `failed`(`error_summary`: `ip_blocked`/`empty_list`)로 마감한다. 라우트는 500 `COLLECT_FAILED`를 돌려주고 임베딩은 부르지 않는다. 테스트는 F-1.
- 시험 호출이 남긴 `collect_runs` 1행 처리(failed로 갱신 등)는 database 문서 D가 안을 냈다. 운영 DB 쓰기라 구현 단계에서 사용자 승인 뒤 실행한다(이 문서는 실행하지 않음).
- **frontend 영향**: [[anyang-frontend-screens]] 11절의 "수동 수집 실행" 버튼이 410을 받는다. 스위치가 꺼진 운영에서 버튼을 숨기거나 비활성화하고 "공지 수집은 보드가 자동으로 합니다" 같은 안내(문구는 frontend 제안)를 보일지, 그리고 이력 표의 오류 요약 코드(`ip_blocked` 등)를 사람이 읽는 문구로 바꿀지는 frontend 설계 몫이다. backend는 410 코드만 약속한다. **frontend 설계 호출이 필요하다.**

### E. 환경변수 정리 (새 키만 추가, 기존 값 변경 없음)

| 변수 | 위치 | 상태 |
|---|---|---|
| `COLLECTOR_INGEST_SECRET` | Vercel + 보드 `collector.env` | **신규**, 사용자가 값 생성·입력(승인 대상) |
| `DIRECT_COLLECT_ENABLED` | Vercel | **신규, 선택**. 없으면 꺼짐. 운영에서 추가하지 않는다 |
| `COLLECTOR_INGEST_URL` | 보드만 | 신규(비밀 아님) |
| `COLLECTOR_CONTACT` | 보드(+ Vercel은 스위치 켤 때만) | 기존 변수. 값은 사용자가 정함. 보드에서 처음 쓴다 |
| `BACKFILL_SECRET` | Vercel | 기존. 이 설계가 바꾸지 않는다. 쓸 곳이 사라져 삭제는 사용자 선택 |

### F. 테스트·배포·롤백·장애

#### F-1. 자동 테스트 (목 기반, 실제 사이트·운영 DB 미사용)

- **받기 API 단위**(`web/test/ingest-notices.test.ts`): 인증 4분기(`COLLECTOR_INGEST_SECRET` 비어 있음 → 401 / 틀림 → 401 / 맞음 → 통과 / `x-scheduler-secret`·`x-backfill-secret`만 맞음 → 401), 요청 형식(JSON 아님·21건·필드 누락 → 400, 4MB 초과 → 413),
  항목 검증(타 도메인·`http`·추가 쿼리 URL, 제목 0자·501자, NUL, 본문 상한, 해시 불일치, 잘못된 날짜, `image_count` 범위, 첨부 URL 도메인·중복) → 해당 항목만 `rejected`·나머지는 처리,
  저장 3분기(`created`/`updated`+청크 삭제/`unchanged`+청크 불변), 한 항목 DB 오류가 다른 항목을 막지 않음(`error`), 같은 요청 재전송 멱등, 숨김 공지의 숨김 상태 유지,
  `report` 호출(`collect_runs` failed 행, 임베딩 호출 없음, 항목 없이도 200), 호출 1회당 `collect_runs` 정확히 1행, 임베딩 반복(가짜 시계로 200초 뒤 새 묶음 안 시작, 대기열이 비면 종료), `remaining_unembedded` 조회 실패 시 `null`+200, 응답·로그에 키·본문 없음.
- **`/api/jobs/embed`**: `x-collector-secret` 허용, 환경변수 비어 있으면 불허, 기존 두 시크릿 동작 불변(`web/test/backfill.test.ts` 유지).
- **직접 수집 스위치**: 꺼짐이면 `/api/jobs/collect`·`/api/admin/collect-runs` POST가 인증 뒤 410, 꺼진 상태에서 수집 함수 호출 없음, 켜짐이면 기존 동작(기존 테스트가 켜진 상태로 통과). `GET /api/admin/collect-runs`는 영향 없음.
- **차단 페이지 픽스처**: `web/test/fixtures/blocked-page.html`(합성: `meta description`에 "IP 차단 안내", `p-subject` 없음. 실제 응답 원문은 저장하지 않는다). `isBlockedPage`가 이 픽스처 true / `board-list-page1.html` false.
  서버 `runCollectJob`에 차단 응답을 먹이면 `collect_runs`가 `failed`(`ip_blocked`)이고 임베딩이 호출되지 않는다. 빈 목록 → `empty_list`.
- **파서 공유**: 기존 `collector.test.ts`의 파서 테스트를 `notice-parser` 직접 import로 돌리고, `collector.ts`가 다시 내보내는 함수가 같은 함수(`===`)인지 확인한다. 보드 수집기 테스트도 같은 모듈·같은 픽스처를 쓴다.
  번들 확인: `node scripts/build-collector.mjs`가 성공하고 산출물에 `cheerio` 파서가 들어갔는지(산출물을 `--dry-run`에 고정 HTML로 한 번 실행해 건수 출력).
- **보드 수집기**(`web/test/board-collector.test.ts`, `pg`와 `fetch` 목): 락을 못 잡으면 요청 0건 종료, `ip_blocked` → 즉시 중단·`failed`·이후 60분 쉬기, `empty_list`, 2페이지 빈 목록은 정상 종료(backfill), `parse_failed`는 해당 항목만 건너뛰고 `failed`, 응답 해석 표(A-4 5번) 전 행, 401은 항목 상태 불변, `full` 보고 호출/`quick` 연속 실패 시 첫 번째만 보고, 남은 임베딩 호출 10회 상한, 요청 간격 2초(가짜 타이머), 로그에 키·본문 없음.
  대기열 상태 전이 SQL(upsert·`is distinct from`)은 실제 PostgreSQL이 필요하다 — 로컬 개발 DB가 없으므로 database의 격리 시험(F-2, 보드의 임시 클러스터)에서 확인한다([[anyang-board-collector-db]]).

#### F-2. 구현 순서 (코드 먼저 → Vercel → 보드)

1. 코드: `notice-parser`/`notice-store` 분리(동작 불변 리팩터링, 기존 테스트 전부 통과) → 받기 API → 직접 수집 스위치·실패 기록 보강 → 보드 수집기·빌드 스크립트. 단위마다 테스트 통과 뒤 커밋([[anyang-backend-tasks]] 5-6~5-9).
2. 보드 DB 생성(database F-1, 사용자 승인) — 수집기보다 먼저.
3. Vercel 배포: 새 라우트는 `COLLECTOR_INGEST_SECRET`이 없으면 전부 401이라 **배포해도 무해**하다. 사용자가 Vercel에 `COLLECTOR_INGEST_SECRET`을 추가(새 키, 기존 값 불변)하고 재배포가 필요하면 한다.
4. 보드 설치·시험 → F-3.

#### F-3. 보드 배포·시험 절차 (구현 단계, 기존 서비스 무중단 — 모든 단계에 사용자 승인)

배포 전 스냅샷(읽기 전용)은 database F-1 1번과 같다(서비스 상태·포트·메모리). 새 유닛은 기존 유닛을 건드리지 않는다.

1. 번들 빌드 → `sha256` 기록 → `scp`로 보드 `/home/arduino/anyang-collector/`에 복사(새 폴더, 기존 폴더 비접촉). 해시를 보드에서 다시 계산해 맞는지 확인.
2. `/etc/anyang-collector/collector.env` 작성(root 0600) — 비밀값은 **사용자가 보드에서 직접 입력**한다. 에이전트는 값을 보지 않는다. 입력 뒤 키 값이 터미널 기록·셸 히스토리에 남지 않는 방법으로 안내한다(`sudoedit`).
3. 유닛 파일 설치, `systemctl daemon-reload`. **타이머는 아직 켜지 않는다.**
4. 시험 ①: `anyang-collector.mjs --dry-run` — 보드 IP에서 목록 1페이지가 차단 없이 오고 파싱 10건이 나오는지(요청 2건: robots + 목록). 차단이면 여기서 멈추고 보고(안양시가 보드 IP도 막는 경우).
5. 시험 ②: 전송 없이 수집만 `quick --no-sync` → 보드 DB `collected_notices`에 행이 생기고 `raw_html`이 있는지, `sync_status='pending'`.
6. 시험 ③(Supabase 쓰기, 별도 승인): `backfill --from 1 --to 1` → 받기 API → `synced`, Supabase `notices` 10건 안팎과 `collect_runs` 1행, 임베딩 확인. 같은 명령 재실행 → 전부 `unchanged`(중복 없음). 이때 Vercel 배포 보호가 POST를 막는지(55-e와 같은 확인)도 본다 — 막히면 `x-vercel-protection-bypass` 헤더를 `collector.env`의 선택 변수로 보내는 대안을 설계 변경으로 올린다.
7. 전체 백필(승인): `systemd-run`으로 `backfill --from 1 --to 47`(수집 약 17분 + 전송·임베딩). 끝나면 Supabase `count(*)`=462, `remaining_unembedded`=0, 보드 `pending` 0건 확인.
8. 타이머 활성화(`enable --now`) → 첫 `quick`·다음날 04:00 `full`을 `journalctl`과 두 `collect_runs`로 확인.

#### F-4. 롤백

| 단계 | 방법 | 승인 |
|---|---|---|
| 수집 멈춤 | `systemctl disable --now anyang-collector-quick.timer anyang-collector-full.timer`. 보드 DB·데이터 그대로 | 불필요(설치 승인 범위의 정지) |
| 이전 버전 복원 | `anyang-collector.mjs.prev`를 되돌려 복사 | 필요 |
| 받기 API 차단 | Vercel에서 `COLLECTOR_INGEST_SECRET` 제거 → 모든 호출 401(재배포 불필요일 수 있음, 환경변수 반영 방식에 따름). 코드 롤백은 git 되돌리기 | 사용자 환경변수 조작 |
| 설치 제거 | 유닛 파일·`collector.env`·`/home/arduino/anyang-collector/` 삭제 | **필요(삭제)** |
| Supabase에 들어간 공지 | 롤백 대상 아님(정상 데이터). 잘못 들어갔다면 별도 판단 | 별도 |
| 보드 DB 제거 | [[anyang-board-collector-db]] F-3 | **필요(삭제)** |

#### F-5. 장애 영향

| 장애 | 영향 | 복구 |
|---|---|---|
| 보드 전원·회선 꺼짐 | 새 글 반영만 늦어진다. 앱·추천·채팅·푸시는 Supabase로 정상. 관리자 화면은 마지막 `collect_runs`가 오래된 채로 보인다 | 켜지면 `Persistent` 타이머로 `full`이 놓친 글을 메운다 |
| 안양시가 보드 IP도 차단 | `ip_blocked`로 실패 기록, 60분마다 재시도. 새 글 반영 불가 | 사용자 판단(다른 회선 등) |
| Vercel 받기 API 장애·Gemini 한도 | 보드 `pending` 적체 → 백오프 재전송. 임베딩 못 한 공지는 `remaining_unembedded`로 보이고 다음 호출이 이어간다 | 자동 |
| USB 미마운트 | 유닛 `ConditionPathIsMountPoint`로 실행 안 함(조용히 건너뜀 — journald에 "condition failed"). database B-2 | 마운트 후 자동 |
| 보드 PostgreSQL 다운 | 접속 오류로 종료 코드 1 | 서버 재시작 |
| `COLLECTOR_INGEST_SECRET` 불일치 | 401 → 보드 실행 `failed('ingest_auth')`, 항목 상태 불변 | 키 맞추기 |

### 보드 DB 문서에 대한 답 (database 문서 확인이 필요한 항목 6, 미해결 5번)

| 질문 | 답 (제안) |
|---|---|
| 0건·차단 상태 보고를 받아 `failed` 행을 남기는가 | 예. `items: []` + `report`(C-2), 보고 시점은 A-4 6번(`full`은 매번, `quick`은 연속 실패의 첫 번째만) |
| 보드 `collected_at`을 보내는가 | 아니오. 서버가 받은 시각을 쓴다(C-2 이유) |
| `/api/jobs/collect`를 지우는가 | 아니오. 유지하되 `DIRECT_COLLECT_ENABLED` 스위치로 닫는다(D) |
| 호출 1회당 `collect_runs` 1행 | 예(C-4) |
| `collect_runs.mode`(0022) | 불필요(권고) |
| 보드 마이그레이션 위치 | `web/collector/db/` 제안 — database 문서 B-8 경로(`collector/db/`)를 맞춰 달라고 요청 |
| 401/400 때 `retry_count` | 소모하지 않음(A-4 5번) — database 문서 상태 전이 표 보강 요청 |

## 확인이 필요한 항목

(pm이 프로젝트 문서에 반영한다. 모든 값은 ``)

1. 파서 공유 방식(소스 한 곳 + 번들 1개 복사), `esbuild` devDependency 추가.
2. systemd timer 채택(cron 대신), 시스템 유닛, quick 분 오프셋 03분, 자원 상한(MemoryMax 300M 등), 차단 시 60분 쉬기, 전송 배치 20건·상한.
3. 새 키 `COLLECTOR_INGEST_SECRET`(이름·`BACKFILL_SECRET` 재사용 안 함) — 사용자가 값 생성·Vercel과 보드에 입력.
4. `COLLECTOR_CONTACT` 실제 값(사용자). 보드 `collector.env` 위치·권한(root 0600).
5. 직접 수집 경로: 스위치 `DIRECT_COLLECT_ENABLED`로 닫기(권장) / 그냥 두기 / 삭제(승인 필요) 중 선택.
6. frontend 설계 호출 필요: 관리자 "수동 수집" 버튼·오류 코드 표시.
7. 배포 보호가 보드의 POST를 막는지(시험 ③에서 확인) — 막히면 설계 변경.
8. 시험 호출 `collect_runs` 1행 처리(database 안 (가)/(나)/(다)) 운영 DB 쓰기 승인.

## Links

- [[anyang-backend-api]] — 5절·5-1절(파서·모드·저장 규칙 원본), 7절·9절·13-1절의 56 반영
- [[anyang-backend-tasks]] — 작업 단위 5-6~5-9
- [[anyang-board-collector-db]] — 보드 DB(대기열 상태 전이·백오프·접속), database 소유
- [[anyang-database-schema]] — Supabase `notices`·`collect_runs`
- [[anyang-deployment-portability]] — 수집 주체 변경 결정
- [[anyang-youth-policy-assistant]] — 확인 항목 56
- [[anyang-frontend-screens]] — 11절 관리자 "수동 수집" (frontend 영향)
