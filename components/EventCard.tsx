"use client";

import { EVENT_NEW_HOURS } from "@/lib/config";
import { PRIZE_EMOJI, daysLeft, isNew, relativeTime } from "@/lib/format";
import type { EventItem, JoinType } from "@/lib/types";

export type EventRow = EventItem & { key: string; joinType: JoinType };

function DdayChip({ d }: { d: number | null }) {
  if (d === null) return null;
  if (d < 0) return <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-zinc-600">마감</span>;
  const style =
    d <= 2
      ? "bg-rose-500/15 text-rose-300 ring-rose-500/30"
      : d <= 7
        ? "bg-amber-500/15 text-amber-300 ring-amber-500/30"
        : "bg-white/5 text-zinc-400 ring-white/10";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${style}`}>
      {d === 0 ? "오늘 마감" : `D-${d}`}
    </span>
  );
}

export default function EventCard({
  item,
  now,
  onToggleEntered,
  onToggleHidden,
}: {
  item: EventRow;
  now: number;
  onToggleEntered: () => void;
  onToggleHidden: () => void;
}) {
  const d = daysLeft(item.endDate, now);
  const fresh = isNew(item.firstSeenAt, now, EVENT_NEW_HOURS);
  const dimmed = Boolean(item.entered) || item.hidden;

  return (
    <li
      className={`group flex items-center gap-3 rounded-xl bg-white/[0.04] px-3.5 py-2.5 ring-1 ring-inset ring-white/5 transition hover:bg-white/[0.07] ${
        dimmed ? "opacity-50" : ""
      }`}
    >
      <span className="shrink-0 text-lg" title={item.prizeType}>
        {PRIZE_EMOJI[item.prizeType] ?? "🎁"}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer noopener"
            className={`truncate text-sm font-medium text-zinc-100 hover:text-amber-200 hover:underline ${
              item.entered ? "line-through decoration-zinc-500" : ""
            }`}
          >
            {item.title}
          </a>
          {fresh && (
            <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
              NEW
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {item.sourceLabel}
          <> · <span className="text-violet-300/70">{item.joinType}</span></>
          {item.postedAt && <> · {relativeTime(item.postedAt, now)}</>}
          {item.comments != null && item.comments > 0 && <> · 💬 {item.comments}</>}
          {item.entered && <> · ✅ {item.entered} 응모함</>}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <DdayChip d={d} />
        <button
          type="button"
          onClick={onToggleEntered}
          title={item.entered ? "응모 완료 취소" : "응모 완료로 표시"}
          className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ring-1 ring-inset transition ${
            item.entered
              ? "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40"
              : "bg-white/5 text-zinc-500 ring-white/10 hover:text-emerald-300 sm:opacity-0 sm:group-hover:opacity-100"
          }`}
        >
          ✓
        </button>
        <button
          type="button"
          onClick={onToggleHidden}
          title={item.hidden ? "숨김 해제" : "숨기기"}
          className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ring-1 ring-inset transition ${
            item.hidden
              ? "bg-white/15 text-zinc-200 ring-white/20"
              : "bg-white/5 text-zinc-500 ring-white/10 hover:text-rose-300 sm:opacity-0 sm:group-hover:opacity-100"
          }`}
        >
          ✕
        </button>
      </div>
    </li>
  );
}
