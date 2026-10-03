---
type: concept
date: 2026-09-04
status: active
owner: shared
---

# Glossary

## Summary

프로젝트에서 쓰는 용어를 한 곳에 고정한 사전이다. 같은 개념을 서로 다른 이름으로 부르면서 생기는 문서 모순을 막는 것이 목적이다.

## Context

여러 에이전트가 각자 문서를 쓰면 같은 대상을 "회원", "사용자", "user"처럼 제각기 부르게 된다. 문서가 늘어난 뒤에는 어느 쪽이 맞는지 되짚기 어렵고, 코드 식별자까지 갈라진다. 그래서 용어는 이 문서 하나를 기준으로 삼는다.

## Details

용어는 누구나 추가할 수 있다. 다만 이미 있는 정의를 바꾸거나 지우려면 pm에게 보고해 승인을 받는다. 추가만 하는 것은 기존 내용과 충돌하지 않지만, 정의를 바꾸는 것은 이미 그 용어로 쓰인 모든 문서에 영향을 주기 때문이다.

### 도메인 용어

프로젝트 [[anyang-youth-policy-assistant]]의 용어다.

| 한글 | 영문 식별자 | 정의 |
|---|---|---|
| 공지 | notice | 안양시 게시판에서 수집한 청년정책 글 한 건. 원문 URL을 가진다 |
| 사용자 | user | 이 웹앱에 가입한 사람. 회원·유저라고 부르지 않는다 |
| 프로필 | profile | 사용자가 직접 입력한 조건(나이·성별·직군 등). 공지 필터에 쓴다 |
| 선호 | preference | 대화에서 추출해 사용자별로 누적한 관심사·조건 문장. 화면 문구로는 "기억"이라고 부를 수 있다. 모델 재학습이 아니다 |
| 알림 시각 | notify-time | 사용자가 새 공지 알림을 받기로 정한 하루 중 시각 |
| 대화 | conversation | 사용자와 AI 비서 사이의 채팅 한 묶음. 개별 발화는 메시지(message) |
| 푸시 구독 | push-subscription | 사용자 기기의 Web Push 구독 정보 |
| 직전 문장 | previous-fact | 선호가 모순으로 대체되기 직전의 문장. 같은 행을 새 문장으로 덮어쓰고 바뀌기 전 문장 1단계만 `user_preferences.previous_fact`에 보관해 되돌릴 수 있게 한다(기억 id 불변, 2단계 이상 이전 판본은 없다). [[anyang-database-schema]] |
| Jev 게이트 | jev-gate | 비싼 LLM 호출(기억 추출) 앞에서 Jev가 "호출할 가치가 있는가"를 확률로 판정해 낮으면 호출을 건너뛰는 앞단 검사. [[anyang-backend-api]] 3-3-3절 |
| 수집 잡 | collect-job | 게시판에서 새 공지를 가져와 저장·임베딩하는 예약 작업 |
| 알림 잡 | notify-job | 알림 시각이 된 사용자에게 매칭된 새 공지를 푸시하는 예약 작업 |
| 재학/재직 여부 | enrollment_status | 프로필 항목 중 하나. 사용자가 재학 중인지, 재직 중인지, 둘 다 아닌지를 나타낸다 |
| 수집 실행 기록 | collect-run | collect-job이 한 번 실행된 기록 한 건(시작·종료 시각, 트리거 종류, 성공 여부, 수집 건수, 오류 요약). 관리자 화면의 "수집 실행 이력"이 이 기록을 보여준다 |
| 공지 숨김 | notice-hidden | 관리자가 잘못 수집된 공지를 화면 노출·추천·검색에서 제외 처리한 상태 |
| 알림 발송 기록 | notify-log | notify-job이 특정 사용자에게 특정 공지 알림을 보낸 시도 한 건(발송 시각, 결과). 관리자 화면의 "알림 발송 현황" 집계와 중복 발송 방지의 근거 데이터다 |
| 계정 정지 | account-suspension | 관리자가 사용자 계정의 로그인·서비스 이용을 막은 상태. 계정 삭제와 다르다 |
| 외부 API 사용 기록 | api-usage-log | DeepSeek·Gemini 같은 외부 AI API 호출 한 건의 기록(제공자, 작업 종류, 시각, 결과, 토큰 수). 관리자 화면의 "외부 API 사용량" 집계 근거 데이터다 |
| 동의 항목 | consent-type | 가입 시 개인정보 동의를 받는 개별 항목 구분. "수집·이용"(collection_use)과 "국외 이전"(overseas_transfer)을 각각 별도로 받는다([[anyang-service-scope]], user, 2026-09-27) |

### 미확정 용어

아직 없습니다.

## Links

- [[CLAUDE]]
- [[anyang-youth-policy-assistant]]
- [[anyang-database-schema]]
- [[anyang-backend-api]]
- [[anyang-frontend-screens]]
