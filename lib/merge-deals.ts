import { DEAL_KEEP_DAYS } from "./config";
import type { DealItem, DealsStore } from "./types";

// 핫딜은 원장이 아니라 3일 롤링 상태다 (car-listing ledger.mjs의 축소판).
//   신규 → firstSeenAt 기록
//   기존 → 가변 필드(votes·comments·제목·가격·ended) 갱신, firstSeenAt·hidden 보존
//   소멸 → 아무 의미 없음. 수집이 1~2페이지만 보므로 "리스트에서 사라짐 = 종료"로
//          판정하면 밀려난 정상 딜을 종료로 오판한다. 소멸은 아래 prune으로만 처리.
//   실패한 소스의 항목은 incoming에 없어 건드리지 않는다 (okSources 보호와 등가).

export interface IncomingDeal extends Omit<DealItem, "firstSeenAt" | "lastSeenAt" | "ended" | "hidden"> {
  key: string;
  /** 이번 수집에서 본 종료 신호 (제목 마커·퀘이사존 label) */
  endedNow: boolean;
}

const DAY = 86_400_000;

export function mergeDeals(
  store: DealsStore,
  incoming: IncomingDeal[],
  now: Date,
): { added: number; updated: number; pruned: number } {
  const nowIso = now.toISOString();
  let added = 0;
  let updated = 0;

  for (const it of incoming) {
    const { key, endedNow, ...rest } = it;
    const cur = store.items[key];
    if (!cur) {
      store.items[key] = {
        ...rest,
        firstSeenAt: nowIso,
        lastSeenAt: nowIso,
        ended: endedNow ? nowIso : null,
        hidden: false,
      };
      added++;
    } else {
      // 같은 딜의 제목이 수정돼 가격이 바뀐 경우가 가장 확실한 "원래 가격"이다.
      // 아니면 이미 알던 prevPrice를 유지하고, 그것도 없으면 fp 기억에서 온 값을 쓴다.
      const priceChanged = rest.price != null && cur.price != null && rest.price !== cur.price;
      store.items[key] = {
        ...cur,
        ...rest,
        prevPrice: priceChanged ? cur.price : (cur.prevPrice ?? rest.prevPrice ?? null),
        firstSeenAt: cur.firstSeenAt,
        lastSeenAt: nowIso,
        // 종료는 한 방향 — 처음 확정된 시각을 유지한다
        ended: cur.ended ?? (endedNow ? nowIso : null),
        hidden: cur.hidden,
      };
      updated++;
    }
  }

  let pruned = 0;
  for (const [k, v] of Object.entries(store.items)) {
    if (now.getTime() - Date.parse(v.lastSeenAt) > DEAL_KEEP_DAYS * DAY) {
      delete store.items[k];
      pruned++;
    }
  }

  store.updatedAt = nowIso;
  return { added, updated, pruned };
}
