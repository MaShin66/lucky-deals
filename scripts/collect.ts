// 수동 수집 CLI — 서버 없이도 돈다.
//   npm run collect                        # 둘 다
//   npm run collect -- --scope=events      # 이벤트만
//   npm run collect -- --scope=deals       # 핫딜만
//   npm run collect -- --force             # TTL 무시
//
// 주의: dev 서버를 켠 채로 돌리지 말 것 — 프로세스가 달라 잠금 밖이다.
// (원자적 rename 덕에 파일이 깨지진 않고, 늦게 쓴 쪽이 이기는 수준)

import { refreshScope } from "../lib/collect";
import { enrichDealPrices } from "../lib/enrich-prices";
import type { Scope } from "../lib/types";

const arg = process.argv.find((a) => a.startsWith("--scope="))?.split("=")[1] ?? "all";
const force = process.argv.includes("--force");
const scopes: Scope[] = arg === "all" ? ["events", "deals"] : [arg as Scope];

if (!scopes.every((s) => s === "events" || s === "deals")) {
  console.error(`알 수 없는 scope: ${arg} (events | deals | all)`);
  process.exit(1);
}

for (const scope of scopes) {
  const outcome = await refreshScope(scope, force);
  if (outcome.status === "fresh") {
    console.log(`[${scope}] ${outcome.ageMinutes}분 전에 수집됨 — 건너뜀 (--force로 강제)`);
    continue;
  }
  if (outcome.status === "busy") {
    console.log(`[${scope}] 이미 수집 중`);
    continue;
  }
  const r = outcome.result;
  const head = r.allFailed ? "전 소스 실패 — 저장소 미변경" : `신규 ${r.added} · 갱신 ${r.updated} · 정리 ${r.pruned}`;
  console.log(`[${scope}] ${head} (소스 ${r.sourceOk}/${r.sourceOk + r.sourceFailed} 정상)`);
  for (const label of r.failedLabels) console.log(`  ⚠️ ${label} 실패`);
}

// 핫딜을 다뤘으면 쇼핑몰 정가 조회까지 이어서 (미시도 항목만, 예산 제한)
if (scopes.includes("deals")) {
  await enrichDealPrices();
}
