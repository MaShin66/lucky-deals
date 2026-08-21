// 표시 포맷 회귀 케이스 — 특히 가격 변동(formatDiscount) 표기.
//   npx tsx scripts/test-format.ts

import { formatDiscount, formatPrice } from "../lib/format";

let failed = 0;

function discount(
  price: number | null,
  prevPrice: number | null,
  expected: { text: string; dir: "down" | "up" } | null,
) {
  const got = formatDiscount(price, prevPrice);
  const ok = got === null ? expected === null : got.text === expected?.text && got.dir === expected?.dir;
  if (!ok) {
    failed++;
    console.error(`✗ discount(${price}, ${prevPrice}) → ${JSON.stringify(got)}, 기대 ${JSON.stringify(expected)}`);
  }
}

// AGENTS.md의 규범 케이스: "~~17,230원~~ 13,250원 23%↓"
discount(13_250, 17_230, { text: "3,980원·23%↓", dir: "down" });
discount(12_000, 9_900, { text: "2,100원·21%↑", dir: "up" }); // 재등장 시 인상도 정직하게 표시
discount(9_990, 10_000, { text: "10원↓", dir: "down" }); // 1% 미만은 %를 생략 (0%↓ 방지)
discount(0, 17_230, { text: "17,230원·100%↓", dir: "down" }); // 유료→무료
discount(5_000, 5_000, null); // 변동 없음
discount(null, 17_230, null);
discount(5_000, null, null);
discount(5_000, 0, null); // 0원 기억은 비교 기준이 못 된다

function priceText(price: number | null, priceRaw: string | null, expected: string | null) {
  const got = formatPrice(price, priceRaw);
  if (got !== expected) {
    failed++;
    console.error(`✗ formatPrice(${price}, ${JSON.stringify(priceRaw)}) → ${JSON.stringify(got)}, 기대 ${JSON.stringify(expected)}`);
  }
}

priceText(13_250, null, "13,250원");
priceText(0, null, "무료");
priceText(null, "$9.99", "$9.99"); // 달러는 raw 그대로
priceText(null, null, null);

if (failed) {
  console.error(`\n${failed}개 실패`);
  process.exit(1);
}
console.log("test-format: 전부 통과");
