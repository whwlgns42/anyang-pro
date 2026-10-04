// anyang-backend-api 7-2절(확인 항목 59, 승인된 설계 30차) — 직군 코드별 v2 설명 문장. 문장 원본은 이 상수이고
// occupation_embeddings.sentence는 무엇을 임베딩했는지 남기는 기록이다. `other`는 행을 두지 않는다.
export const OCCUPATION_SENTENCES: Record<string, string> = {
  it: "IT 소프트웨어 개발자 프로그래밍 코딩 데이터 AI",
  manufacturing: "제조업 생산직 공장 기계 설비 품질관리 기술자",
  service_sales: "서비스업 판매 영업 매장 고객 응대 유통 소상공인 자영업",
  office_management: "사무직 경영 관리 행정 회계 인사 기획",
  culture_arts: "문화 예술 창작 공연 전시 디자인 콘텐츠 예술인",
  medical_welfare: "의료 보건 간호 복지 돌봄 사회복지사 요양",
  construction_agriculture: "건설 현장 토목 건축 농업 농촌 귀농 영농 어업",
};
