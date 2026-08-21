// 쇼핑몰 가격 추적(enrich) 순수 함수 회귀 — 게시글→상품링크 추출.
// 스니펫은 2026-08-21 실측 HTML 원문에서 발췌.
//   npx tsx scripts/test-enrich.ts

import { extractProductUrl } from "../collector/lib/post-link.mjs";
import { parse11stPrice } from "../collector/malls/eleven.mjs";
import { parseJsonLdPrice } from "../collector/malls/jsonld.mjs";
import { parseLotteonPrice } from "../collector/malls/lotteon.mjs";
import { chooseListPrice } from "../lib/enrich-prices";

let failed = 0;

function link(name: string, source: string, html: string, expected: string | null) {
  const got = extractProductUrl(source, html);
  if (got !== expected) {
    failed++;
    console.error(`✗ ${name} → ${JSON.stringify(got)}, 기대 ${JSON.stringify(expected)}`);
  }
}

// ── 뽐뿌: href에 따옴표가 없다(실측) — ["']? 없인 100% 놓친다 ──
const PPOMPPU_REAL = `<li>조회수 1062</li>            <li class="topTitle-link"><a href=https://s.ppomppu.co.kr?idno=ppomppu_728404&target=aHR0cHM6Ly9icmFuZC5uYXZlci5jb20vcGhpbGlwc2RvbWVzdGljYXBwbGlhbmNlcy9wcm9kdWN0cy84NTEzODMwNTE4&encode=on target=_blank>https://brand.naver.com/philipsdomesticappliances/products/8513830518</a></li>`;
link("뽐뿌 따옴표 없는 href", "ppomppu-deal", PPOMPPU_REAL, "https://brand.naver.com/philipsdomesticappliances/products/8513830518");
link(
  "뽐뿌 제휴 딜(class에 partner 추가)",
  "ppomppu-deal",
  PPOMPPU_REAL.replace('class="topTitle-link"', 'class="topTitle-link partner"'),
  "https://brand.naver.com/philipsdomesticappliances/products/8513830518",
);
link(
  "뽐뿌 폴백: 본문 미리보기 컨테이너 data-url",
  "ppomppu-deal",
  `<div id='div_together_goods-container' data-type='defult_coupnag' data-url='https://brand.naver.com/x/products/1' data-subject='상품'></div>`,
  "https://brand.naver.com/x/products/1",
);
link(
  "뽐뿌 target이 URL이 아니면 null (억지 추측 금지)",
  "ppomppu-deal",
  `<li class="topTitle-link"><a href=https://s.ppomppu.co.kr?idno=x&target=aGVsbG8=&encode=on>x</a></li>`,
  null,
);

// ── 루리웹: div.source_url 스코프 — 본문 위 광고 앵커를 잡으면 안 된다 ──
const RULIWEB_REAL = `<a href="https://dajooda.com/s/promo" target="_blank">광고</a>
<div class="source_url box_line_with_shadow"><span class="text_bar">출처 : </span>
	<a href="https://web.ruliweb.com/link.php?ol=https%3A%2F%2Fwww.lotteon.com%2Fp%2Fproduct%2FLO2668042600&bbs=1020" target="_blank" tabindex="-1">https://www.lotteon.com/p/product/LO2668042600</a>
</div>`;
link("루리웹 source_url (앞의 광고 앵커 무시)", "ruliweb", RULIWEB_REAL, "https://www.lotteon.com/p/product/LO2668042600");
link("루리웹 출처 박스 없으면 null", "ruliweb", `<a href="https://dajooda.com/s/promo">광고</a>`, null);

// ── 퀘이사존: goToLink 가 페이지 유일 (푸터 스폰서 앵커 150+ 자동 배제) ──
link(
  "퀘이사존 goToLink base64",
  "quasarzone",
  `<td><a href="javascript:goToLink('aHR0cHM6Ly9tLmdtYXJrZXQuY28ua3IvdmkvcHJvZHVjdC82MTc0NzAwMTE=');">https://m.gmarket.co.kr/vi/product/617470011</a></td>`,
  "https://m.gmarket.co.kr/vi/product/617470011",
);

// ── 미지원 소스는 null (알구몬 enc=는 복호화 불가 — 미지원이 정답) ──
link("알구몬 미지원", "algumon", `<a href="/n/d/1?enc=v1.xxx">x</a>`, null);

// ── 쇼핑몰 가격 파서 (2026-08-21 실측 스니펫) ──
type P = { listPrice: number | null; salePrice: number | null };
function priceIs(name: string, got: P, expected: P) {
  if (got.listPrice !== expected.listPrice || got.salePrice !== expected.salePrice) {
    failed++;
    console.error(`✗ ${name} → ${JSON.stringify(got)}, 기대 ${JSON.stringify(expected)}`);
  }
}

priceIs(
  "11번가 productPrcInfo (정가/판매가)",
  parse11stPrice(`<script>var productPrcInfo = { selPrc: 179000, dscPrc: 179000, };</script>`),
  { listPrice: 179_000, salePrice: 179_000 },
);
priceIs(
  "11번가 dataLayer 폴백",
  parse11stPrice(`{"original_price":25000,"discount_percent":20,"discount_price":20000}`),
  { listPrice: 25_000, salePrice: 20_000 },
);
priceIs(
  "롯데온 hidden input (엔티티 디코딩, 정가는 SSR에 없음)",
  parseLotteonPrice(
    `<input type="hidden" id="metaData" value="{&quot;product&quot;:{&quot;priceInfo&quot;:{&quot;slPrc&quot;:68100}}}">`,
  ),
  { listPrice: null, salePrice: 68_100 },
);
priceIs(
  "JSON-LD StrikethroughPrice — 취소선가가 정가",
  parseJsonLdPrice(
    `<script type="application/ld+json">{"@type":"Product","offers":{"price":"179000","priceCurrency":"KRW","priceSpecification":{"price":199000,"availability":"https://schema.org/StrikethroughPrice","@type":"UnitPriceSpecification"}}}</script>`,
  ),
  { listPrice: 199_000, salePrice: 179_000 },
);
priceIs("JSON-LD Product 없음", parseJsonLdPrice(`<script type="application/ld+json">{"@type":"WebSite"}</script>`), {
  listPrice: null,
  salePrice: null,
});

// ── 비교 기준 채택 가드 — 몰 대표가는 다른 옵션일 수 있다 (틀린 값보다 null) ──
function base(name: string, dealPrice: number, mall: P, expected: number | null) {
  const got = chooseListPrice(dealPrice, mall);
  if (got !== expected) {
    failed++;
    console.error(`✗ ${name} → ${got}, 기대 ${expected}`);
  }
}

base("11번가 실측: 딜 137,890 vs 정가 179,000 → 채택", 137_890, { listPrice: 179_000, salePrice: 179_000 }, 179_000);
base("롯데온 실측: 딜 18,900 vs 대표옵션 68,100 → 옵션 미스매치, 버림", 18_900, { listPrice: null, salePrice: 68_100 }, null);
base("판매가만 있어도 기준으로 채택", 17_000, { listPrice: null, salePrice: 20_000 }, 20_000);
base("몰 가격이 딜가보다 한참 싸면 미스매치 의심 → 버림", 10_000, { listPrice: null, salePrice: 7_000 }, null);
base("정가·판매가 둘 다 있으면 큰 쪽(정가)이 기준", 10_000, { listPrice: 25_100, salePrice: 24_000 }, 25_100);
base("가격 없음", 10_000, { listPrice: null, salePrice: null }, null);

if (failed) {
  console.error(`\n${failed}개 실패`);
  process.exit(1);
}
console.log("test-enrich: 전부 통과");
