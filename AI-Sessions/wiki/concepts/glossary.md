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
| 수집 잡 | collect-job | 게시판에서 새 공지를 가져와 저장·임베딩하는 예약 작업 |
| 알림 잡 | notify-job | 알림 시각이 된 사용자에게 매칭된 새 공지를 푸시하는 예약 작업 |
| 재학/재직 여부 | enrollment_status | 프로필 항목 중 하나. 사용자가 재학 중인지, 재직 중인지, 둘 다 아닌지를 나타낸다 |

### 미확정 용어

아직 없습니다.

## Links

- [[CLAUDE]]
- [[anyang-youth-policy-assistant]]
- [[anyang-database-schema]]
- [[anyang-backend-api]]
- [[anyang-frontend-screens]]
