// 뽐뿌 zboard 공용 행 파서 — 이벤트게시판(id=event)과 핫딜게시판(id=ppomppu)이
// 완전히 같은 마크업이라 여기서 한 번만 파싱한다.
//
// 함정:
//   - EUC-KR. TextDecoder('euc-kr')로 디코딩 (car-event에서 검증, 'cp949' 별칭 금지).
//   - 공지 행(baseNotice)은 href가 다른 게시판(regulation 등)을 가리킨다.
//     행 필터가 아니라 href의 id= 로 거른다.
//   - 쇼핑몰명은 제목 텍스트가 아니라 <em class="subject_preface">[옥션]</em> 별도 태그다.
//   - 등록시각 전체값은 <time> 안이 아니라 td의 title 속성("26.08.21 10:02:54")에 있다.
//   - 추천은 "5 - 0" (추천 - 반대) 형식. 없으면 빈 칸.

import { fetchText, clean, politeDelay } from './fetch.mjs';

const BASE = 'https://www.ppomppu.co.kr/zboard/';

/**
 * @param {string} boardId  'event' | 'ppomppu' 등
 * @param {number} pages    1부터 이 수까지 순회
 * @returns {Promise<Array<{nativeId, title, prefix, url, category, comments, votes, postedAt}>>}
 */
export async function fetchBoardRows(boardId, pages = 1) {
  const rows = [];
  const seen = new Set();

  for (let page = 1; page <= pages; page++) {
    const html = await fetchText(`${BASE}zboard.php?id=${boardId}&page=${page}`, { encoding: 'euc-kr' });

    for (const chunk of html.split(/<tr\b/)) {
      if (!chunk.includes('baseList-title') || chunk.includes('baseNotice')) continue;

      const a = chunk.match(/<a[^>]*class="[^"]*baseList-title[^"]*"[^>]*href="([^"]*\bno=(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/);
      if (!a) continue;
      const href = a[1].replace(/&amp;/g, '&');
      if (!new RegExp(`\\bid=${boardId}\\b`).test(href)) continue;   // 공지가 다른 게시판을 가리키는 경우
      const nativeId = a[2];
      if (seen.has(nativeId)) continue;
      seen.add(nativeId);

      // <em class="baseList-head subject_preface">[옥션]</em> — 쇼핑몰/말머리
      const prefixM = a[3].match(/subject_preface"[^>]*>\s*\[?([^<\]]*)\]?\s*</);
      const prefix = prefixM ? clean(prefixM[1]) : null;
      const title = clean(a[3].replace(/<em[\s\S]*?<\/em>/g, ''));
      if (!title) continue;

      const dt = chunk.match(/title="(\d{2})\.(\d{2})\.(\d{2})\s+(\d{2}:\d{2}:\d{2})"/);
      const votesM = chunk.match(/baseList-rec[^>]*>\s*(\d+)/);

      rows.push({
        nativeId: `${boardId}-${nativeId}`,
        title,
        prefix,
        url: `${BASE}${href.replace(/^\.?\//, '')}`,
        category: chunk.match(/baseList-small"\s*>\s*\[([^\]]+)\]/)?.[1] ?? null,
        comments: Number(chunk.match(/baseList-c[^>]*>\s*(\d+)/)?.[1] ?? 0),
        votes: votesM ? Number(votesM[1]) : null,
        postedAt: dt ? `20${dt[1]}-${dt[2]}-${dt[3]}T${dt[4]}+09:00` : null,
      });
    }
    if (page < pages) await politeDelay();
  }
  return rows;
}
