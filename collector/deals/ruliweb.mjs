// 루리웹 핫딜예판(market/board/1020) — 게임·PC 비중이 높은 핫딜 게시판.
// 완전 SSR, UTF-8, 차단 없음(2026-08-21 실측). robots.txt가 cate=·orderby=를 금지하므로
// 목록(?page=N)과 글 링크만 만든다. 알구몬이 이 게시판을 재집계하므로 priority로 이긴다.
//
// 이 소스만의 함정: 목록 제목이 ~40자에서 잘리고 리터럴 '...'이 붙는다(전체 제목 백업 없음).
// 구조적 종료 라벨도 없어서 ended는 제목 마커(parse-deal) 소관 — 필드 자체를 생략한다.
// href는 페이지마다 쿼리가 달라(`?` / `?page=2`) 그대로 쓰면 같은 딜이 갈라진다 — 재조립한다.

import { fetchText, clean, politeDelay } from '../lib/fetch.mjs';
import { today, toIso } from '../lib/dates.mjs';

export const meta = {
  id: 'ruliweb',
  label: '루리웹',
  kind: 'community',
  optional: true,       // 신규 소스 — 죽어도 뽐뿌가 살아 있으면 파이프라인은 정상
  minRows: 20,          // 필터 전 원시 행 기준 — 실측 페이지당 28행의 보수적 하한
  priority: 20,         // 뽐뿌 10 < 퀘이사존 15 < 루리웹 20 < 알구몬 30 (재집계는 반드시 이긴다)
};

const BASE = 'https://bbs.ruliweb.com/market/board/1020';
const PAGES = 2;        // 페이지당 28행 ≈ 1.5일치 — 2페이지면 3일 롤링 원장을 덮는다

// 잘린 제목 보정. "(29,660원/..." 처럼 가격 괄호가 열린 채 끊기면
// parse-deal(닫힌 괄호만 스캔)이 가격을 못 뽑고, fingerprint의 괄호 제거도 실패해
// 다른 소스와 병합이 어긋난다. 안전한 경우에만 닫고, 숫자 중간 절단은 괄호째 버린다
// ("(29,6" → 296원 같은 오값 방지 — 틀린 값보다 null).
export function fixTruncatedTitle(title) {
  const cut = title.match(/(?:\.{3}|…)\s*$/);
  if (!cut) return title;
  const t = title.slice(0, title.length - cut[0].length).trimEnd();

  // 닫힌 괄호쌍을 같은 길이 공백으로 마스킹하면 남는 '('가 미폐괄호다
  let masked = t, prev;
  do {
    prev = masked;
    masked = masked.replace(/\([^()]*\)/g, (s) => ' '.repeat(s.length));
  } while (masked !== prev);
  const open = masked.lastIndexOf('(');
  if (open === -1) return title;                                  // 괄호는 온전 — 상품명 절단이라 손대지 않는다
  if (/^[\d,.\s]*$/.test(t.slice(open + 1))) return t.slice(0, open).trimEnd();
  return t.replace(/[\s/]+$/, '') + ')';                          // 끝의 '/'는 지워 빈 shipping을 막는다
}

// 목록 시각은 두 형식뿐: 오늘 글 "HH:MM", 이전 글 "YYYY.MM.DD". title 속성 백업이 없다.
function parsePostedAt(raw) {
  const hm = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) {
    const iso = `${today()}T${hm[1].padStart(2, '0')}:${hm[2]}:00+09:00`;
    // 자정 직후엔 어제 밤 글이 미래 시각이 된다 — 하루 물린다
    if (Date.parse(iso) > Date.now()) return new Date(Date.parse(iso) - 86400000).toISOString();
    return iso;
  }
  const d = toIso(raw);
  return d ? `${d}T00:00:00+09:00` : null;
}

export async function fetchItems() {
  const items = [];
  const seen = new Set();

  for (let page = 1; page <= PAGES; page++) {
    if (page > 1) await politeDelay();
    const html = await fetchText(page === 1 ? BASE : `${BASE}?page=${page}`);

    // 일반 글 행만 정확히 이 클래스다. 공지/베스트는 "table_body notice|best inside …"라
    // exact split에서 자동 배제된다(베스트 행은 다른 페이지 글의 중복 + 빈 id라 버려야 한다).
    for (const chunk of html.split('<tr class="table_body blocktarget">').slice(1)) {
      const row = chunk.split('</tr>')[0];   // 자기 행 밖(페이지네이션 등)으로 매치가 새지 않게
      const idM = row.match(/\/read\/(\d+)/);
      if (!idM) continue;
      const nativeId = idM[1];
      if (seen.has(nativeId)) continue;
      seen.add(nativeId);

      const subjM = row.match(/<a class="subject_link deco"[^>]*>([\s\S]*?)<\/a>/);
      if (!subjM) continue;
      // 앵커 안의 아이콘·댓글수 태그는 내용째 지운다 — clean()은 태그만 벗겨 " (5)"가 제목에 남는다
      const title = fixTruncatedTitle(
        clean(subjM[1].replace(/<i[\s\S]*?<\/i>|<span[^>]*class="num_reply"[\s\S]*?<\/span>/g, ' ')),
      );
      if (!title) continue;

      const votes = Number(clean(row.match(/<td class="recomd"[^>]*>([\s\S]*?)<\/td>/)?.[1] ?? '') || 0);

      items.push({
        nativeId,
        title,
        mall: null,   // "[쿠팡] ..." 형태로 제목에 들어있다 — parse-deal이 뽑는다
        url: `${BASE}/read/${nativeId}`,
        category: clean(row.match(/<td class="divsn[^"]*">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? '') || null,
        votes: Number.isFinite(votes) ? votes : null,   // 추천 0은 빈 td로 온다
        comments: Number(row.match(/class="num_reply"[^>]*>\s*\((\d+)\)/)?.[1] ?? 0),
        postedAt: parsePostedAt(clean(row.match(/<td class="time">([\s\S]*?)<\/td>/)?.[1] ?? '')),
      });
    }
  }
  return items;
}
