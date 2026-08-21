import crypto from "node:crypto";
import { DEAL_SOURCES, EVENT_SOURCES } from "../collector/registry.mjs";
import { DEALS_TTL_MINUTES, EVENTS_STALE_HOURS } from "./config";
import { judgeEvent } from "./filter-events";
import { runExclusive, withStoreLock } from "./lock";
import { mergeDeals, type IncomingDeal } from "./merge-deals";
import { mergeEvents, type NewEvent } from "./merge-events";
import { parseDealTitle } from "./parse-deal";
import {
  readDeals,
  readEvents,
  readPriceMemory,
  readStatus,
  writeDeals,
  writeEvents,
  writePriceMemory,
  writeStatus,
} from "./store";
import type {
  AdapterMeta,
  CollectResult,
  DealAdapter,
  EventAdapter,
  RefreshOutcome,
  Scope,
  SourceStatus,
} from "./types";

// 수집 파이프라인 — car-event daily-scan.mjs의 구조를 이식했다:
//   allSettled 병렬 수집(부분 실패 허용) → minRows 검사(반드시 '필터 전' 원시 행 수 기준!)
//   → 필터 → fingerprint 실행-내 병합 → 저장소 병합 → source-status 기록.
// 전 소스 실패는 네트워크 전면 불통 — 저장소를 건드리지 않는다.

/**
 * 제목 지문 — 같은 딜·이벤트가 여러 소스에 동시에 뜰 때 '한 실행 안에서' 병합하는 용도.
 * 영구 키로 쓰면 안 된다 — 제목이 수정되면 다른 건이 되고, 1기/2기를 한 건으로 뭉갠다.
 */
function fingerprint(title: string): string {
  const norm = title
    .replace(/\[[^\]]*\]|\([^)]*\)/g, "")
    .replace(/[^가-힣a-z0-9]/gi, "")
    .toLowerCase();
  return crypto.createHash("sha1").update(norm).digest("hex").slice(0, 12);
}

/**
 * priority가 낮은(원 커뮤니티) 쪽을 남긴다 — 댓글이 달리는 원글로 링크되게.
 * fp·priority는 병합 전용이라 결과에서 벗겨낸다 (저장소에 새면 안 된다).
 */
function dedupeByFp<T extends { fp: string; priority: number }>(items: T[]): Array<Omit<T, "fp" | "priority">> {
  const byFp = new Map<string, T>();
  for (const it of items) {
    const cur = byFp.get(it.fp);
    if (!cur || it.priority < cur.priority) byFp.set(it.fp, it);
  }
  return [...byFp.values()].map(({ fp, priority, ...rest }) => rest);
}

interface FetchOutcome<T> {
  statuses: SourceStatus[];
  collected: Array<{ meta: AdapterMeta; items: T[] }>;
  allFailed: boolean;
}

async function fetchAll<T>(
  sources: Array<{ meta: AdapterMeta; fetchItems(): Promise<T[]> }>,
  now: Date,
): Promise<FetchOutcome<T>> {
  const results = await Promise.allSettled(
    sources.map(async (mod) => {
      const raw = await mod.fetchItems();
      // 필터 후 0건은 완전히 정상이다. minRows를 필터 후에 걸면 매일 거짓 실패가 난다.
      if (raw.length < mod.meta.minRows) {
        throw new Error(`원시 ${raw.length}건 (최소 ${mod.meta.minRows}) — 페이지 구조 변경 의심`);
      }
      return raw;
    }),
  );

  const statuses: SourceStatus[] = [];
  const collected: Array<{ meta: AdapterMeta; items: T[] }> = [];
  const checkedAt = now.toISOString();

  for (let i = 0; i < sources.length; i++) {
    const { meta } = sources[i];
    const r = results[i];
    if (r.status === "rejected") {
      statuses.push({
        id: meta.id,
        label: meta.label,
        ok: false,
        optional: meta.optional,
        error: String((r.reason as Error)?.message ?? r.reason).slice(0, 300),
        checkedAt,
      });
    } else {
      statuses.push({
        id: meta.id,
        label: meta.label,
        ok: true,
        optional: meta.optional,
        rawCount: r.value.length,
        checkedAt,
      });
      collected.push({ meta, items: r.value });
    }
  }

  return { statuses, collected, allFailed: statuses.length > 0 && collected.length === 0 };
}

async function writeScopeStatus(scope: Scope, statuses: SourceStatus[]): Promise<void> {
  await withStoreLock("status", async () => {
    const file = await readStatus();
    file[scope] = statuses;
    await writeStatus(file);
  });
}

function summarize(
  scope: Scope,
  statuses: SourceStatus[],
  counts: { added: number; updated: number; pruned: number },
  allFailed: boolean,
): CollectResult {
  const failed = statuses.filter((s) => !s.ok);
  return {
    scope,
    ...counts,
    sourceOk: statuses.length - failed.length,
    sourceFailed: failed.length,
    failedLabels: failed.map((s) => s.label),
    ...(allFailed ? { allFailed: true } : {}),
  };
}

export async function collectEvents(): Promise<CollectResult> {
  const now = new Date();
  const { statuses, collected, allFailed } = await fetchAll(
    EVENT_SOURCES as unknown as EventAdapter[],
    now,
  );

  let counts = { added: 0, updated: 0, pruned: 0 };
  if (!allFailed) {
    const candidates: Array<NewEvent & { fp: string; priority: number }> = [];
    for (const { meta, items } of collected) {
      for (const raw of items) {
        const v = judgeEvent(raw.title, meta.kind);
        if (!v.keep) continue;
        candidates.push({
          key: `${meta.id}:${raw.nativeId}`,
          title: raw.title,
          url: raw.url,
          source: meta.id,
          sourceLabel: meta.label,
          org: raw.org ?? null,
          prizeType: v.prizeType,
          endDate: raw.endDate ?? null,
          postedAt: raw.postedAt ?? null,
          comments: raw.comments ?? null,
          fp: fingerprint(raw.title),
          priority: meta.priority,
        });
      }
    }
    const merged = dedupeByFp(candidates);

    const res = await withStoreLock("events", async () => {
      const store = await readEvents();
      const r = mergeEvents(store, merged, now);
      await writeEvents(store);
      return r;
    });
    counts = { ...res, updated: 0 };
  }

  await writeScopeStatus("events", statuses);
  return summarize("events", statuses, counts, allFailed);
}

export async function collectDeals(): Promise<CollectResult> {
  const now = new Date();
  const { statuses, collected, allFailed } = await fetchAll(
    DEAL_SOURCES as unknown as DealAdapter[],
    now,
  );

  let counts = { added: 0, updated: 0, pruned: 0 };
  if (!allFailed) {
    const candidates: Array<IncomingDeal & { fp: string; priority: number }> = [];
    for (const { meta, items } of collected) {
      for (const raw of items) {
        const parsed = parseDealTitle(raw.title);
        candidates.push({
          key: `${meta.id}:${raw.nativeId}`,
          title: parsed.cleanTitle,
          url: raw.url,
          source: meta.id,
          sourceLabel: meta.label,
          origin: raw.origin ?? null,
          mall: raw.mall ?? parsed.mall,
          category: raw.category ?? null,
          price: raw.price ?? parsed.price,
          priceRaw: raw.priceRaw ?? parsed.priceRaw,
          shipping: raw.shipping ?? parsed.shipping,
          votes: raw.votes ?? null,
          comments: raw.comments ?? null,
          postedAt: raw.postedAt ?? null,
          prevPrice: null,
          endedNow: raw.ended === true || parsed.ended,
          fp: fingerprint(raw.title),
          priority: meta.priority,
        });
      }
    }

    // "원래 얼마였다가 얼마" — 커뮤니티 글엔 정가가 없으므로 우리가 관측한 가격을 기억한다.
    // 같은 상품(fp)이 지난 딜에서 다른 가격이었으면 prevPrice로 붙인다.
    // 조회는 이번 실행 이전의 기억만 본다 (두 단계로 나눠 같은 실행 내 오염 방지).
    const memory = await readPriceMemory();
    for (const c of candidates) {
      if (c.price == null) continue;
      const known = memory.items[c.fp];
      if (known && known.price !== c.price) c.prevPrice = known.price;
    }
    const today = now.toISOString().slice(0, 10);
    for (const c of candidates) {
      if (c.price != null) memory.items[c.fp] = { price: c.price, date: today };
    }
    for (const [fp, m] of Object.entries(memory.items)) {
      if (now.getTime() - Date.parse(`${m.date}T00:00:00+09:00`) > 90 * 86_400_000) {
        delete memory.items[fp];
      }
    }

    const merged = dedupeByFp(candidates);

    const res = await withStoreLock("deals", async () => {
      const store = await readDeals();
      const r = mergeDeals(store, merged, now);
      await writeDeals(store);
      return r;
    });
    await writePriceMemory(memory);
    counts = res;
  }

  await writeScopeStatus("deals", statuses);
  return summarize("deals", statuses, counts, allFailed);
}

/**
 * TTL을 존중하는 갱신 진입점 — /api/refresh와 CLI가 이걸 부른다.
 * force면 TTL을 무시한다(수동 새로고침 버튼).
 */
export async function refreshScope(scope: Scope, force = false): Promise<RefreshOutcome> {
  if (!force) {
    const store = scope === "deals" ? await readDeals() : await readEvents();
    const ttlMinutes = scope === "deals" ? DEALS_TTL_MINUTES : EVENTS_STALE_HOURS * 60;
    if (store.updatedAt) {
      const ageMinutes = (Date.now() - Date.parse(store.updatedAt)) / 60_000;
      if (Number.isFinite(ageMinutes) && ageMinutes < ttlMinutes) {
        return { status: "fresh", ageMinutes: Math.floor(ageMinutes) };
      }
    }
  }

  const result = await runExclusive(scope, scope === "deals" ? collectDeals : collectEvents);
  if (result === null) return { status: "busy" };
  return { status: "done", result };
}
