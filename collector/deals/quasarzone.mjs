// 퀘이사존 핫딜(qb_saleinfo) — PC·가전 비중이 높은 핫딜 게시판.
// 정적 HTML이고 차단 없음(2026-08-21 실측, 707KB 정상 응답).
//
// 이 소스만의 장점: <span class="label">진행중|인기|종료</span> 가 구조적으로 있어서
// 종료 판정을 제목 마커에 의존하지 않아도 된다. '공지' 라벨 행은 버린다.
// 가격은 "￦ 3,550 (KRW)" 형식. 등록시각은 최근 글엔 "27분 전" 상대시각.

import { fetchText, clean } from '../lib/fetch.mjs';
import { fromRelative } from '../lib/reltime.mjs';
import { toIso } from '../lib/dates.mjs';

export const meta = {
  id: 'quasarzone',
  label: '퀘이사존',
  kind: 'community',
  optional: true,       // 실패해도 조용히 넘어간다
  minRows: 10,
  priority: 15,
};

export async function fetchItems() {
  const html = await fetchText('https://quasarzone.com/bbs/qb_saleinfo');
  const items = [];
  const seen = new Set();

  for (const chunk of html.split(/<tr>/)) {
    const idM = chunk.match(/qb_saleinfo\/views\/(\d+)/);
    if (!idM) continue;
    const nativeId = idM[1];
    if (seen.has(nativeId)) continue;

    const label = clean(chunk.match(/class="label[^"]*"\s*>([^<]+)</)?.[1] ?? '');
    if (label === '공지') continue;
    seen.add(nativeId);

    const title = clean(chunk.match(/ellipsis-with-reply-cnt"\s*>([\s\S]*?)</)?.[1] ?? '');
    if (!title) continue;

    const dateRaw = clean(chunk.match(/class="date"\s*>([\s\S]*?)<\/span>/)?.[1] ?? '');
    const priceM = chunk.match(/￦\s*([\d,.]+)/);

    items.push({
      nativeId,
      title,
      mall: null,                    // "[쿠팡] ..." 형태로 제목에 들어있다 — parse-deal이 뽑는다
      url: `https://quasarzone.com/bbs/qb_saleinfo/views/${nativeId}`,
      category: clean(chunk.match(/class="category"\s*>([^<]+)</)?.[1] ?? '') || null,
      price: priceM ? Math.round(Number(priceM[1].replace(/,/g, ''))) : null,
      priceRaw: priceM ? `￦ ${priceM[1]}` : null,
      shipping: clean(chunk.match(/배송비\s*([^<]+)</)?.[1] ?? '') || null,
      votes: null,
      comments: Number(chunk.match(/class="num num tp\d"\s*>\s*(\d+)/)?.[1] ?? 0),
      postedAt: fromRelative(dateRaw) ?? (toIso(dateRaw) ? `${toIso(dateRaw)}T00:00:00+09:00` : null),
      ended: label === '종료',       // 구조적 종료 라벨 — 제목 마커보다 확실하다
    });
  }
  return items;
}
