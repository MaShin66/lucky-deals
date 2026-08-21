// 뽐뿌 핫딜게시판(id=ppomppu) — 핫딜 탭의 원조 소스.
// 제목 관례: "[쇼핑몰] 상품명 (가격/배송비)" — 파싱은 lib/parse-deal.ts 소관.
// 종료 딜은 리스트 마크업에 구조적 표시가 없다(2026-08-21 실측). 제목 마커로만 판정한다.

import { fetchBoardRows } from '../lib/ppomppu-board.mjs';

export const meta = {
  id: 'ppomppu-deal',
  label: '뽐뿌',
  kind: 'community',
  optional: false,
  minRows: 15,
  priority: 10,
};

const PAGES = 2;   // 페이지당 20행 — 2페이지면 반나절 이상을 덮는다

export async function fetchItems() {
  const rows = await fetchBoardRows('ppomppu', PAGES);
  return rows.map((r) => ({
    nativeId: r.nativeId,
    title: r.title,
    mall: r.prefix || null,
    url: r.url,
    category: r.category,
    votes: r.votes,
    comments: r.comments,
    postedAt: r.postedAt,
  }));
}
