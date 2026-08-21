// JSON-LD(schema.org Product) 공통 폴백 — 전용 어댑터가 없는 몰의 마지막 시도.
// 표준을 지키는 몰(롯데온·11번가 실측 확인)이 많아서 커버리지가 공짜로 늘어난다.
// hosts '*'는 registry에서 맨 끝에 두고, 전용 어댑터가 없을 때만 걸린다.

import { fetchText } from '../lib/fetch.mjs';

export const meta = { id: 'jsonld', label: '기타(JSON-LD)', hosts: ['*'] };

const STRIKE = 'schema.org/StrikethroughPrice';

/** HTML의 ld+json에서 { listPrice, salePrice } — 순수 함수, 실패는 null 필드 */
export function parseJsonLdPrice(html) {
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data;
    try {
      data = JSON.parse(m[1]);
    } catch {
      continue;
    }
    const nodes = [].concat(data?.['@graph'] ?? data ?? []);
    const p = nodes.find((x) => x && x['@type'] === 'Product' && x.offers);
    if (!p) continue;

    const offers = [].concat(p.offers)[0] ?? {};
    const salePrice = toN(offers.price ?? offers.lowPrice);
    // 11번가 실측: 취소선가는 priceSpecification에 availability=StrikethroughPrice로 온다
    const specs = [].concat(offers.priceSpecification ?? []);
    const strike = specs.find((s) => String(s?.availability ?? '').includes(STRIKE));
    return { listPrice: toN(strike?.price), salePrice };
  }
  return { listPrice: null, salePrice: null };
}

function toN(v) {
  const n = Math.round(Number(String(v ?? '').replace(/[,\s]/g, '')));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function fetchPrice(url) {
  return parseJsonLdPrice(await fetchText(url));
}
