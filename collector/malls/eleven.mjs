// 11번가 — 완전 SSR, 정가·판매가가 초기 HTML에 4중으로 박혀 있다 (2026-08-21 실측 200 OK).
// 1순위 전역 변수 productPrcInfo { selPrc(정가), dscPrc(판매가) },
// 2순위 dataLayer의 original_price/discount_price, 3순위 JSON-LD(StrikethroughPrice).
// 카드할인 포함 최대혜택가는 로그인 의존 POST(max-discount)라 안 건드린다.

import { fetchText } from '../lib/fetch.mjs';
import { parseJsonLdPrice } from './jsonld.mjs';

export const meta = { id: '11st', label: '11번가', hosts: ['11st.co.kr'] };

/** 순수 파서 — 회귀 케이스는 scripts/test-enrich.ts */
export function parse11stPrice(html) {
  const m = html.match(/var\s+productPrcInfo\s*=\s*\{[\s\S]{0,120}?selPrc:\s*(\d+),[\s\S]{0,60}?dscPrc:\s*(\d+)/);
  if (m) return { listPrice: Number(m[1]), salePrice: Number(m[2]) };

  const d = html.match(/"original_price":(\d+),"discount_percent":\d+,"discount_price":(\d+)/);
  if (d) return { listPrice: Number(d[1]), salePrice: Number(d[2]) };

  return parseJsonLdPrice(html);
}

export async function fetchPrice(url) {
  return parse11stPrice(await fetchText(url));
}
