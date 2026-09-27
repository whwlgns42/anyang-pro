// anyang-backend-api 5절 — robots.txt 준수 확인. User-agent: * 그룹만 본다(ponytail: 이
// 서비스가 특정 User-agent 그룹을 가릴 필요는 없다. 필요해지면 그룹별 파싱으로 확장).
export type RobotsRules = { disallowed: string[]; crawlDelaySeconds: number | null };

export function parseRobotsTxt(text: string): RobotsRules {
  const disallowed: string[] = [];
  let crawlDelaySeconds: number | null = null;
  let inWildcardGroup = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (key === "user-agent") {
      inWildcardGroup = value === "*";
      continue;
    }
    if (!inWildcardGroup) continue;
    if (key === "disallow" && value) disallowed.push(value);
    if (key === "crawl-delay") {
      const n = Number(value);
      if (!Number.isNaN(n)) crawlDelaySeconds = n;
    }
  }

  return { disallowed, crawlDelaySeconds };
}

export function isPathDisallowed(rules: RobotsRules, path: string): boolean {
  return rules.disallowed.some((prefix) => path.startsWith(prefix));
}
