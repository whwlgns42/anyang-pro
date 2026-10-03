// 번들 시험용 프리로드: 사이트 요청을 고정 HTML로 대체한다(실제 사이트에 닿지 않는다). node --import로 불러온다.
import { readFileSync } from "node:fs";
const list = readFileSync(new URL("./board-list-page1.html", import.meta.url), "utf-8");
globalThis.fetch = async (url) =>
  String(url).includes("robots.txt")
    ? new Response("User-agent: *\nCrawl-delay: 0\n", { status: 200 })
    : new Response(list, { status: 200 });
