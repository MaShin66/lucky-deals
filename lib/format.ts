// 표시용 포맷 순수함수 — 서버·클라이언트 공용.
// 시각 비교는 전부 페이지 렌더 시점의 now(ms)를 인자로 받는다.
// 클라이언트에서 Date.now()를 직접 부르면 hydration이 어긋난다.

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

export function relativeTime(iso: string | null, nowMs: number): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const diff = nowMs - t;
  if (diff < MIN) return "방금 전";
  if (diff < HOUR) return `${Math.floor(diff / MIN)}분 전`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}시간 전`;
  if (diff < 2 * DAY) return "어제";
  return `${Math.floor(diff / DAY)}일 전`;
}

/** KST 날짜 기준 D-day. 오늘 마감 0, 지났으면 음수. 파싱 불가·없음은 null. */
export function daysLeft(endDate: string | null, nowMs: number): number | null {
  if (!endDate) return null;
  const endMid = Date.parse(`${endDate}T00:00:00+09:00`);
  if (Number.isNaN(endMid)) return null;
  const kst = new Date(nowMs + 9 * HOUR);
  const todayMid = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - 9 * HOUR;
  return Math.round((endMid - todayMid) / DAY);
}

export function formatPrice(price: number | null, priceRaw: string | null): string | null {
  if (price !== null && price > 0) return `${price.toLocaleString("ko-KR")}원`;
  if (price === 0) return "무료";
  return priceRaw;
}

/**
 * prevPrice 대비 얼마나 변했는지 — "3,980원·23%↓"(인하) / "2,100원·21%↑"(인상).
 * 변동폭이 1% 미만이면 %는 생략하고 금액만. 비교 불가·변동 없음은 null.
 */
export function formatDiscount(
  price: number | null,
  prevPrice: number | null,
): { text: string; dir: "down" | "up" } | null {
  if (price == null || prevPrice == null || prevPrice <= 0 || price < 0 || price === prevPrice) return null;
  const diff = Math.abs(prevPrice - price);
  const pct = Math.round((diff / prevPrice) * 100);
  const arrow = price < prevPrice ? "↓" : "↑";
  return {
    text: pct > 0 ? `${diff.toLocaleString("ko-KR")}원·${pct}%${arrow}` : `${diff.toLocaleString("ko-KR")}원${arrow}`,
    dir: price < prevPrice ? "down" : "up",
  };
}

export function isNew(firstSeenAt: string, nowMs: number, hours: number): boolean {
  const t = Date.parse(firstSeenAt);
  return !Number.isNaN(t) && nowMs - t < hours * HOUR;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** ISO datetime → KST 달력 날짜 키 "YYYY-MM-DD" */
export function kstDateKey(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const kst = new Date(t + 9 * HOUR);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}`;
}

/** "YYYY-MM-DD" → "8/21 (금)" */
export function shortDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return `${m}/${d} (${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`;
}

/** "YYYY-MM-DD" → "오늘 · 8/21 (금)" 형태의 날짜 그룹 헤더 */
export function dateHeaderLabel(dateKey: string, nowMs: number): string {
  const base = shortDateLabel(dateKey);
  if (dateKey === kstDateKey(new Date(nowMs).toISOString())) return `오늘 · ${base}`;
  if (dateKey === kstDateKey(new Date(nowMs - 24 * HOUR).toISOString())) return `어제 · ${base}`;
  return base;
}

export const PRIZE_EMOJI: Record<string, string> = {
  모빌리티: "🚗",
  "가전·디지털": "📱",
  "상품권·기프티콘": "🎫",
  "포인트·페이": "💰",
  "여행·숙박": "✈️",
  "식품·뷰티": "🧴",
  기타: "🎁",
};

export const DEAL_CATEGORY_EMOJI: Record<string, string> = {
  "식품·건강": "🍜",
  "생활·주방": "🧻",
  "가전·디지털": "📱",
  "PC·하드웨어": "🖥️",
  게임: "🎮",
  "패션·뷰티": "👕",
  "상품권·쿠폰": "🎫",
  "취미·레저": "🎣",
  기타: "📦",
};
