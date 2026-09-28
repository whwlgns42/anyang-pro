import { ApiCallError, withApiUsageLog } from "./api-usage-log";

// anyang-backend-api 3절 — DeepSeek 스트리밍 채팅 + 선호 추출용 비스트리밍 호출.
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function apiKeyOrThrow(): string {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY missing");
  return apiKey;
}

// 스트리밍 응답의 Response 자체를 그대로 반환한다 — 호출부가 body를 tee()해 클라이언트
// 전달과 저장용 캡처로 나눈다. usage 로그는 최초 fetch 성공/실패만 기준으로 남긴다(스트림
// 안 토큰 수 집계는 이번 스콥에서 하지 않는다, ponytail: 필요해지면 stream_options로 확장).
export async function streamDeepSeekChat(messages: ChatMessage[], internalUserId: string): Promise<Response> {
  return withApiUsageLog("deepseek", "chat", async () => {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKeyOrThrow()}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        stream: true,
        // 실제 user_id/email이 아닌 서버 파생 무작위 내부 ID만 전달(anyang-backend-api 3절 3번).
        user: internalUserId,
      }),
    });
    if (!res.ok) {
      throw new ApiCallError(`deepseek chat failed: ${res.status}`, res.status);
    }
    return { value: res };
  });
}

// anyang-backend-api 3-3-1절 — 코드펜스(```json ... ```)를 제거한 뒤 JSON 배열로 파싱한다.
// 실패하거나 배열이 아니면 빈 배열(파싱 실패 = 추출 결과 없음과 동일 취급).
function parseFactsArray(content: string): string[] {
  const stripped = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(stripped);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

// anyang-backend-api 3절 5번·3-3-1절 — 매 답변 저장 직후 "새로 알게 된 사실"을 0~N개 추출.
// knownFacts는 3-3절 조회 결과(preference_text 배열, 최대 10개)를 그대로 재사용한다.
export async function extractPreferences(conversationText: string, knownFacts: string[]): Promise<string[]> {
  return withApiUsageLog("deepseek", "chat", async () => {
    const knownFactsText = knownFacts.length ? knownFacts.map((f) => `- ${f}`).join("\n") : "(없음)";
    const res = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKeyOrThrow()}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "다음 대화에서 사용자에 대해 새로 알게 된 사실을 짧은 문장으로 추출해. 사용자가 직접 " +
              "말한 이름이나 호칭은 사실로 포함하되, 전화번호·이메일·주민등록번호 같은 연락처 정보는 " +
              "포함하지 마. 아래 '이미 아는 사실' 목록에 이미 있는 내용은 다시 추출하지 마. 새로 " +
              "알게 된 사실이 없으면 빈 배열을 반환해. JSON 배열만 출력하고 다른 설명은 쓰지 마.",
          },
          { role: "user", content: `이미 아는 사실:\n${knownFactsText}\n\n대화:\n${conversationText}` },
        ],
      }),
    });
    if (!res.ok) {
      throw new ApiCallError(`deepseek extract failed: ${res.status}`, res.status);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? "";
    return { value: parseFactsArray(content) };
  });
}
