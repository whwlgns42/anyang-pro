---
type: decision
date: 2026-09-27
status: active
owner: pm
decided_by: user
---

# 안양 청년정책 비서 — 수집 대상·프로필·알림·화면 범위 결정

## Summary

수집 대상은 안양시 청년 게시판 1개, 프로필은 생년·성별·직군·재학/재직 여부만, 알림은 사용자별 자유 시각 + on/off로 정한다. 기억 화면(조회·수정·삭제)과 대화 히스토리 목록 화면을 넣고, 인증 부가 테이블은 쓰지 않는다. 가입 시 개인정보 필수 동의 화면(국외 이전 고지)과 처리방침 페이지를 둔다.

## Context

설계 draft에서 "확인이 필요한 항목"으로 올렸던 질문에 사용자가 2026-09-27에 답했다. 설계 문서는 이 결정에 맞춰 수정한다. 설계 승인은 별도다.

## Details

| 항목 | 결정 |
|---|---|
| 수집 대상 | 안양시 청년 게시판 1개: https://www.anyang.go.kr/youth/selectBbsNttList.do?bbsNo=1184&key=3543 |
| 프로필 항목 | 생년(나이)·성별·직군·재학/재직 여부. 소득 등 그 외 항목은 수집하지 않는다 |
| 알림 | 개인 설정 화면에서 사용자별로 알림 시각을 자유 설정, 알림 on/off |
| 기억 화면 | "AI가 기억하는 내 정보" 화면을 넣는다. 조회·수정·삭제 |
| 대화 히스토리 | 대화 히스토리 목록 화면을 넣는다 |
| 인증 부가 테이블 | `verification_tokens` 등 쓰지 않는다 |

| 개인정보 동의 | 가입 시(Google·이메일 모두) 필수 동의 화면. 수집 항목(생년·성별 등)과 목적, DeepSeek(중국 서버 처리)·Gemini 무료 티어로의 국외 이전 고지, 동의 시각 기록. 개인정보 처리방침 페이지 포함. 세부 문구·동의 기록 방식은 설계에서 정한다 |

## Links

- [[anyang-youth-policy-assistant]]
- [[anyang-login-method]]
- [[anyang-database-schema]]
- [[anyang-backend-api]]
- [[anyang-frontend-screens]]
- [[anyang-backend-tasks]]
- [[anyang-frontend-tasks]]
