// 뽐뿌 이벤트게시판(id=event2) — 전 분야 경품 응모 이벤트의 주력 소스.
// 브랜드·앱·금융·편의점 이벤트가 커뮤니티 유저 손으로 모여든다.
//
// **게시판 id는 event2다.** id=event 는 2024-10 이후 글이 끊긴 옛 게시판인데
// 행 30개를 멀쩡히 돌려줘서(전부 옛 글) minRows로는 안 잡힌다. 2026-08-21 실측.
//
// 게시판 자체가 이벤트 전용이라 필터는 EXCLUDE만 적용된다(kind: 'board').
// 제목 끝의 "(~8/31)" 형태가 있을 때만 마감일을 안다 — 억지 파싱은 하지 않는다.
//
// 대안 소스 탐색 기록(2026-08-21): 위비티 이벤트섹션(c=event)은 전체 15건·접수중
// 0건으로 사멸, 콘테스트코리아는 이벤트 카테고리 자체가 없음, 클리앙 board/event와
// 인벤 event.inven.co.kr 루트는 404, 퀘이사존 qb_event는 존재하지 않는 게시판.
// 그래서 이벤트 탭은 이 소스 하나로 시작하고 대신 3페이지 깊이로 본다.

import { fetchBoardRows } from '../lib/ppomppu-board.mjs';
import { toIso } from '../lib/dates.mjs';

export const meta = {
  id: 'ppomppu-event',
  label: '뽐뿌 이벤트',
  kind: 'board',
  optional: false,
  minRows: 20,
  priority: 10,
};

const PAGES = 3;   // 페이지당 20행 — 3페이지면 며칠치를 덮는다

export async function fetchItems() {
  const rows = await fetchBoardRows('event2', PAGES);
  return rows.map((r) => ({
    nativeId: r.nativeId,
    title: r.prefix ? `[${r.prefix}] ${r.title}` : r.title,
    url: r.url,
    org: r.prefix || null,
    category: r.category,
    // "(~8/31)" 처럼 제목에 마감이 적혀 있을 때만 안다
    endDate: toIso(r.title.match(/~\s*(\d{1,2}\s*[./월]\s*\d{1,2})/)?.[1] ?? ''),
    postedAt: r.postedAt,
    comments: r.comments,
  }));
}
