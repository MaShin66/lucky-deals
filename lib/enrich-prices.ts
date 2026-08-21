import { canResolve, resolveProductUrl } from "../collector/lib/post-link.mjs";
import { politeDelay } from "../collector/lib/fetch.mjs";
import { MALL_SOURCES } from "../collector/registry.mjs";
import { PRICE_ENRICH_BUDGET } from "./config";
import { withStoreLock } from "./lock";
import { readDeals, writeDeals } from "./store";
import type { MallAdapter } from "./types";

// 쇼핑몰 직접 가격 추적 — 커뮤니티 글엔 정가가 없어서(price-memory는 관측 누적이라 느리다)
// 게시글 → 상품 링크 → 쇼핑몰 페이지의 정가(취소선가)를 직접 읽어 listPrice로 붙인다.
//
// 원칙:
//   - 수집(collectDeals)과 분리된 후속 단계. 버튼 응답을 막지 않게 서버에선 fire-and-forget.
//   - 딜당 fetch 2회(게시글+쇼핑몰)라 실행당 PRICE_ENRICH_BUDGET건으로 제한, 사이에 politeDelay.
//   - listPrice 의미론: 필드 없음=미시도, null=시도 실패(3일 롤링이라 재시도 안 함), 숫자=성공.
//   - 저장은 withStoreLock("deals") 아래 재읽기-병합. updatedAt은 수집 신선도라 절대 안 건드린다.

export interface EnrichResult {
  scanned: number;
  resolved: number;
  priced: number;
  noAdapter: number;
  failed: number;
}

function pickMall(url: string): MallAdapter | null {
  try {
    const host = new URL(url).hostname;
    for (const m of MALL_SOURCES as unknown as MallAdapter[]) {
      if (m.meta.hosts.some((h) => h === "*" || host === h || host.endsWith(`.${h}`))) return m;
    }
  } catch {
    /* 잘못된 URL */
  }
  return null;
}

const PLAUSIBLE = (n: number | null | undefined): number | null =>
  n != null && Number.isFinite(n) && n > 0 && n < 100_000_000 ? Math.round(n) : null;

/**
 * 몰 페이지 가격 → 비교 기준(listPrice) 채택 판정.
 * 몰 대표가는 '대표 옵션'의 가격이라 딜 상품과 다를 수 있다(롯데온 실측: 옵션 17개 중 대표 68,100 vs 딜 18,900).
 * 몰 가격이 딜가의 0.8~2.5배 창을 벗어나면 다른 옵션 페이지로 보고 버린다 — 틀린 값보다 null.
 */
export function chooseListPrice(dealPrice: number, mall: { listPrice: number | null; salePrice: number | null }): number | null {
  const sale = PLAUSIBLE(mall.salePrice);
  const list = PLAUSIBLE(mall.listPrice);
  const anchor = sale ?? list;
  if (anchor == null) return null;
  if (anchor < dealPrice * 0.8 || anchor > dealPrice * 2.5) return null;
  const base = Math.max(list ?? 0, sale ?? 0);
  return base > 0 ? base : null;
}

const g = globalThis as typeof globalThis & { __luckyEnriching?: boolean };

/** 이미 돌고 있으면 null (수집 연타로 겹치지 않게) */
export async function enrichDealPrices(budget = PRICE_ENRICH_BUDGET): Promise<EnrichResult | null> {
  if (g.__luckyEnriching) return null;
  g.__luckyEnriching = true;
  try {
    const store = await readDeals();
    const candidates = Object.entries(store.items)
      .filter(
        ([, it]) =>
          !("listPrice" in it) && !it.ended && !it.hidden && it.price != null && canResolve(it.source),
      )
      .sort(([, a], [, b]) =>
        (b.postedAt ?? b.firstSeenAt).localeCompare(a.postedAt ?? a.firstSeenAt),
      )
      .slice(0, budget);

    const result: EnrichResult = { scanned: candidates.length, resolved: 0, priced: 0, noAdapter: 0, failed: 0 };
    if (candidates.length === 0) return result;

    const updates = new Map<string, { listPrice: number | null; productUrl: string | null }>();
    for (const [key, it] of candidates) {
      await politeDelay();
      const productUrl = await resolveProductUrl(it.source, it.url);
      let listPrice: number | null = null;

      if (productUrl) {
        result.resolved++;
        const mall = pickMall(productUrl);
        if (!mall) {
          result.noAdapter++;
        } else {
          await politeDelay();
          const p = await mall.fetchPrice(productUrl).catch(() => null);
          listPrice = p ? chooseListPrice(it.price!, p) : null;
          if (listPrice != null) result.priced++;
          else result.failed++;
        }
      } else {
        result.failed++;
      }
      updates.set(key, { listPrice, productUrl });
    }

    await withStoreLock("deals", async () => {
      const fresh = await readDeals();
      for (const [key, u] of updates) {
        const it = fresh.items[key];
        if (!it) continue; // 그 사이 prune됐으면 무시
        it.listPrice = u.listPrice;
        if (u.productUrl) it.productUrl = u.productUrl;
      }
      await writeDeals(fresh); // updatedAt 불변 — TTL 오염 금지
    });

    console.log(
      `[enrich] 정가 조회 ${result.scanned}건 — 성공 ${result.priced} · 링크 실패/차단 ${result.failed} · 몰 미지원 ${result.noAdapter}`,
    );
    return result;
  } finally {
    g.__luckyEnriching = false;
  }
}
