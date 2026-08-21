// HTTP 수집 공통. 로그인이 필요한 소스가 하나도 없어서 쿠키·세션 처리는 없다.
//
// 봇차단 사이트를 우회하지 않는다 — 지문 위조나 스텔스 플러그인은 쓰지 않는다.
// 정상 UA를 밝히고, 막히면 그 소스는 실패로 처리한다.
//
// 다만 '차단'으로 보이는 것 중 상당수는 차단이 아니었다(2026-08-19 재확인):
//   - 벤츠·BMW는 curl로 HTTP/2 스트림이 끊긴다. 여기 fetch(undici)는 HTTP/1.1로 붙어
//     그냥 200이 온다. 우회가 아니라 프로토콜 차이다.
//   - 테슬라는 HTML만 Akamai가 막고, 그 페이지가 쓰는 공개 JSON API는 그대로 열린다.
//     정식 데이터원을 부르는 것이라 우회가 아니다.
// 실제로 남은 차단은 헤드리스 브라우저로 HTML을 긁어야 하는 경우뿐이고, 그건 안 한다.
//
// EUC-KR(뽐뿌·엔카)은 추가 의존성 없이 처리된다. 이 맥의 Node가 full ICU라
// TextDecoder('euc-kr')가 네이티브로 동작한다. 'cp949' 별칭은 지원하지 않으니 쓰지 말 것.

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export class SourceError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.code = code;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {string} url
 * @param {object} opts
 *   method    'GET' | 'POST'
 *   body      객체면 JSON으로 직렬화된다
 *   headers   추가 헤더
 *   encoding  'utf-8'(기본) | 'euc-kr'
 *   timeout   ms (기본 20000)
 *   retries   재시도 횟수 (기본 2)
 * @returns {Promise<string>} 본문 텍스트
 */
export async function fetchText(url, opts = {}) {
  const { method = 'GET', body, headers = {}, encoding = 'utf-8', timeout = 20000, retries = 2 } = opts;

  const init = {
    method,
    headers: {
      'user-agent': UA,
      'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      ...headers,
    },
    redirect: 'follow',
  };
  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
    init.headers['content-type'] ??= 'application/json';
  }

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt) await sleep(800 * attempt);
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeout) });
      if (!res.ok) {
        // 4xx는 재시도해도 같다. 5xx·429만 다시 시도한다.
        const retriable = res.status >= 500 || res.status === 429;
        lastErr = new SourceError('SCRAPE_FAILED', `HTTP ${res.status} ${url}`);
        if (!retriable) throw lastErr;
        continue;
      }
      const buf = await res.arrayBuffer();
      return new TextDecoder(encoding).decode(buf);
    } catch (e) {
      lastErr = e instanceof SourceError ? e : new SourceError('SCRAPE_FAILED', `${e.name}: ${e.message} (${url})`);
      if (e instanceof SourceError && !/HTTP (5\d\d|429)/.test(e.message)) throw e;
    }
  }
  throw lastErr;
}

/** JSON을 기대하는 요청. 유효한 JSON 뒤에 잡다한 바이트가 붙어 와도 앞쪽 값만 파싱한다. */
export async function fetchJson(url, opts = {}) {
  const text = await fetchText(url, {
    ...opts,
    headers: { accept: 'application/json, text/plain, */*', ...(opts.headers ?? {}) },
  });
  try {
    return JSON.parse(text);
  } catch {
    const cut = balancedPrefix(text);
    if (cut) {
      try { return JSON.parse(cut); } catch { /* 아래에서 실패로 처리 */ }
    }
    throw new SourceError('SCRAPE_FAILED', `JSON 파싱 실패 (${url})`);
  }
}

/** 문자열 앞부분에서 괄호가 균형 잡힌 첫 JSON 값만 잘라낸다. */
function balancedPrefix(s) {
  const start = s.search(/[[{]/);
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

/** HTML 엔티티와 공백을 정리한 순수 텍스트. */
export function clean(s) {
  if (!s) return '';
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

/** 소스 사이에 짧은 간격을 둔다. 하루 1회 실행이라 부하는 없지만 예의는 지킨다. */
export const politeDelay = () => sleep(300 + Math.floor(Math.random() * 400));
