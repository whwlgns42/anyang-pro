// anyang-frontend-screens 9절: 정적 페이지, 로그인 여부와 무관하게 접근 가능. 법률 검토된
// 최종 문구는 아직 없다(설계 범위 밖) — 이 라운드에서는 확정된 사실 관계만 담는다: 동의 기록
// 1년 보관, 수집 실행·외부 API 사용 로그 90일 보관(알림 발송 로그 제외), DeepSeek·Gemini
// 국외 이전과 Gemini로 대화 내용(임베딩용, PII 마스킹 후)을 전송한다는 사실
// ([[anyang-service-scope]], [[anyang-ai-models-data-transfer]], user, 2026-09-27).
export default function PrivacyPolicyPage() {
  return (
    <main className="page page--narrow">
      <h1>개인정보 처리방침</h1>

      <h2>수집 항목과 목적</h2>
      <p>
        서비스 이용을 위해 생년, 성별, 직군, 재학/재직 여부를 수집합니다(모두 선택 입력).
        수집한 정보는 맞춤 공지 추천과 채팅 응답 품질 향상에 사용합니다.
      </p>

      <h2>국외 이전</h2>
      <p>
        채팅 응답 생성에는 DeepSeek(중국 서버에서 처리)을, 채팅 검색·추천을 위한 문장 임베딩에는
        Gemini(무료 티어)를 사용합니다. 채팅 중 입력한 메시지는 관련 공지 검색을 위해 Gemini로
        전송되며, 전송 전 전화번호·이메일·주민등록번호 형태의 문자열은 정규식으로 가린 뒤
        전송합니다.
      </p>

      <h2>보관 기간</h2>
      <ul>
        <li>
          가입 시 받은 동의 기록은 탈퇴 후에도 증빙 목적으로 1년간 보관된 뒤 삭제됩니다.
        </li>
        <li>
          공지 수집 실행 이력과 외부 API(DeepSeek·Gemini) 사용량 기록은 90일간 보관 후
          삭제됩니다. 알림 발송 로그는 중복 발송 방지를 위해 삭제 대상에서 제외됩니다.
        </li>
      </ul>

      <p className="hint-text">
        이 페이지의 세부 법률 문구는 검토 후 갱신될 수 있습니다.
      </p>
    </main>
  );
}
