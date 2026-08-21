// 한국 사이트의 제각각인 날짜 표기를 ISO(YYYY-MM-DD)로 통일한다.
//
// 마감일은 D-2 리마인드의 근거라서, 애매하면 억지로 파싱하지 말고 null을 돌려준다.
// 틀린 마감일은 없는 마감일보다 나쁘다 — 엉뚱한 날 "오늘 마감" 알림이 간다.

const pad = (n) => String(n).padStart(2, '0');

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 오늘부터 ISO 날짜까지 남은 일수. 오늘 마감이면 0, 지났으면 음수. 파싱 불가면 null. */
export function daysUntil(iso) {
  if (!iso) return null;
  const target = Date.parse(`${iso}T00:00:00+09:00`);
  if (Number.isNaN(target)) return null;
  const todayMid = Date.parse(`${today()}T00:00:00+09:00`);
  return Math.round((target - todayMid) / 86400000);
}

/**
 * 다양한 표기를 ISO로. 연도가 없으면 기준일(refIso, 기본 오늘)로 추정한다.
 *   "2026.08.23" "2026-08-23" "2026/08/23" "20260823" "2026년 8월 23일"
 *   "8/23" "08.23" "8월 23일"  → 연도 추정
 *   "20260823140000" (케이카 14자리) → 앞 8자리
 */
export function toIso(raw, refIso = today()) {
  if (!raw) return null;
  const s = String(raw).trim();

  let m = s.match(/^(\d{4})(\d{2})(\d{2})/);            // 20260823, 20260823140000
  if (m) return valid(m[1], m[2], m[3]);

  m = s.match(/(\d{4})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/);
  if (m) return valid(m[1], m[2], m[3]);

  m = s.match(/(?:^|[^\d])(\d{1,2})\s*[.\-/월]\s*(\d{1,2})(?:일|\s|$|[^\d])/);
  if (m) return withInferredYear(m[1], m[2], refIso);

  const t = Date.parse(s);                               // ISO datetime (먼슬러·폴스타)
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return null;
}

function valid(y, mo, d) {
  const Y = Number(y), M = Number(mo), D = Number(d);
  if (M < 1 || M > 12 || D < 1 || D > 31) return null;
  return `${Y}-${pad(M)}-${pad(D)}`;
}

// 연도 없는 "8/23"은 기준일 기준 가장 가까운 해로 본다. 12월에 "1/5"를 보면 내년이다.
function withInferredYear(mo, d, refIso) {
  const M = Number(mo), D = Number(d);
  if (M < 1 || M > 12 || D < 1 || D > 31) return null;
  const [ry, rm] = refIso.split('-').map(Number);
  let year = ry;
  if (rm >= 10 && M <= 3) year = ry + 1;
  else if (rm <= 3 && M >= 10) year = ry - 1;
  return `${year}-${pad(M)}-${pad(D)}`;
}

/**
 * "8/4 ~ 8/9", "2026.07.30 - 2026.08.31", "~08.23" 같은 기간 문자열에서 [시작, 종료].
 * 한쪽만 있으면 나머지는 null.
 */
export function parseRange(raw, refIso = today()) {
  if (!raw) return [null, null];
  const s = String(raw).replace(/\s+/g, ' ').trim();
  // 구분자로 맨 하이픈을 쓰면 "2026-08-03 ~ 2026-08-31"의 ISO 하이픈까지 잘려나간다.
  // 물결표 계열을 먼저 보고, 없을 때만 '공백으로 둘러싸인' 하이픈을 구분자로 인정한다.
  const sep = /~|–|—|부터|to\s/.test(s) ? /\s*(?:~|–|—|부터|to\s)\s*/ : / - /;
  const parts = s.split(sep).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const a = toIso(parts[0], refIso);
    const b = toIso(parts[1], a ?? refIso);
    return [a, b];
  }
  // "~08.23" 처럼 종료만 있는 형태
  if (/^\s*[~-]/.test(s)) return [null, toIso(s, refIso)];
  const one = toIso(s, refIso);
  return [one, null];
}

/** "D-5", "D-DAY", "마감" 같은 표기에서 남은 일수 → ISO 마감일. */
export function fromDday(raw, refIso = today()) {
  if (!raw) return null;
  const s = String(raw).toUpperCase();
  if (/D-?DAY|오늘\s*마감/.test(s)) return refIso;
  const m = s.match(/D\s*-\s*(\d+)/);
  if (!m) return null;
  const base = Date.parse(`${refIso}T00:00:00+09:00`) + Number(m[1]) * 86400000;
  const d = new Date(base);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
