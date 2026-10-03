// 청안 react-prototype/lib/format.ts를 참고한 표시용 서식. 서버 값은 바꾸지 않는다.

// 2026-09-01 또는 ISO 시각 -> 2026.09.01. 값이 없거나 날짜로 읽을 수 없으면 null.
export function formatDate(value: string | null | undefined): string | null {
  const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
}

// 오늘 날짜를 한국 시간 기준 "9월 29일 화요일"로.
export function formatKoreanDay(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(now);
  return parts;
}

export type TextPart = { text: string; href?: string };

// 본문 속 http(s) 주소만 링크로 나눈다. javascript: 같은 것은 일반 글자로 둔다.
export function splitLinks(text: string): TextPart[] {
  return text
    .split(/(https?:\/\/[^\s)]+)/g)
    .filter((part) => part !== "")
    .map((part) => (/^https?:\/\//.test(part) ? { text: part, href: part } : { text: part }));
}

// "9:00"처럼 HH:mm 또는 HH:mm:ss를 "오전 9:00"으로.
export function formatNotifyTime(value: string): string {
  const [h, m] = value.split(":");
  const hour = Number(h);
  const period = hour < 12 ? "오전" : "오후";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${hour12}:${m}`;
}

export function isHttpUrl(value: string | null | undefined): value is string {
  return !!value && /^https?:\/\//.test(value);
}
