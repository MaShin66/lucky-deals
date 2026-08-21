// 롯데온 — Vue SPA지만 판매가는 hidden input(#metaData)에 SSR로 박혀 있다 (2026-08-21 실측 200 OK).
// value가 HTML 엔티티(&quot;)라 디코딩 후 매칭. 정가(취소선가)는 SSR에 없다 — null.
// 주의: slPrc는 '대표 옵션'의 판매가라 딜 상품과 다를 수 있다 — 정합성 판정은 enrich 쪽 가드가 한다.

import { fetchText } from '../lib/fetch.mjs';
import { parseJsonLdPrice } from './jsonld.mjs';

export const meta = { id: 'lotteon', label: '롯데온', hosts: ['lotteon.com'] };

/** 순수 파서 — 회귀 케이스는 scripts/test-enrich.ts */
export function parseLotteonPrice(html) {
  const decoded = html.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const sl = decoded.match(/"priceInfo":\{"slPrc":(\d+)/)?.[1];
  if (sl) return { listPrice: null, salePrice: Number(sl) };
  return parseJsonLdPrice(html);
}

export async function fetchPrice(url) {
  return parseLotteonPrice(await fetchText(url));
}
