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

export async function summarizePreference(conversationText: string): Promise<string | null> {
  return withApiUsageLog("deepseek", "chat", async () => {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKeyOrThrow()}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        stream: false,
        messages: [
          {
            role: "system",
            content: "다음 대화에서 드러난 사용자 선호를 한 문장으로 요약해줘. 식별정보는 포함하지 마.",
          },
          { role: "user", content: conversationText },
        ],
      }),
    });
    if (!res.ok) {
      throw new ApiCallError(`deepseek summarize failed: ${res.status}`, res.status);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { value: data.choices?.[0]?.message?.content ?? null };
  });
}
