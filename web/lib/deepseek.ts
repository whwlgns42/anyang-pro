import { ApiCallError, withApiUsageLog } from "./api-usage-log";

// anyang-backend-api 3절 — DeepSeek 스트리밍 채팅 + 선호 추출용 비스트리밍 호출.
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

// anyang-backend-api 3-4-5절(확인 항목 63) — 비용 상한. 값이 바뀌면 설계 변경이다(환경변수화하지 않는다).
const DEEPSEEK_CHAT_MAX_TOKENS = 1500;
const DEEPSEEK_EXTRACT_MAX_TOKENS = 500; // (미확정, 결정 뒤 새로 나온 값)

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
        max_tokens: DEEPSEEK_CHAT_MAX_TOKENS,
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

export type ExtractedPreference = { fact: string; replaces: number | null };

// anyang-backend-api 3-3-1절·3-3-4절 — 코드펜스(```json ... ```)를 제거한 뒤 JSON 배열로 파싱한다.
// 실패하거나 배열이 아니면 빈 배열. 원소는 {fact, replaces}이고 문자열(옛 형식)은 replaces=null로 살린다.
// replaces가 1..knownCount 정수가 아니면 null, 같은 번호 중복은 첫 원소만 유지(3-3-4절 d·g).
function parseFactsArray(content: string, knownCount: number): ExtractedPreference[] {
  const stripped = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const used = new Set<number>();
  const out: ExtractedPreference[] = [];
  for (const item of parsed) {
    if (typeof item === "string") {
      out.push({ fact: item, replaces: null });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const { fact, replaces } = item as { fact?: unknown; replaces?: unknown };
    if (typeof fact !== "string" || !fact.trim()) continue;
    let n: number | null =
      typeof replaces === "number" && Number.isInteger(replaces) && replaces >= 1 && replaces <= knownCount
        ? replaces
        : null;
    if (n !== null) {
      if (used.has(n)) n = null;
      else used.add(n);
    }
    out.push({ fact, replaces: n });
  }
  return out;
}

// anyang-backend-api 3절 5번·3-3-4절 — 매 답변 저장 직후 "새로 알게 된 사실"을 0~N개 추출하고,
// 각 사실이 기존 기억(순번 1..N) 중 하나와 모순되면 replaces에 그 순번을 적게 한다.
// knownFacts는 3-3절 조회 결과(preference_text 배열, 최대 10개)이며 배열 순서가 곧 순번이다.
export async function extractPreferences(
  conversationText: string,
  knownFacts: string[],
): Promise<ExtractedPreference[]> {
  return withApiUsageLog("deepseek", "chat", async () => {
    const knownFactsText = knownFacts.length ? knownFacts.map((f, i) => `${i + 1}. ${f}`).join("\n") : "(없음)";
    const res = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKeyOrThrow()}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        stream: false,
        max_tokens: DEEPSEEK_EXTRACT_MAX_TOKENS,
        messages: [
          {
            role: "system",
            content:
              "다음 대화에서 사용자에 대해 새로 알게 된 사실을 짧은 문장으로 추출해. 사용자가 직접 " +
              "말한 이름이나 호칭은 사실로 포함하되, 전화번호·이메일·주민등록번호 같은 연락처 정보는 " +
              "포함하지 마. 아래 '이미 아는 사실' 목록에 이미 있는 내용은 다시 추출하지 마. 새로 " +
              "알게 된 사실이 없으면 빈 배열을 반환해. " +
              "'이미 아는 사실' 목록에는 번호가 붙어 있다. 새 사실이 목록의 어떤 항목과 동시에 참일 수 없어 " +
              "그 항목을 대체해야 하면 그 항목의 번호를 replaces에 적어. 두 사실이 함께 참일 수 있으면(예: 취미가 " +
              "하나 더 있는 경우) 모순이 아니므로 replaces는 null로 둬. 확실하지 않으면 null로 둬. 출력은 " +
              '[{"fact":"새 사실 문장","replaces":번호 또는 null}] 형식의 JSON 배열만 쓰고 다른 설명은 쓰지 마.',
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
    return { value: parseFactsArray(content, knownFacts.length) };
  });
}
