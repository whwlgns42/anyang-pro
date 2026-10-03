// anyang-backend-api 5-1절 7번 — 공지 전체 수집(백필). Vercel 함수가 아니라 로컬 일회성 스크립트다.
// 실행: npx tsx --env-file=.env.local scripts/backfill.ts [--pages 1-2]
// 운영 DB에 쓰므로 실행(시험 포함)은 사용자 승인 뒤에만 한다.
import { runCollectJob } from "../lib/collector";
import { runEmbedJob } from "../lib/embed-job";
import { pool } from "../lib/db";

const DEFAULT_PAGES: [number, number] = [1, 47];

// `--pages A-B` 해석. 인자가 없으면 1-47. 형식이 틀리면 throw.
export function parsePagesArg(argv: string[]): [number, number] {
  const i = argv.indexOf("--pages");
  if (i === -1) return DEFAULT_PAGES;
  const m = /^(\d+)-(\d+)$/.exec(argv[i + 1] ?? "");
  if (!m) throw new Error("--pages 형식은 A-B (예: 1-2)");
  const [from, to] = [Number(m[1]), Number(m[2])];
  if (from < 1 || to < from) throw new Error("--pages 범위가 올바르지 않습니다");
  return [from, to];
}

// 임베딩 대기열이 빌 때까지(한 번에 15건) 반복한다. 한 건도 임베딩하지 못하면 끝낸다.
export async function embedUntilDrained(embed: typeof runEmbedJob): Promise<number> {
  let total = 0;
  for (;;) {
    const { embedded_chunks } = await embed();
    if (embedded_chunks === 0) return total;
    total += embedded_chunks;
  }
}

async function main(): Promise<number> {
  const [fromPage, toPage] = parsePagesArg(process.argv.slice(2));
  const result = await runCollectJob("manual", null, { mode: "backfill", fromPage, toPage, skipExisting: true });
  if (!result.ok) {
    console.error(`수집 실패: ${result.reason} ${result.errorSummary}`);
    return 1;
  }
  console.log(`수집 완료: ${result.collectedCount}건 (페이지 ${fromPage}-${toPage})`);
  console.log(`임베딩 청크: ${await embedUntilDrained(runEmbedJob)}개`);
  return 0;
}

if (process.argv[1]?.endsWith("backfill.ts")) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
