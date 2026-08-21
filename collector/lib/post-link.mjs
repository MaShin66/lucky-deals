// 딜 게시글 페이지에서 아웃바운드 상품(쇼핑몰) 링크를 풀어낸다 — 소스별 추출기.
// 목록에는 상품 링크가 없어서 글 본문을 한 번 열어야 한다 (enrich 예산으로 횟수 제한).
//
// 2026-08-21 실측: 세 소스 모두 래퍼가 로컬 디코드로 풀린다 — 추가 HTTP 요청 불필요.
//   뽐뿌     s.ppomppu.co.kr?…&target=<base64>   ← href에 따옴표가 없다! ["']? 필수
//   루리웹   web.ruliweb.com/link.php?ol=<URL인코딩> ← div.source_url 안만 (본문 위 광고 앵커 배제)
//   퀘이사존 goToLink('<base64>')                 ← 페이지 유일 (푸터 스폰서 앵커 150+는 자동 배제)
//   알구몬   enc=v1.<암호문> — 복호화 불가·3xx도 아님(200/Location null) → 미지원
// 추출 실패는 전부 null — 억지 추측 금지.

import { clean, fetchText } from './fetch.mjs';

/** 절대 URL만 통과시키는 정규화 (엔티티·공백 정리 포함) */
function normalize(raw) {
  if (!raw) return null;
  const s = clean(raw).replace(/&amp;/g, '&');
  if (!/^https?:\/\//i.test(s)) return null;
  try {
    const u = new URL(s);
    if (!u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function fromBase64(b64) {
  try {
    return Buffer.from(b64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

/** 게시글 HTML → 쇼핑몰 상품 URL. 순수 함수 — 회귀 케이스는 scripts/test-enrich.ts */
export function extractProductUrl(source, html) {
  if (source === 'ppomppu-deal') {
    // 제휴 딜은 class="topTitle-link partner"가 되므로 prefix 매칭
    const b64 = html.match(
      /class="topTitle-link[^"]*"[\s\S]{0,300}?href=["']?https?:\/\/s\.ppomppu\.co\.kr[^"'\s>]*?[?&]target=([A-Za-z0-9+/=_-]+)/,
    )?.[1];
    const decoded = b64 ? normalize(fromBase64(b64)) : null;
    if (decoded) return decoded;
    // 폴백: 본문 상품 미리보기 컨테이너에 래퍼 없는 원 URL이 있다
    return normalize(html.match(/id='div_together_goods-container'[^>]*data-url='([^']+)'/)?.[1] ?? null);
  }

  if (source === 'ruliweb') {
    const enc = html.match(
      /<div class="source_url[^"]*"[\s\S]{0,400}?href="https?:\/\/(?:web|bbs|m)\.ruliweb\.com\/link\.php\?ol=([^"&]+)/,
    )?.[1];
    if (!enc) return null;
    try {
      return normalize(decodeURIComponent(enc));
    } catch {
      return null;
    }
  }

  if (source === 'quasarzone') {
    const b64 = html.match(/href="javascript:goToLink\('([A-Za-z0-9+/=]+)'\)/)?.[1];
    return b64 ? normalize(fromBase64(b64)) : null;
  }

  return null;
}

// 소스별 게시글 인코딩 (뽐뿌만 euc-kr)
const FETCH_OPTS = { 'ppomppu-deal': { encoding: 'euc-kr' } };
const SUPPORTED = new Set(['ppomppu-deal', 'ruliweb', 'quasarzone']);

export function canResolve(source) {
  return SUPPORTED.has(source);
}

/** 게시글 URL → 쇼핑몰 상품 URL (미지원 소스·실패는 null) */
export async function resolveProductUrl(source, postUrl) {
  if (!canResolve(source)) return null;
  try {
    const html = await fetchText(postUrl, FETCH_OPTS[source]);
    return extractProductUrl(source, html);
  } catch {
    return null;
  }
}
