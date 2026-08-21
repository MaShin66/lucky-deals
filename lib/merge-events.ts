import { EVENT_PRUNE_END_DAYS, EVENT_PRUNE_SEEN_DAYS } from "./config";
import type { EventItem, EventsStore } from "./types";

// 이벤트 원장은 write-once — 이미 있으면 안 건드린다 (seen.mjs의 remember 의미론).
// 그래서 entered(응모완료)·hidden(숨김)이 수집에 밟히지 않는 건 공짜로 따라온다.
// 실패한 소스의 항목은 애초에 incoming에 없으므로 자연히 보호된다.

export interface NewEvent extends Omit<EventItem, "firstSeenAt" | "entered" | "hidden"> {
  key: string;
}

const DAY = 86_400_000;

export function mergeEvents(
  store: EventsStore,
  incoming: NewEvent[],
  now: Date,
): { added: number; pruned: number } {
  const nowIso = now.toISOString();
  let added = 0;

  for (const it of incoming) {
    if (store.items[it.key]) continue;
    const { key, ...rest } = it;
    store.items[key] = { ...rest, firstSeenAt: nowIso, entered: null, hidden: false };
    added++;
  }

  // prune: 마감이 30일 넘게 지났고 '그리고' 처음 본 지도 90일 넘은 것만.
  // 안 하면 커뮤니티 게시판 특성상 연 수천 건씩 쌓인다.
  let pruned = 0;
  for (const [k, v] of Object.entries(store.items)) {
    const endGone = v.endDate
      ? now.getTime() - Date.parse(`${v.endDate}T00:00:00+09:00`) > EVENT_PRUNE_END_DAYS * DAY
      : true;
    const seenGone = now.getTime() - Date.parse(v.firstSeenAt) > EVENT_PRUNE_SEEN_DAYS * DAY;
    if (endGone && seenGone) {
      delete store.items[k];
      pruned++;
    }
  }

  store.updatedAt = nowIso;
  return { added, pruned };
}
