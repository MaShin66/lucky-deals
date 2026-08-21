"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DateDivider from "./DateDivider";
import DealCard, { type DealRow } from "./DealCard";
import SearchBox from "./SearchBox";
import { DEAL_CATEGORY_EMOJI, dateHeaderLabel, kstDateKey } from "@/lib/format";

type Row = { type: "header"; id: string; label: string } | { type: "item"; item: DealRow };

export default function DealBoard({ items, now }: { items: DealRow[]; now: number }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [source, setSource] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<"new" | "votes">("new");
  const [includeEnded, setIncludeEnded] = useState(false);
  const [includeHidden, setIncludeHidden] = useState(false);
  const [q, setQ] = useState("");

  const sourceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of items) counts.set(it.sourceLabel, (counts.get(it.sourceLabel) ?? 0) + 1);
    return counts;
  }, [items]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of items) counts.set(it.dealCategory, (counts.get(it.dealCategory) ?? 0) + 1);
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = items.filter((it) => {
      if (!includeHidden && it.hidden) return false;
      if (!includeEnded && it.ended) return false;
      if (source && it.sourceLabel !== source) return false;
      if (category && it.dealCategory !== category) return false;
      if (needle && !`${it.title} ${it.mall ?? ""} ${it.origin ?? ""}`.toLowerCase().includes(needle)) return false;
      return true;
    });

    if (sort === "votes") {
      list.sort(
        (a, b) =>
          (b.votes ?? -1) - (a.votes ?? -1) ||
          Date.parse(b.postedAt ?? b.firstSeenAt) - Date.parse(a.postedAt ?? a.firstSeenAt),
      );
    } else {
      list.sort(
        (a, b) =>
          Date.parse(b.postedAt ?? b.firstSeenAt) - Date.parse(a.postedAt ?? a.firstSeenAt),
      );
    }
    return list;
  }, [items, source, category, sort, includeEnded, includeHidden, q]);

  // 최신순일 때만 날짜 구분선 — 추천순은 날짜가 뒤섞여 의미가 없다
  const rows = useMemo<Row[]>(() => {
    if (sort !== "new") return filtered.map((item) => ({ type: "item", item }));
    const out: Row[] = [];
    let last: string | null = null;
    for (const it of filtered) {
      const key = kstDateKey(it.postedAt ?? it.firstSeenAt) ?? "unknown";
      if (key !== last) {
        last = key;
        out.push({
          type: "header",
          id: `h-${key}`,
          label: key === "unknown" ? "날짜 미상" : dateHeaderLabel(key, now),
        });
      }
      out.push({ type: "item", item: it });
    }
    return out;
  }, [filtered, sort, now]);

  async function toggleHidden(key: string, hidden: boolean) {
    await fetch("/api/state", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope: "deals", key, patch: { hidden } }),
    }).catch(() => {});
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSource(null)}
            className={`rounded-full px-2.5 py-1 text-xs ring-1 ring-inset transition ${
              source === null
                ? "bg-rose-500/20 text-rose-200 ring-rose-500/40"
                : "bg-white/5 text-zinc-400 ring-white/10 hover:text-zinc-200"
            }`}
          >
            전체 {items.length}
          </button>
          {[...sourceCounts.entries()].map(([label, count]) => (
            <button
              key={label}
              type="button"
              onClick={() => setSource(source === label ? null : label)}
              className={`rounded-full px-2.5 py-1 text-xs ring-1 ring-inset transition ${
                source === label
                  ? "bg-rose-500/20 text-rose-200 ring-rose-500/40"
                  : "bg-white/5 text-zinc-400 ring-white/10 hover:text-zinc-200"
              }`}
            >
              {label} {count}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setSort(sort === "new" ? "votes" : "new")}
          className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-zinc-300 ring-1 ring-inset ring-white/10 transition hover:bg-white/10"
        >
          정렬: {sort === "new" ? "최신순" : "추천순"}
        </button>

        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={includeEnded}
            onChange={(e) => setIncludeEnded(e.target.checked)}
            className="h-3.5 w-3.5 accent-rose-500"
          />
          종료 포함
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={includeHidden}
            onChange={(e) => setIncludeHidden(e.target.checked)}
            className="h-3.5 w-3.5 accent-rose-500"
          />
          숨김 포함
        </label>

        <div className="ml-auto">
          <SearchBox value={q} onChange={setQ} resultCount={filtered.length} placeholder="딜 검색 (/)" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="pr-1 text-[11px] text-zinc-600">종류</span>
        <button
          type="button"
          onClick={() => setCategory(null)}
          className={`rounded-full px-2.5 py-1 text-xs ring-1 ring-inset transition ${
            category === null
              ? "bg-amber-500/20 text-amber-200 ring-amber-500/40"
              : "bg-white/5 text-zinc-400 ring-white/10 hover:text-zinc-200"
          }`}
        >
          전체
        </button>
        {[...categoryCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => (
            <button
              key={type}
              type="button"
              onClick={() => setCategory(category === type ? null : type)}
              className={`rounded-full px-2.5 py-1 text-xs ring-1 ring-inset transition ${
                category === type
                  ? "bg-amber-500/20 text-amber-200 ring-amber-500/40"
                  : "bg-white/5 text-zinc-400 ring-white/10 hover:text-zinc-200"
              }`}
            >
              {DEAL_CATEGORY_EMOJI[type]} {type} {count}
            </button>
          ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl bg-white/[0.03] px-4 py-10 text-center text-sm text-zinc-500 ring-1 ring-inset ring-white/5">
          표시할 딜이 없습니다
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((row) =>
            row.type === "header" ? (
              <DateDivider key={row.id} label={row.label} />
            ) : (
              <DealCard
                key={row.item.key}
                item={row.item}
                now={now}
                onToggleHidden={() => toggleHidden(row.item.key, !row.item.hidden)}
              />
            ),
          )}
        </ul>
      )}
    </div>
  );
}
