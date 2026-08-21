// 알구몬 — 여러 핫딜 커뮤니티(뽐뿌·퀘이사존·루리웹 등)를 재집계하는 사이트.
// 소스 하나로 커뮤니티 여럿을 덮는 게 장점. 뽐뿌 직수집과 겹치는 건은
// collect 단계의 fingerprint 병합에서 원 커뮤니티(priority 낮은 쪽)가 이긴다.
//
// Svelte SSR이라 첫 렌더에 최신 9개 카드만 실린다(2026-08-21 실측, __data.json 없음).
// 15분 TTL로 자주 긁는 운용이라 9개면 흐름이 끊기지 않는다.
//
// 링크는 /n/d/{id}?enc=... 형태의 만료되는 리다이렉트가 아니라
// 안정 URL인 /n/deal/{id} (알구몬 상세 페이지)를 쓴다.
// 등록시각은 "방금 전"류 상대시각뿐이라 근사 변환한다.

import { fetchText, clean } from '../lib/fetch.mjs';
import { fromRelative } from '../lib/reltime.mjs';

export const meta = {
  id: 'algumon',
  label: '알구몬',
  kind: 'aggregator',
  optional: true,      // 스로틀에 걸리는 날이 있어 실패해도 조용히 넘어간다
  minRows: 5,
  priority: 30,
};

export async function fetchItems() {
  // 짧은 간격으로 연타하면(개발 중 실측: 30분에 10회) SSR 대신 2.8KB 빈 셸을
  // 내려준다. 차단이 아니라 스로틀이라 정상 주기(15분 TTL)에선 회복된다.
  // 재시도는 히트만 늘리므로 하지 않는다 — 이번 실행은 그냥 실패로 두면 된다.
  const html = await fetchText('https://www.algumon.com/');
  const items = [];

  const cards = html.split(/<div id="deal-(\d+)"/).slice(1);
  // split 결과: [id, 카드html, id, 카드html, ...]
  for (let i = 0; i + 1 < cards.length; i += 2) {
    const nativeId = cards[i];
    // Svelte 하이드레이션 주석(<!--[!-->)이 태그 사이 곳곳에 끼므로 먼저 걷어낸다
    const card = cards[i + 1].replace(/<!--[\s\S]*?-->/g, '');

    const title = clean(card.match(/<h3[^>]*>\s*<a[^>]*>([\s\S]*?)<svg/)?.[1] ?? '');
    if (!title) continue;

    // 원 커뮤니티 뱃지: <img src=".../site-icon/ppomppu.png" .../>뽐뿌</span>
    const origin = clean(card.match(/site-icon\/[^"]+"[^>]*\/?>([^<]+)</)?.[1] ?? '');
    const priceRaw = clean(card.match(/deal-price-text"\s*>([^<]*)/)?.[1] ?? '');
    const shipping = clean(card.match(/<span>배송\s*([^<]+)<\/span>/)?.[1] ?? '');
    const rel = card.match(/(방금 전|잠시 전|어제|\d+\s*(?:초|분|시간|일|주|개월|달|년)\s*전)/)?.[1] ?? null;
    const priceNum = priceRaw.match(/([\d,]+)\s*원/)?.[1];

    items.push({
      nativeId,
      title: origin ? `${title}` : title,
      mall: null,                    // 알구몬 카드엔 쇼핑몰명이 따로 없다 — 키워드 뱃지는 쇼핑몰이 아님
      origin: origin || null,        // 원 커뮤니티 이름 (뽐뿌·퀘이사존 등)
      url: `https://www.algumon.com/n/deal/${nativeId}`,
      category: null,
      price: priceNum ? Number(priceNum.replace(/,/g, '')) : null,
      priceRaw: priceRaw || null,
      shipping: shipping || null,
      votes: null,
      comments: null,
      postedAt: fromRelative(rel),
    });
  }
  return items;
}
