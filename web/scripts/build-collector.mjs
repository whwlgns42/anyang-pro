// anyang-board-collector A-1 — 보드 수집기를 파일 1개로 묶는다: web/dist-collector/anyang-collector.mjs
// 보드에는 이 파일 하나만 복사한다(npm install·Docker 없음). pg-native는 pg가 선택적으로만 쓰므로 번들에서 뺀다.
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";

const outfile = "dist-collector/anyang-collector.mjs";
await build({
  entryPoints: ["collector/main.ts"],
  outfile,
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  external: ["pg-native"],
  // CJS 의존성(pg 등)이 require("events") 같은 내장 모듈을 쓰므로 ESM 번들에 require를 만들어 준다.
  banner: { js: 'import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);' },
  legalComments: "none",
  logLevel: "warning",
});
const sha = createHash("sha256").update(readFileSync(outfile)).digest("hex");
console.log(`${outfile} ${(statSync(outfile).size / 1024).toFixed(0)} KB sha256=${sha}`);
