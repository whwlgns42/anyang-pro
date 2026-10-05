---
type: project
date: 2026-10-05
status: active
owner: pm
---

# 안양 청년정책 AI 리서치 비서 — 닫힌 항목·승인 이력

## Summary

[[anyang-youth-policy-assistant]]에서 옮긴 기록 보관용 문서다. 해결·취소로 닫힌 확인 항목(번호 그대로)과 1~33차 승인·해제 이력이 있다. 열린 항목과 현재 승인된 설계는 원 문서에 있다.

## Context

프로젝트 문서가 194KB로 커져 pm 호출마다 비용이 커서 2026-10-05에 분리했다(사용자 승인). 항목 판정은 소유자 pm, 이동은 메인 세션이 원문 그대로 했다. 다른 문서의 `[[anyang-youth-policy-assistant#확인이 필요한 항목]] 번호` 링크가 가리키는 항목이 원 문서에 없으면 여기서 같은 번호를 찾는다.

## Details

### 닫힌 확인 항목

1. 수집 대상 — 해결(2026-09-27, user): 안양시 청년 게시판 1개. [[anyang-service-scope]]
2. 프로필 항목 — 해결(2026-09-27, user): 생년·성별·직군·재학/재직 여부만. [[anyang-service-scope]]
3. 알림 시각 — 해결(2026-09-27, user): 사용자별 자유 설정 + on/off. [[anyang-service-scope]]
4. git init 승인 — 승인됨(2026-09-27, user). 초기 커밋 `0b7166d`.
5. 수익화 계획 — 해결(2026-09-27, user): 없음, Vercel Hobby 유지. [[anyang-deployment-portability]]
8. 공식 수치 4건 — 해결(2026-09-27, 메인 세션 웹 확인). 수치와 출처는 [[anyang-backend-api]]에 반영.
9. 공지 자격요건 구조화 컬럼 — 해결(2026-09-27, user): 1차 출시에서 안 함. [[anyang-service-scope]]
10. "AI가 기억하는 내 정보" 화면 — 해결(2026-09-27, user): 넣는다, 조회·수정·삭제. [[anyang-service-scope]]
11. 대화 히스토리 목록 화면 — 해결(2026-09-27, user): 넣는다. [[anyang-service-scope]]
12. 인증 부가 테이블 — 해결(2026-09-27, user): 쓰지 않는다. [[anyang-service-scope]]
14. 탈퇴 시 동의 기록 — 해결(2026-09-27, user): 증빙용으로 1년 보관 후 정리 잡으로 삭제. [[anyang-service-scope]]
15. 동의 항목 — 해결(2026-09-27, user): "수집·이용"과 "국외 이전"을 분리. [[anyang-service-scope]]
16. 비밀번호 재설정 — 해결(2026-09-27, user): 1차 출시 제외, Google 로그인으로 대체 안내, 이메일 발송 수단 불필요. [[anyang-service-scope]]
17. 알림 잡 중복 발송 방지 — `notify_logs`의 `unique(user_id, notice_id)`(database 제안). 설계 승인으로 확정. [[anyang-database-schema]]
18. 처리방침 개정 시 재동의 — 해결(2026-09-27, user): 강제한다. [[anyang-service-scope]]
19. 프로필 코드값 셋 — 해결(2026-09-27, user): 설계 제안값을 따르고 설계 승인으로 확정. 이후 사용자가 코드 식별자를 직접 확정(2026-09-27, user): 직군(업종·직무)과 재학/재직 여부 분리. 목록은 [[anyang-service-scope]]. [[anyang-database-schema]]
20. 로그 보존 — 해결(2026-09-27, user): 수집 이력·API 사용량 90일 정리 잡 등록, 알림 발송 로그는 삭제 대상에서 제외. [[anyang-service-scope]]
21. 발송 로그 `pending` 상태 — 해결(2026-09-27, user): 추가. 세부는 database·backend 설계. [[anyang-service-scope]]
22. **설계 변경 필요(2026-09-28, 구현 중 frontend 제기)**: 채팅 공지 인용 카드. [[anyang-frontend-screens]] 3절은 AI 응답 속 관련 공지를 카드(제목 + `/notices/[id]` 링크)로 보여 주는데, [[anyang-backend-api]] 3절 `POST /api/chat`에는 인용 공지 정보를 클라이언트로 보내는 계약이 없다(구현은 DeepSeek SSE를 그대로 전달). 선택지: (a) 스트림에 인용 공지 목록을 담는 계약 추가(backend-api 수정), (b) 1차 출시에서 인용 카드 제외(frontend-screens 수정). 그래서 [[anyang-backend-api]]를 "승인된 설계"에서 뺐다. 사용자 재승인 필요. 현재 구현은 인용 카드 없이 텍스트만 표시.
23. **설계 변경 필요(2026-09-28, 구현 중 frontend 제기)**: 관리자 공지 숨김 대상 선택. [[anyang-frontend-screens]] 관리자 공지 수집 관리는 공지 목록 탭에서 숨김/해제하는데, [[anyang-backend-api]] 13-1절에는 `PATCH /api/admin/notices/:id/hide|unhide`만 있고 관리자용 공지 목록 조회 API가 없다. 선택지: (a) `GET /api/admin/notices`(숨김 포함, 페이지네이션) 추가, (b) 숨김을 공지 상세 등 다른 경로에서 수행. 사용자 재승인 필요(22와 함께). 현재 구현은 실행 이력·수동 수집만 있고 숨김 UI 없음.
    - 22 해결(2026-09-28, user): (a) 넣는다 — 채팅 스트림으로 인용 공지 목록(id·제목·원문 URL·게시일)을 보내는 계약을 [[anyang-backend-api]] 3절에 추가. 계약 세부는 backend 제안(미확정), 설계 재승인으로 확정.
    - 23 해결(2026-09-28, user): (a) `GET /api/admin/notices`(숨김 포함, 페이지네이션) + 관리자 공지 목록 화면에서 숨김/해제. 세부는 설계 재승인으로 확정.
25. frontend UI 개발에 taste-skill(`design-taste-frontend`) 사용 — 해결(2026-09-28, user). 적용 범위는 랜딩·첫 화면·시각 톤, 관리자 표 화면은 가독성·일관성만.
26. **사용자 결정 필요(2026-09-28, code-review 지적)**: 재승인 뒤 backend가 [[anyang-backend-api]]의 `(미확정)`을 기계적으로 지우면서 문장 1곳이 비문이 되고(940행 "제안값이며이다"), 원래 줄바꿈에 걸려 있던 위키링크 앵커 몇 곳(409·500·541행 등)에 공백만 남았다. 의미·계약 변경은 없다. 고치려면 승인된 설계 내용 수정이라 설계 잠금 대상이다. 선택지: (a) 그대로 둔다, (b) 문구·앵커만 고치는 수정을 허용(문서를 승인된 설계에서 잠시 빼고 수정 후 재승인). 권장 (b), 확인 항목의 "(미확정) 표기 잔존 → 훅을 좁게 수정" 결정과 함께 처리. [[anyang-backend-api-mihwakjeong-removal-corruption]]
27. **보류(2026-09-28, user)**: 추천·알림이 프로필을 쓰지 않는다([[anyang-backend-api]] 7절 알림 매칭은 선호 벡터 유사도만). 그래서 채팅 전 사용자는 추천 피드가 최신순뿐이고 알림은 0건이다 — 원 요청("프로필·대화 이력에 맞는 것만")과 어긋난다(메인 세션 최종 검토 지적). 해결 제안: 프로필 조건 × 공지 해당 여부를 Jev Noul로 판정(설계 변경). 사용자 지시로 보류, 구현하지 않는다.
    - 보류 해제(2026-09-28, user): 설계 단계로 진행 — 확인 항목 33.
    - **취소(2026-09-28, user)**: 33과 함께 하지 않는다. 선호 없는 사용자는 기존대로 추천 최신순·알림 없음.
28. **설계 변경 필요(2026-09-28, 최종 검토 수정 중 backend 분류)**: 채팅 DeepSeek 프롬프트에 출생연도 원값이 간다. [[anyang-backend-api]] 3절 확정 원칙은 "나이대"인데 나이대 구간 정의가 설계·코드에 없다(관리자 통계의 10년 단위 예시는 "구간 폭 미확정"). 구간(예: 5년/10년) 결정 필요. 현재 원값 전송 유지.
29. **설계 변경 필요(2026-09-28, 동일)**: 비밀번호 최소 길이, 로그인·가입 시도 횟수 제한 값이 설계에 없다. 값 결정 필요. 현재 미적용.
30. **설계 확인(2026-09-28, 동일, 차단 아님)**: 한 사용자가 기기 여러 대를 등록했을 때 일부 기기만 푸시 성공하면 `notify_logs`를 success/failed 중 무엇으로 볼지 설계 7절에 없다. 현재 "모든 기기 성공해야 success" 유지(410/404 만료 구독은 삭제하고 실패로 세지 않음).
31. **문서 보완 필요(2026-09-28, 차단 아님)**: [[anyang-backend-api]]에 없는 구현 사실 2건 — Web Push payload 스키마 `{title, notice_id}`(8절, sw.js는 `/notices/[id]`로 이동), 환경변수 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`(9절 표). 승인된 설계라 잠겨 있어 26번과 함께 문서 수정 허용 여부 결정 필요.
    - 26·31 해결(2026-09-28, user): 고친다 — backend-api 비문·앵커 공백 복구(의미 변경 없음), push payload `{title, notice_id}` 명시, 환경변수 표에 `NEXT_PUBLIC_VAPID_PUBLIC_KEY` 추가. 설계 잠금 훅은 괄호 안 "미확정" 삭제를 허용하도록 바뀜(bdacfa0) — 승인된 값의 괄호 안 표기도 정리.
    - 28 해결(2026-09-28, user): 나이대 = 19세 미만 / 19~24 / 25~29 / 30~34 / 35~39 / 40세 이상(만 나이, Asia/Seoul 기준 현재 연도 − birth_year). DeepSeek에는 구간 문자열만. 경계 처리는 backend 제안. [[anyang-ai-models-data-transfer]]
    - 29 해결(2026-09-28, user): 비밀번호 최소 8자. 로그인 실패는 같은 이메일 또는 같은 IP 기준 15분에 5회 초과 시 일시 차단, 가입은 같은 IP 15분에 5회 초과 시 일시 차단. 외부 서비스 없이 DB 기록(database가 테이블·정리 방식 설계, 새 마이그레이션). 응답 코드·메시지는 backend 제안.
    - 30 해결(2026-09-28, user): 기기 중 한 대라도 성공하면 success, 실패 기기 수를 함께 기록(컬럼 여부는 database 제안).
    - 27은 보류 유지(user).
    - 26·28~31 반영·구현 완료(2026-09-28): 62b2e62, a953dbc, 859df5c. code-review 통과.
33. 27 후속 — 프로필 기반 Jev 매칭 설계(2026-09-28, user 결정): 프로필 조건 × 공지 대상 여부를 Jev(Noul)로 판정. 관리자 화면 토글로 켜고 끔(기본 OFF). 적용 대상은 선호(기억)가 없는 사용자만, 선호가 있는 사용자는 기존 벡터 유사도. 장애·키 없음이면 OFF와 같은 동작. 설계 draft 후 사용자 승인, 구현은 승인 뒤. 전송 범위는 [[anyang-ai-models-data-transfer]].
    - 설계 draft 완료(2026-09-28): [[anyang-database-schema]] app_settings·notice_profile_matches, [[anyang-backend-api]] 6-1·13-0-1절, [[anyang-frontend-screens]] 10-1절, tasks 두 문서. 재승인 대기.
    - **취소(2026-09-28, user)**: 하지 않는다. 처리방침 반영도 불필요.
34. **사용자 확인 필요(2026-09-28, 마이그레이션 적용 후 database 제기)**: Supabase MCP가 연결된 프로젝트의 이름·ref가 MCP 응답에 나오지 않아, 19개 마이그레이션이 적용된 곳이 개발용 프로젝트인지 운영용인지 확인하지 못했다([[anyang-deployment-portability]]는 개발/운영 분리). 사용자가 Supabase 대시보드에서 확인 필요.
37. **사용자 확인 필요(2026-09-28, 0019 적용 전 점검에서 database 제기)**: 운영 앱의 `DATABASE_URL`(Vercel 환경변수 등) 접속 롤이 public 테이블 소유자 `postgres`와 같은지. 로컬 `web/.env.local`에는 `DATABASE_URL`이 없어(키: `AUTH_SECRET`, `AUTH_URL`뿐) 확인할 수 없었다. Supabase pooler 연결 문자열이면 사용자명이 `postgres.<ref>` 형식이고 롤은 `postgres`다(비밀번호는 알려주지 않아도 된다 — 사용자명 부분만 확인). 다른 롤(예: 별도 앱 전용 롤)이면 정책 없는 RLS가 앱 쿼리를 막아 운영 장애가 되므로 설계 재검토. 확인되면 database 구현 재호출로 단일 트랜잭션 적용 → 점검·검증 → 커밋 → code-review. 아직 앱을 운영에 배포하지 않아 `DATABASE_URL`을 정하지 않은 상태라면 그 사실도 알려 주면 된다(그때는 "소유자 롤 `postgres`로 접속"을 배포 조건으로 두고 적용할지 결정).
    - 37 해결(2026-09-28, user): 접속 롤 = postgres(Direct connection), 사용자 확인. 테이블 소유자와 같다. 접속 문자열·비밀번호·project ref는 어디에도 남기지 않는다. database 구현 재호출로 0019 운영 적용 진행.

39. **사용자 결정 필요(2026-09-28, Vercel 배포)**: 프로젝트에 Vercel Authentication(ssoProtection `all_except_custom_domains`)이 켜져 있어 `*.vercel.app` 운영 주소도 Vercel 로그인 사용자만 열 수 있다. 일반 사용자와 pg_cron 수집·알림 트리거가 막힌다. 운영만 해제(미리보기는 보호 유지)할지 결정.
    - 정정(2026-09-28, 메인 세션 실측): 로그인 없이 `curl`로 확인한 결과 운영 도메인 `anyang-youth-policy-assistant.vercel.app`은 SSO로 넘어가지 않고 앱이 직접 응답(현재는 첫 배포라 404), 미리보기·배포별 주소만 `vercel.com/sso-api`로 302. 즉 운영은 이미 공개 상태라 해제할 것 없음. `--prod` 배포 후 로그인 없이 200인지 다시 확인한다.
    - 갱신(2026-10-04, 메인 세션 조사): 현재 운영 주소 `https://web-beta-smoky-16.vercel.app/api/jobs/collect`에 GET하면 Vercel 로그인 페이지가 아니라 앱의 405(POST 전용 라우트)가 온다. 운영 주소는 보호에 막히지 않는 것으로 보인다. 최종 확인은 pg_cron·pg_net 설치 후 실제 POST 1회(55-e). 막히면 `x-vercel-protection-bypass` 헤더를 붙인다.
41. **사용자 결정 필요(2026-09-28, 새 요청 — /consent에서 국외 이전 고지·DeepSeek 문구 제거)**: pm이 분배 전에 멈춤. 설계·코드 변경 없음, "승인된 설계" 기록도 그대로 둠. 확인할 것:
    - (a) **기존 사용자 결정과 충돌**: 15번(user, "수집·이용"과 "국외 이전" 분리 동의)과 [[anyang-service-scope]] "개인정보 동의" 행(DeepSeek·Gemini 국외 이전 고지), [[anyang-ai-models-data-transfer]] "동의 화면의 국외 이전 고지에 Gemini 전송 포함"을 뒤집는 결정인지. 뒤집는다면 결정 문서 2건을 고친다(pm 소유).
    - (b) **법적 근거**: 실제 전송(채팅 → DeepSeek 국외 서버, 임베딩 → Gemini 국외)은 그대로다. 개인정보 보호법 제28조의8은 국외 이전 시 별도 동의 또는 (계약 이행에 필요한 처리위탁·보관이면) 처리방침 공개·고지 같은 요건을 둔다. 어느 요건으로 갈지는 법적 판단이라 pm·에이전트가 정할 수 없다. 동의 화면에서 빼도 되는 근거(예: 처리방침 공개로 대체)를 사용자가 확인해야 한다.
    - (c) **범위 모순**: 요청은 "폼 필드·검증·API 호출은 바꾸지 않는다"인데, 국외 이전 고지는 필수 체크박스 `overseas_transfer`의 라벨 자체다(`web/app/consent/consent-form.tsx`, 백엔드 `CONSENT_TYPES` 필수 2종). 선택지: ① 체크박스·API는 두고 라벨만 DeepSeek·국가명 없는 문구로 바꾼다(대체 문구 필요), ② 국외 이전 체크박스를 없앤다(폼·검증·API·DB 동의 기록 변경 → database·backend·frontend 설계 변경), ③ 그대로 둔다.
    - (d) **처리방침 페이지**: `/privacy-policy`와 [[anyang-frontend-screens]] 처리방침 절에도 DeepSeek·국외 이전 고지가 있다. 요청 범위(동의 화면만)에 포함하는지. 법적 근거를 (b)의 처리방침 공개로 잡으면 처리방침에서는 빼면 안 된다.
    - (e) **재동의**: 18번(처리방침 개정 시 재동의 강제)과 `POLICY_VERSION`. 문구를 바꾸면 버전을 올려 기존 사용자에게 재동의를 받는지, 요청대로 기존 동의 기록을 유지하고 신규 가입자에게만 적용하는지(버전 유지).
    - 답을 받으면 해당 설계 문서를 "승인된 설계"에서 빼고 설계(필요한 에이전트만, database → backend → frontend) → 사용자 재승인 → 구현 → code-review 순으로 진행한다. 설계와 구현을 한 호출에 묶는 것은 승인 게이트(Kickoff 3) 때문에 하지 않는다.
    - 답(2026-09-28, user, 메인 세션 전달): (a) 뒤집는다 — 화면 표현만 단순화. (c) ① 체크박스 `overseas_transfer`·API 필수 검증 유지, 라벨·설명에서 국가명(중국·국외·미국)·서비스명(DeepSeek·Gemini)·상세 고지 제거, "AI가 대화 내용을 처리합니다" 수준 문구. (d) `/privacy-policy`도 같은 방식. (e) 기존 동의 기록 유지, 신규 가입자에게만 새 화면(재동의 없음 → `POLICY_VERSION` 유지로 해석, 18번의 예외). 실제 전송(DeepSeek·Gemini 모두 국외)은 변하지 않음을 사용자가 인지.
    - **(b) 법적 근거는 답이 없다**: 동의 화면과 처리방침 모두에서 빼면 국외 이전 사실이 사용자에게 어디에도 고지되지 않는다. 또 `overseas_transfer` 동의 기록이 "국외 이전 동의"로 남지만 사용자는 그 사실을 안내받지 않고 체크하게 된다. 재승인 때 이 위험을 감수하는지(또는 법률 검토 후 진행하는지) 사용자 확인 필요.
    - 41-b 해결(2026-09-28, user, 메인 세션 전달): 법적 위험을 감수하고 진행한다. 설계 2종 재승인, 구현 진행.
    - 41 구현·검수 완료(2026-09-28): 9f65aeb, code-review 통과(치명 없음). build 확인만 남음(42-a).
45. **사용자 결정 필요(2026-09-29, backend·git-manager 보고)**: 원격 대비 로컬 커밋이 5개를 넘었다(236d410 시점 6개, 이번 문서 커밋으로 더 늘어남). push 여부 확인 필요. 승인 전 push 금지.
    - 보류(2026-10-03, user, 메인 세션 전달): "나중에" — 지금 push하지 않는다(7030300 시점 로컬 5커밋 앞섬).
50. **사용자·메인 세션 조치 필요(2026-10-03, 48 구현)**: database 서브에이전트 세션에서 Supabase MCP 도구가 보이지 않는다(에이전트 정의에는 5개가 있음). 선택지: (a) 메인 세션에서 MCP 연결을 확인한 뒤 pm 재호출 → database가 0020 적용·검증·커밋 → backend 구현 → code-review, (b) 메인 세션이 MCP로 0020 up(`web/db/migrations/0020_user_preferences_previous_fact.up.sql`)을 단일 트랜잭션으로 적용하고 `schema_migrations`에 기록·점검 SQL 2개 실행 후 pm 재호출(database는 검증·커밋만). 미커밋 파일: `web/db/migrations/0020_user_preferences_previous_fact.up.sql`·`.down.sql`, `AI-Sessions/wiki/design/anyang-database-schema.md`(status·표시만). 0020 down은 운영에서 실행하지 않는다.
    - 해결(2026-10-03): 선택지 (a)로 진행. MCP 재연결 후 database가 적용·검증·커밋(226e4f6). 48 항목 참고.
49. **설계 조사(2026-10-03, 사용자 요청 — 팀원 디자인 소스 cheongan 적용 가능성)**: 위치 `C:\Users\whwlg\Downloads\cheongan\`(design-system: Tailwind v4 + W3C 토큰, react-prototype: React 19 + Vite 해시라우터). `web/`은 Next.js 16 + React 19 + 순수 CSS. frontend가 재검증하고 Tailwind v4 도입 영향, `globals.css`와의 충돌·공존, 화면 매핑표를 새 설계 문서 draft로 정리한다. **코드·설치·파일 복사 금지, 조사·문서만**(47 frontend 구현 보류 유지). 47(b)·(c) 처리 시점 판단의 근거로 쓴다.
    - 조사 draft 완료(2026-10-03, frontend): [[anyang-cheongan-design-adoption]]. 코드·설치 변경 없음. 기술적으로 적용 가능(React 19 동일, Next 16.3.6, Tailwind v4는 `@tailwindcss/postcss` 필요 — 프로토타입의 `@tailwindcss/vite`는 못 씀). 충돌 있음(설치된 tailwindcss 4.3.3 코드와 캐스케이드 규칙으로 추론, 브라우저 미확인): 레이어 밖 `globals.css`의 전역 `button`·`h1`·`a`·`fieldset` 규칙이 Tailwind 유틸리티를 이김, `--border-strong` 이름 같고 의미 다름(색 vs 2px), 색 체계 이중화. 공존안 A 전면 교체/B 점진/C preflight 끄기/D globals.css를 `@layer components`로 이동 — 제안 D 후 B(미확정). 화면: 대화 `/chat`·공지 목록 `/notices` 기존 API로 충분, 공지 상세는 `image_count` 없음(backend·database 설계 변경 필요), 알림은 구독 조회 GET 없음(backend 설계 변경 필요), 내 정보는 하단 탭 3→4개(frontend-screens 설계 변경 필요). 47(b)는 "내 정보" 탭으로 해결, 47(c) ①②③은 함께 처리 가능, ④⑤는 독립.
    - 미확정·질문: (a) 공존안, (b) 본문 글꼴·로딩 방식, (c) 탭 4개, (d) 안양 비서에만 있는 화면(로그인·동의·온보딩·정지·처리방침·관리자 4종)에 디자인을 어디까지 입힐지, (e) `image_count`·구독 조회 GET 추가 여부, (f) 되돌리기 Toast 구현 방식, (g) 토큰 폴더 위치, 내 정보 고정 문구 파일 위치, (h) 받은 폴더에 없는 자료: `Icon.tsx`·`tokens.json`·`build-tokens.mjs` 확인 못 함, 「청안 화면 기능 정의서 v0」 못 찾음 — 팀원에게 받을지. (i) 적용을 진행한다면 frontend-screens·frontend-tasks를 승인된 설계에서 빼고 backend(필요 시 database) → frontend 설계부터 한다.
    - **보류(2026-10-03, user, 메인 세션 전달)**: 팀원에게 실제 소스코드를 받을 때까지 진행하지 않는다. Tailwind 설치·API 추가·화면 이전 등 설계 변경 모두 보류. [[anyang-cheongan-design-adoption]] draft는 그대로 둔다. 위 미확정 (a)~(i)도 그때까지 보류.
    - 역링크 미완: [[anyang-frontend-screens]]·[[anyang-frontend-tasks]](승인 잠금, frontend 소유)·[[anyang-backend-api]](backend 소유)에서 새 문서로 가는 링크 없음(lint WARN). 다음 해당 문서 설계 수정 때 넣는다.
    - 보류 해제(2026-10-03, 메인 세션 전달 새 요청): 적용 진행. 같은 폴더에 이번에는 `Icon.tsx`(직접 그린 선 아이콘 15개, 외부 라이브러리 import 없음)·`tokens.json`·`build-tokens.mjs`·`samples/anyang-youth-notices.json`이 있다(pm 확인). 「청안 화면 기능 정의서 v0」는 여전히 폴더에 없다(README가 `../docs/`와 claude.ai 링크를 가리키지만 `docs/` 폴더 없음). 진행 전 질문은 52.

52. **사용자 결정 필요(2026-10-03, 새 요청 — 청안 디자인 웹·앱 적용)**: pm이 분배 전에 멈춤. 설계 호출·설계 문서 변경 없음, "승인된 설계" 그대로.
    - (a) **모바일 앱 범위(차단)**: 요청은 "앱: React Native Expo(준비 단계)"에도 적용하라고 하지만, 저장소에 Expo·React Native 프로젝트가 없고(`package.json` 검색 0건) wiki에도 모바일 앱 결정이 없다. 확정 스택은 "Next.js 풀스택 PWA 웹앱"([[anyang-stack-database]]). 선택지: ① 이번에는 웹(PWA)만 — 청안 프로토타입 자체가 390폭 모바일 웹 시안이라 PWA로 휴대폰 화면을 그대로 낼 수 있다(권장), ② Expo 앱을 새로 만든다 — 스택 결정 변경(결정 문서 갱신), 앱 폴더 위치, 인증(Auth.js 세션 쿠키를 앱에서 쓸 수 없어 토큰 방식 API 필요 → backend 설계 변경), 푸시(Web Push 대신 Expo 푸시 → backend·database 설계 변경), 스토어 배포 계정 결정이 따라온다, ③ 웹 먼저, 앱은 별도 요청으로.
    - (b) **"직접 복사 금지"의 범위**: 청안 README의 이행 방법은 컴포넌트 복사다. 토큰 생성물(`tokens.css`·`tailwind.css`·`tokens.ts`)과 원본 `tokens.json`·`build-tokens.mjs`는 그대로 가져와도 되는지(토큰은 값의 원본이라 다시 쓰면 어긋남), 컴포넌트만 새로 작성하는지.
    - (c) 49의 미확정 (a)~(g) — 설계 방향을 정하는 값이라 답이 필요하다. 권장안을 함께 적는다(전부 제안):
      - 공존안: D(`globals.css`를 `@layer components`로) 후 B(화면 단위 점진 이행)
      - 글꼴: 토큰대로 Hahmlet·IBM Plex Sans KR·IBM Plex Mono, `next/font/google` 로딩(본문을 Pretendard로 할지는 팀원 정의서의 미확정 항목 5번)
      - 하단 탭: 청안대로 4개(공지·대화·알림·내 정보). 47(b) 기억 화면 진입 경로가 함께 해결된다
      - 청안 시안이 없는 화면(로그인·동의·온보딩·정지·처리방침·대화 기록·관리자 4종): 토큰·공통 컴포넌트만 입힘, 관리자는 25번처럼 가독성·일관성만
      - 공지 상세 이미지 배지(`image_count`)·알림 "받는 기기" 목록(구독 조회 GET): 이번엔 해당 UI를 빼고 기존 API만 쓴다(backend·database 설계 변경 없음 → 요청의 "기존 API 유지"와 맞음). 넣는다면 backend(필요 시 database) 설계부터
      - 관심사 삭제 되돌리기: 클라이언트에서 삭제 요청을 5초 늦춤(API 변경 없음)
      - 토큰 위치: `web/` 안(외부 폴더 import는 Turbopack 동작 확인 못 함)
    - (d) **함께 처리할지**: 47(c) frontend 버그 ①~③(어차피 다시 쓰는 파일), ④ manifest 아이콘, ⑤ 가입 폼 가림 안내, 48(f-8) 처리방침·기억 화면 문구 정합성. 권장: ①~③과 (f-8)은 포함, ④⑤는 별도.
    - (e) 「청안 화면 기능 정의서 v0」(화면별 데이터 필드) — 팀원에게 받아 `AI-Sessions/raw/`에 둘지, 없이 프로토타입 코드만 근거로 할지.
    - (f) 참고(요청 문구와 규칙 차이): 설계 문서 위치는 요청의 `wiki/projects/`가 아니라 규칙대로 `wiki/design/`·`wiki/dev-tasks/`를 쓴다. 커밋은 기능 단위로 git-manager가 하고 push는 45·51(c)대로 사용자 승인 전 보류.
    - 답을 받으면: [[anyang-frontend-screens]]·[[anyang-frontend-tasks]]를 승인된 설계에서 빼고(14차), (c)에서 API 추가를 고르면 backend 문서도 뺀다. 설계는 필요한 에이전트만 database → backend → frontend 순으로 한 번에 하나씩, [[anyang-cheongan-design-adoption]]을 갱신하거나 frontend-screens에 반영 → 사용자 재승인 → 구현(taste-skill `design-taste-frontend`) → code-review.
    - **결정(2026-10-03, 메인 세션 전달)**: (a) ① 웹(PWA)만, Expo 별도 앱 없음. (b) 청안 `tokens.json`·`tokens.css`·`tailwind.css`를 그대로 가져와 쓴다(컴포넌트는 새로 작성). 추가 요청: 390폭 시안 기반 반응형 — 모바일(390)·태블릿(768)·데스크톱(1200), 데스크톱은 사이드바.
    - 답 없음: (c) 49 미확정값, (d) 함께 처리 범위, (e) 기능 정의서. pm 판단: (c)는 위 권장안을 frontend draft에 `(미확정)` 제안으로 넣어 설계 승인 때 확정받는다. API 추가 없는 안이라 backend·database 설계 호출 없음. (d)는 이번 draft 범위에서 뺀다(답 오면 추가). (e)는 프로토타입 코드만 근거로 한다.
    - 요청 문구와 다르게 처리한 것: 요청은 새 문서 frontend-design·frontend-screens·frontend-components를 만들라고 했지만, 중복 금지 규칙으로 기존 [[anyang-frontend-screens]]·[[anyang-frontend-tasks]]·[[anyang-cheongan-design-adoption]]을 갱신한다. 요청의 "Next.js 13"은 실제 16이다.
    - 진행: frontend-screens·frontend-tasks를 승인된 설계에서 뺐다(14차). frontend 설계 draft → 사용자 재승인 → 구현.
    - **설계 draft 완료(2026-10-03, frontend)**: [[anyang-cheongan-design-adoption]](토큰 `web/design-system/`에 그대로 복사, `globals.css` `@layer components`, 옛 의미 토큰을 청안 토큰으로 재지정, `@tailwindcss/postcss`, 글꼴, 브레이크포인트, 공통 컴포넌트·`AppShell`·사이드바), [[anyang-frontend-screens]](청안 적용 화면 스펙 절, 탭 4개, 내 정보 `/settings` 신규, 시안 없는 화면 처리표), [[anyang-frontend-tasks]](작업 C1~C10, 테스트 방법 390/768/1200 확인). 설계 변경 필요 없음(기존 API만). backend·database 호출 없음.
    - **재승인 때 확인할 것(전부 제안, `(미확정)`)**: 위 (c) 권장안 전부 + 탭 순서, `/settings/memory` → `/settings` 리다이렉트, 옛 토큰 재지정표(시안 없는 화면 모습이 바뀜), `viewportFit`·`themeColor`, 데스크톱 1200·태블릿 레이아웃·사이드바 구성·최대 폭 720px(관리자 1040px), 5초 지연 삭제(화면 이탈 시 즉시 전송), 계정 탈퇴 `<dialog>`, 프로필 수정 버튼·공지 상세 출처 줄 제외, 404·알림 규칙 문구, 알림 안내 상자 "청안" 표기, 채팅 조건 줄 항목.
    - frontend 미해결 질문:
      - (g) 탭 순서: 52(c) 권장안은 공지·대화·알림·내 정보, 청안 `TabBar.tsx`는 대화·공지·알림·내 정보. draft는 프로토타입 순서.
      - (h) 시안 문구 "이름과 이메일은 보내지 않아요"는 43(이름 기억·전송 허용)과 어긋나 뺐다.
      - (i) 채팅 조건 줄: 시안은 나이대·재학재직 2개, 실제 AI에는 나이대·성별·직군·재학재직 4개가 간다. 몇 개를 보일지.
      - (j) 47(c)① 채팅 스트림 실패 표시: `chat-client.tsx`를 다시 쓰면서 고치지 않고 둘지(draft는 error prop만 두고 연결 안 함). 위 (d) 답과 함께 정한다.
      - (k) 구현 때 확인할 것: `tokens.css` `layer(base)` import, `next/font` 한국어 서브셋, 브라우저 레이어 우선순위.
      - (l) 삭제 승인: C10에서 옛 클래스와 `app/_components/bottom-nav.tsx` 삭제.
    - 역링크 필요: [[anyang-backend-api]] ← [[anyang-cheongan-design-adoption]] (backend 소유, 다음 backend 설계 수정 때).
    - **승인(2026-10-03, user, 메인 세션 전달)**: draft 전부 승인. (g) 청안 시안 순서(대화·공지·알림·내 정보), (h) 문구 제거, (i) 2개 필드(나이대·학/직), (j) 47(c)①은 범위 밖(나머지 47(c) 버그와 함께 나중에), (l) C10 삭제 승인. (d)·(e)는 범위 밖·프로토타입 근거로 그대로. 승인된 설계 15차 기록 → 구현(frontend) → code-review.
    - **구현 완료(2026-10-03)**: frontend C1~C3 `1fe7d2e`(토큰 `web/design-system/` 복사, `@tailwindcss/postcss`, `globals.css` 이행, 글꼴·viewport·manifest), C4~C9 `19b1a7b`(`(tabs)/layout.tsx`·`app-nav`·`ui/` 5개·lib 5개, 화면 전부, 내 정보 `/settings` 신규, 테스트 5파일), C10 `28862dd`(`bottom-nav.tsx`·옛 클래스 삭제). npm test 240개·build 통과. 설계 3종 active, `(미확정)` 54개 제거. 화면 확인은 `DATABASE_URL`이 없어 API 목 화면 + 헤드리스 Chrome으로만(실제 로그인·DB 흐름, 탭 강조·상세 탭 바 숨김 화면 확인, 푸시·iOS 안내, 포커스 윤곽, 관리자 1040 폭은 못 봄). 설계 밖 보정(승인 범위 안): `:where(.page, .auth-shell)` 프리플라이트 복원, 관리자 `max-w-admin`, 표 가로 스크롤, `.field min-width:0`. 스킬 `design-taste-frontend`(아이콘 직접 그린 SVG는 승인 설계 우선).
    - code-review: 치명·주요 없음, 재위임 없음. 설계-코드 일치, API·인증·41 문구 회귀 없음, 지연 삭제 데이터 손실 경로 없음, C10 삭제 클래스 미사용 확인.

### 승인 이력

2026-09-28(4차): 33 취소(user)로 33 내용을 제거하고 5종을 다시 기록한다. 남은 변경은 확인 항목 32 승인값 반영과 괄호 안 (미확정) 표기 정리뿐이다. 문서 안의 값은 모두 확정이며, 정리 잡 pg_cron 등록만 사용자 결정 대기다.

2026-09-28(5차): `anyang-database-schema`를 뺀다 — 사유: 확인 항목 35(공개 API 차단) 반영을 위한 설계 수정. 재승인 뒤 다시 기록한다.

2026-09-28(6차): 사용자 재승인으로 `anyang-database-schema`를 다시 기록한다(35 반영본, 커밋 1e59171). 점검 SQL 문구와 `migrate.sh up` 실패 출력 형식은 문서에 적힌 값 그대로 이번 승인으로 확정. 확인 항목 36은 보류 유지.

2026-09-28(7차): `anyang-frontend-screens`와 `anyang-frontend-tasks`를 뺀다 — 사유: 확인 항목 41(동의 화면·처리방침의 국외 이전·서비스명 문구를 "AI 처리" 표현으로 단순화, 새 요청). 두 문서 7·9절과 작업 문서에 해당 문구가 확정값으로 적혀 있다. 재승인 뒤 다시 기록한다.

2026-09-28(8차): 사용자 재승인(메인 세션 전달)으로 `anyang-frontend-screens`·`anyang-frontend-tasks`를 다시 기록한다(draft 커밋 ddb7192). frontend-screens 확인 항목 2의 제안 문구(legend·라벨·가림 안내 유지·처리방침 문구) 전부 확정. 사용자가 41-b 법적 위험을 감수하고 진행.

2026-09-29(9차): 설계 문서 5종을 모두 뺀다 — 사유: 확인 항목 43(채팅 기억 주입·매 답변 추출·이름 기억, 새 요청). 설계 수정 후 재승인 뒤 다시 기록한다.

2026-09-29(10차): 확인 항목 43 사용자 재승인(설계 draft 커밋 893918a). 3종을 먼저 다시 기록한다. `anyang-backend-api`와 `anyang-backend-tasks`는 43-b(부분 답변 저장) 단락을 backend가 추가한 뒤 같은 승인으로 기록한다.

2026-09-29(10차 이어서): backend가 43-b 부분 답변 저장을 backend-api 3-3-2절·테스트 방법과 backend-tasks 6번에 반영했다. 같은 승인(43 재승인)으로 두 문서를 기록했다.

2026-10-03(11차): `anyang-backend-api`와 `anyang-backend-tasks`를 뺀다 — 사유: 확인 항목 46(Jev 게이트 도입, 새 요청). 재승인 뒤 다시 기록한다.

2026-10-03(12차): `anyang-database-schema`를 뺀다 — 사유: 확인 항목 48(모순 선호 대체, 새 요청). 재승인 뒤 다시 기록한다.

2026-10-03(13차): 확인 항목 48 최종 결정(user, 메인 세션 전달 — 안 2a `previous_fact`, 나머지 제안값 전부 채택)을 database → backend가 draft에 반영한 뒤 3종을 기록한다. 승인 범위는 48이다. backend 두 문서 안의 46(Jev 게이트) 3-3-3절·6-1은 보류 상태로 승인 범위 밖이며 그 `(미확정)`은 확정이 아니다(46 재개 때 문서를 다시 빼고 재승인). (f-8) 문구 정합성은 보류. 결정 밖 세부(사용자 PUT 시 `previous_fact` 그대로, 운영자 swap 시 `updated_at` 그대로·임베딩 재계산 스크립트 범위 밖)는 문서에 적힌 제안 그대로 "제안값 전부 채택" 결정으로 본다.

2026-10-03(14차): `anyang-frontend-screens`와 `anyang-frontend-tasks`를 뺀다 — 사유: 확인 항목 52(청안 디자인 웹 적용, 새 요청). 재승인 뒤 다시 기록한다.

2026-10-03(15차): 확인 항목 52 사용자 승인(메인 세션 전달, draft 커밋 0e06c78). 세 문서에 적힌 제안값 전부 확정(탭 순서는 청안 시안대로 대화·공지·알림·내 정보, 사이드바 240px, 테마색 `#F5F3ED`, 채팅 조건 줄 2개 필드, C10 삭제 승인 포함). 47(c)①은 범위 밖.

2026-10-04(16차): `anyang-database-schema`·`anyang-backend-api`·`anyang-backend-tasks`·`anyang-cheongan-design-adoption`·`anyang-frontend-screens`·`anyang-frontend-tasks` 6종을 뺀다 — 사유: 확인 항목 55(공지 전체 수집·즉시 갱신·공지 화면 시안 반영, 새 요청). 재승인 뒤 다시 기록한다. 현재 승인된 설계 문서 없음.

2026-10-04(17차): 확인 항목 55 사용자 결정·승인(메인 세션 전달 — (j) `source_url`만·unique 해제, (k)·(d) 최근 공지만 고정 위로, (c)·(p) image_count 합산, 나머지 제안값 전부, "제안대로 승인")을 database → backend → frontend가 반영한 뒤 6종을 기록한다. 55-b(고정 공지 마크업)·이모지·아이콘 img 제외 규칙은 구현 첫 단계에서 실제 HTML로 정하는 것으로 승인됐다. 55-i(첨부 직접 링크)와 (r)(배지 문구)는 승인 범위 밖 미결이다.

2026-10-04(18차): `anyang-backend-api`를 뺀다 — 사유: 확인 항목 55(s) code-review "설계 변경 필요"(image_count에서 `div.p-photo` img 제외 규칙이 설계에 없음). 사용자 확인 후 재기록한다. 같은 날 18차로 `anyang-frontend-screens`·`anyang-frontend-tasks`·`anyang-cheongan-design-adoption`도 뺀다 — 사유: 55(r) 배지 문구 "본문 이미지" → "이미지"(user 결정). 반영 후 19차로 재기록한다.

2026-10-04(19차): 55(s)·(r) 사용자 결정(메인 세션 전달)을 backend(5-1절 p-photo·smiley 제외 규칙, 실측 셀렉터)와 frontend(칩 문구 "이미지", `0c66ed0`)가 반영한 뒤 4종을 다시 기록한다. 55-b(고정 공지 실측)·55-i(첨부 직접 링크)는 미확인 그대로다.


2026-10-04(19차 이어서): `anyang-backend-api`·`anyang-backend-tasks`를 뺀다 — 사유: 확인 항목 55 백필 방식 변경(서버 분할 실행, `BACKFILL_SECRET`, user 결정). backend 설계 반영 후 20차로 재기록한다.

2026-10-04(20차): 백필 방식 변경(user, 메인 세션 전달 — "사용자가 승인한 설계 값, 별도 재승인 불필요")을 backend가 반영한 뒤 2종을 다시 기록한다. 승인 범위는 전달된 값 1~4와 그로부터 직접 따라 나온 값이다. 55(w) 제안값 3건(250초, `remaining_unembedded`, `INVALID_RANGE`)은 `(미확정)` 그대로 승인 범위 밖이다.

2026-10-04(20차 이어서): `anyang-backend-api`를 뺀다 — 사유: 확인 항목 55(x) code-review "설계 변경 필요"(백필 임베딩 시간 예산 250초가 maxDuration 300 안에서 안전하지 않음). 사용자 결정 후 재기록한다. 같은 사유로 `anyang-backend-tasks`도 뺀다(5-3에 250초가 적혀 있음).

2026-10-04(21차): 55(x)·(w)·(y) 사용자 결정(메인 세션 전달 — 200초, `remaining_unembedded`·`INVALID_RANGE` 확정, null 보강)을 backend가 반영한 뒤 2종을 다시 기록한다.

2026-10-04(22차): `anyang-database-schema`·`anyang-backend-api`·`anyang-backend-tasks`를 뺀다 — 사유: 확인 항목 56(안양시 클라우드 IP 차단, UNO Q 보드 수집기·Vercel 받기 API, 새 요청). 재승인 뒤 다시 기록한다. 같은 사유로 `anyang-frontend-screens`·`anyang-frontend-tasks`도 뺀다(관리자 "수동 수집" 버튼이 직접 수집 스위치로 410을 받음 — backend 보고). 남은 승인된 설계는 `anyang-cheongan-design-adoption`(19차)이다.

2026-10-04(23차): 확인 항목 56 사용자 결정·승인(메인 세션 전달 — B안, 스위치, 제안값 전부 확정, "제안대로 승인"). database가 B안을 본문 기준으로 정리(별도 클러스터 `17 collector`, 포트 5433, `pg_createcluster`, 소켓 전용·peer, USB 가드 드롭인)한 뒤 7종을 기록한다. 포트 5433·클러스터 구성 세부는 B안 승인에서 직접 따라 나온 값으로 본다. 나머지 문서의 `(미확정)` 표시는 구현 단계에서 각 소유자가 지운다.


2026-10-04(23차 이어서): `anyang-board-collector`·`anyang-board-collector-db`를 뺀다 — 사유: 확인 항목 56(j) code-review "설계 변경 필요"(full 성공 보고 충돌, 표에 없는 코드 값, 응답표 문구, PGPORT, 90일 삭제). 사용자 결정 후 24차로 재기록한다.

2026-10-04(24차): 56(j) 사용자 결정(메인 세션 전달 — (나) full 일일 보고, 코드 값 5종·응답표·PGPORT 문서 정합, collector_runs 90일 삭제)을 database·backend가 반영한 뒤 2종을 다시 기록한다. success 보고 행은 `error_summary=null`(frontend 변경 불필요)로 정한 것은 (나)에서 직접 따라 나온 값으로 본다.


2026-10-04(24차 이어서): `anyang-board-collector-db`를 뺀다 — 사유: 확인 항목 56(l) database "설계 변경 필요"(보드 소켓 폴더에 `arduino` 쓰기 권한 없음, 클러스터 실행 사용자 변경 필요). 사용자 결정 후 25차로 재기록한다.

2026-10-04(25차): 56(l) (c)안(user, 메인 세션 전달)을 database가 반영(B-1·B-4, 같은 값이 적힌 F-1·F-2·인프라 문장·확인 항목 2를 함께 정합, 164행 낡은 문장 정정)한 뒤 다시 기록한다.


2026-10-04(26차): `anyang-database-schema`·`anyang-backend-api`·`anyang-backend-tasks`를 뺀다 — 사유: 확인 항목 57(알림 잡 활성화·과거 공지 일괄 발송 방지, 새 요청). 재승인 뒤 다시 기록한다. 남은 승인된 설계: `anyang-cheongan-design-adoption`, `anyang-frontend-screens`, `anyang-frontend-tasks`, `anyang-board-collector`, `anyang-board-collector-db`.

2026-10-04(27차): 확인 항목 57-D 사용자 결정·승인(메인 세션 전달 — 8건 전부, 제안값이 문서에 적힌 그대로 확정)으로 3종을 다시 기록한다. 각 소유자가 구현 단계에서 `(미확정)` 표시를 지운다.

2026-10-04(27차 이어서): `anyang-backend-api`·`anyang-backend-tasks`·`anyang-frontend-screens`·`anyang-frontend-tasks`를 뺀다 — 사유: 확인 항목 58(테스트 알림 버튼, 새 요청). 설계 반영 후 28차로 재기록한다. 같은 사유로 `anyang-database-schema`도 뺀다(`auth_attempts` 값 셋에 `test_notify`·`user` 한 줄 추가).

2026-10-04(28차): 확인 항목 58 — 사용자가 메인 세션을 통해 승인한 값(경로·인증·본인 구독·제목·클릭 이동·410/404 삭제·notify_logs 미기록·1분 1회 429·응답·409 `NO_SUBSCRIPTION`·정지 규칙·버튼·안내 3종·서비스워커 이동, "재승인 없음")을 backend·frontend·database가 반영한 뒤 4종을 다시 기록한다. 승인 범위는 그 값들이다. 에이전트가 새로 정한 값은 `(미확정)` 그대로 승인 범위 밖이며, 확인 항목 58 (a)에 모아 사용자 확인을 받는다(20차와 같은 처리 — 제안값대로 구현한다).


2026-10-04(28차 이어서): `anyang-database-schema`·`anyang-backend-api`를 뺀다 — 사유: 확인 항목 57(n) 알림 임계값 0.75 → 0.70(user 결정). 값 반영 후 29차로 재기록한다.

2026-10-04(29차): 57(n) 사용자 결정(0.70)을 database(2곳)·backend(4곳, 겸해서 8-1절 제약 확인 사실 정정)가 반영한 뒤 2종을 다시 기록한다.

2026-10-04(29차 이어서): `anyang-database-schema`·`anyang-backend-api`·`anyang-backend-tasks`를 뺀다 — 사유: 확인 항목 59(직군 매칭 반영, 새 요청). 재승인 뒤 30차로 다시 기록한다.

2026-10-04(30차): 확인 항목 59-D 사용자 결정·승인(메인 세션 전달 — (a) 시험 도입, v2 문장 8개, 직군 0.60·관심사 0.70, 직군만 있는 사용자 포함, 상한 20, 추천 미반영, 문장 원본 코드 상수, 운영 작업 승인)으로 3종을 다시 기록한다. 각 소유자가 구현 단계에서 `(미확정)` 표시를 지운다. 결정과 다른 서술(예: 설계 문서의 "v2 실측 후 확정" 게이트 20-0)은 결정으로 충족된 것으로 본다.

2026-10-04(30차 이어서): 3종을 뺀다 — 사유: 확인 항목 59 code-review 문서 정정(확정값 0.60·상한 20 등이 문서에 `T_occ`·"v2 실측 뒤 정한다"·빈 괄호·"설계 draft"로 남음, database 절 제목·"마이그레이션 파일은 만들지 않았고" 사실 불일치). 값 변경 없이 30차에서 사용자가 확정한 값을 적는 정정이므로, 정정 후 같은 승인(30차)으로 다시 기록한다(10차 이어서와 같은 처리).

2026-10-04(30차 재기록): database(절 제목을 "승인·구현 완료"로, 0022 적용·시드 사실, 채택값)·backend(`T_occ` = 0.60, 빈 괄호·"설계 draft"·"v2 실측 후 확정" 정리, 앵커 링크 갱신)가 정정을 마쳤다. 값 변경 없음. backend-api 7-2절 제목의 "설계 draft"는 여러 앵커가 걸려 있어 남김(다음 설계 수정 때 앵커와 함께).

2026-10-04(30차 이어서): `anyang-frontend-screens`·`anyang-frontend-tasks`를 뺀다 — 사유: 확인 항목 60(채팅 뒤로가기 시 대화·인용 유지, 새 요청). 반영 후 31차로 재기록한다.

2026-10-04(31차): 확인 항목 60 사용자 결정·승인(①②, (a) `history.replaceState`, 에이전트 제안값 전부 확정)으로 2종을 다시 기록한다. frontend가 구현 단계에서 `(미확정)` 표시를 지운다.

2026-10-04(31차 이어서): `anyang-frontend-screens`·`anyang-frontend-tasks`를 뺀다 — 사유: 확인 항목 60(b) code-review "설계 변경 필요"(interrupted 시 보관분 streaming 플래그, 서버 실패 시 보관분 표시, 문서 정리). 결정 후 32차로 재기록한다.

2026-10-05(32차): 확인 항목 60(b)·(c) 사용자 결정(2026-10-04 응답, "제안대로 진행")을 frontend가 반영(3-1절 5·6번, 취소 규칙, 문서 정리, 오류 문서 역링크, tasks S4)한 뒤 2종을 다시 기록한다. 3-1절 문장 2곳의 잠금 밖 수정은 사후 인정됨.


2026-10-05(32차 이어서): `anyang-frontend-screens`·`anyang-frontend-tasks`를 뺀다 — 사유: 확인 항목 61(공지 화면 관심사 시트, 새 요청). 반영 후 33차로 재기록한다.

2026-10-05(33차): 확인 항목 61 사용자 결정(메인 세션 전달, "에이전트가 새로 정한 세부값은 (미확정)으로 두고 제안대로 구현")으로 2종을 다시 기록한다. 승인 범위는 사용자 결정 값이고, 61(a) 제안값은 `(미확정)` 그대로 승인 범위 밖이다(20·28차와 같은 처리).

## Links

- [[anyang-youth-policy-assistant]]
- [[rule-review-baseline]]
