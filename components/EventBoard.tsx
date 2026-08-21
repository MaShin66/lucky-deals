"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DateDivider from "./DateDivider";
import EventCard, { type EventRow } from "./EventCard";
import SearchBox from "./SearchBox";
import { PRIZE_EMOJI, dateHeaderLabel, daysLeft, kstDateKey, shortDateLabel } from "@/lib/format";
import { IS_STATIC, type LocalState, localKey, readLocalState, writeLocalPatch } from "@/lib/local-state";

const STATUS_TABS = [
  { id: "todo", label: "미응모" },
  { id: "entered", label: "응모완료" },
  { id: "hidden", label: "숨김" },
  { id: "all", label: "전체" },
] as const;
type StatusTab = (typeof STATUS_TABS)[number]["id"];

type Row = { type: "header"; id: string; label: string } | { type: "item"; item: EventRow };

export default function EventBoard({ items: rawItems, now }: { items: EventRow[]; now: number }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // 정적 배포엔 서버가 없다 — 응모완료·숨김을 localStorage에서 덧씌운다.
  // 하이드레이션 이후에 읽어야 서버 HTML과 어긋나지 않는다.
  const [local, setLocal] = useState<LocalState>({});
  useEffect(() => {
    if (IS_STATIC) setLocal(readLocalState());
  }, []);
  const items = useMemo(
    () => (IS_STATIC ? rawItems.map((it) => ({ ...it, ...local[localKey("events", it.key)] })) : rawItems),
    [rawItems, local],
  );
  const [statusTab, setStatusTab] = useState<StatusTab>("todo");
  const [prize, setPrize] = useState<string | null>(null);
  const [join, setJoin] = useState<string | null>(null);
  const [sort, setSort] = useState<"new" | "deadline">("deadline");
  const [q, setQ] = useState("");

  // 상태 필터까지 통과한 목록 (경품종류 칩의 분모).
  // 마감 지난 이벤트는 어느 뷰에서도 안 보여준다 — 응모할 수 없는 건 소음이다.
  const base = useMemo(() => {
    return items.filter((it) => {
      if (statusTab === "todo" && (it.entered || it.hidden)) return false;
      if (statusTab === "entered" && (!it.entered || it.hidden)) return false;
      if (statusTab === "hidden" && !it.hidden) return false;
      const d = daysLeft(it.endDate, now);
      if (d !== null && d < 0) return false;
      return true;
    });
  }, [items, statusTab, now]);

  const prizeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of base) counts.set(it.prizeType, (counts.get(it.prizeType) ?? 0) + 1);
    return counts;
  }, [base]);

  const joinCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of base) counts.set(it.joinType, (counts.get(it.joinType) ?? 0) + 1);
    return counts;
  }, [base]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = base.filter((it) => {
      if (prize && it.prizeType !== prize) return false;
      if (join && it.joinType !== join) return false;
      if (needle && !`${it.title} ${it.org ?? ""}`.toLowerCase().includes(needle)) return false;
      return true;
    });

    if (sort === "deadline") {
      list.sort((a, b) => {
        const da = daysLeft(a.endDate, now);
        const db = daysLeft(b.endDate, now);
        return (da ?? 9999) - (db ?? 9999);
      });
    } else {
      list.sort(
        (a, b) =>
          Date.parse(b.postedAt ?? b.firstSeenAt) - Date.parse(a.postedAt ?? a.firstSeenAt),
      );
    }
    return list;
  }, [base, prize, join, q, sort, now]);

  // 목록은 쭉 흐르되, 그룹이 바뀌는 지점마다 구분선을 끼운다.
  // 최신순 = 등록 날짜별, 마감임박순 = 마감일별.
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let last: string | null = null;
    for (const it of filtered) {
      const key =
        sort === "deadline"
          ? (it.endDate ?? "none")
          : (kstDateKey(it.postedAt ?? it.firstSeenAt) ?? "unknown");
      if (key !== last) {
        last = key;
        let label: string;
        if (sort === "deadline") {
          if (!it.endDate) label = "마감일 미상";
          else {
            const d = daysLeft(it.endDate, now);
            label = d === 0 ? `오늘 마감 · ${shortDateLabel(it.endDate)}` : `D-${d} · ${shortDateLabel(it.endDate)} 마감`;
          }
        } else {
          label = key === "unknown" ? "날짜 미상" : dateHeaderLabel(key, now);
        }
        out.push({ type: "header", id: `h-${key}`, label });
      }
      out.push({ type: "item", item: it });
    }
    return out;
  }, [filtered, sort, now]);

  async function patch(key: string, body: { entered?: string | null; hidden?: boolean }) {
    if (IS_STATIC) {
      setLocal(writeLocalPatch("events", key, body));
      return;
    }
    await fetch("/api/state", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope: "events", key, patch: body }),
    }).catch(() => {});
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-full bg-white/5 p-1 ring-1 ring-inset ring-white/10">
          {STATUS_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setStatusTab(t.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                statusTab === t.id ? "bg-white/15 text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setSort(sort === "new" ? "deadline" : "new")}
          className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-zinc-300 ring-1 ring-inset ring-white/10 transition hover:bg-white/10"
        >
          정렬: {sort === "new" ? "최신순" : "마감임박순"}
        </button>

        <div className="ml-auto">
          <SearchBox value={q} onChange={setQ} resultCount={filtered.length} placeholder="이벤트 검색 (/)" />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setPrize(null)}
          className={`rounded-full px-2.5 py-1 text-xs ring-1 ring-inset transition ${
            prize === null
              ? "bg-amber-500/20 text-amber-200 ring-amber-500/40"
              : "bg-white/5 text-zinc-400 ring-white/10 hover:text-zinc-200"
          }`}
        >
          전체 {base.length}
        </button>
        {[...prizeCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => (
            <button
              key={type}
              type="button"
              onClick={() => setPrize(prize === type ? null : type)}
              className={`rounded-full px-2.5 py-1 text-xs ring-1 ring-inset transition ${
                prize === type
                  ? "bg-amber-500/20 text-amber-200 ring-amber-500/40"
                  : "bg-white/5 text-zinc-400 ring-white/10 hover:text-zinc-200"
              }`}
            >
              {PRIZE_EMOJI[type]} {type} {count}
            </button>
          ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="pr-1 text-[11px] text-zinc-600">참여 방식</span>
        <button
          type="button"
          onClick={() => setJoin(null)}
          className={`rounded-full px-2.5 py-1 text-xs ring-1 ring-inset transition ${
            join === null
              ? "bg-violet-500/20 text-violet-200 ring-violet-500/40"
              : "bg-white/5 text-zinc-400 ring-white/10 hover:text-zinc-200"
          }`}
        >
          전체
        </button>
        {[...joinCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => (
            <button
              key={type}
              type="button"
              onClick={() => setJoin(join === type ? null : type)}
              className={`rounded-full px-2.5 py-1 text-xs ring-1 ring-inset transition ${
                join === type
                  ? "bg-violet-500/20 text-violet-200 ring-violet-500/40"
                  : "bg-white/5 text-zinc-400 ring-white/10 hover:text-zinc-200"
              }`}
            >
              {type} {count}
            </button>
          ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl bg-white/[0.03] px-4 py-10 text-center text-sm text-zinc-500 ring-1 ring-inset ring-white/5">
          표시할 이벤트가 없습니다
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((row) =>
            row.type === "header" ? (
              <DateDivider key={row.id} label={row.label} />
            ) : (
              <EventCard
                key={row.item.key}
                item={row.item}
                now={now}
                onToggleEntered={() =>
                  patch(row.item.key, {
                    entered: row.item.entered ? null : new Date(now).toISOString().slice(0, 10),
                  })
                }
                onToggleHidden={() => patch(row.item.key, { hidden: !row.item.hidden })}
              />
            ),
          )}
        </ul>
      )}
    </div>
  );
}
