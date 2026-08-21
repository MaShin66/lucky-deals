"use client";

import { DEAL_NEW_HOURS } from "@/lib/config";
import { formatDiscount, formatPrice, isNew, relativeTime } from "@/lib/format";
import type { DealItem } from "@/lib/types";

export type DealRow = DealItem & { key: string };

export default function DealCard({
  item,
  now,
  onToggleHidden,
}: {
  item: DealRow;
  now: number;
  onToggleHidden: () => void;
}) {
  const fresh = !item.ended && isNew(item.firstSeenAt, now, DEAL_NEW_HOURS);
  const price = formatPrice(item.price, item.priceRaw);
  const discount = formatDiscount(item.price, item.prevPrice);
  const badge = item.mall ?? item.origin;

  return (
    <li
      className={`group flex items-center gap-3 rounded-xl bg-white/[0.04] px-3.5 py-2.5 ring-1 ring-inset ring-white/5 transition hover:bg-white/[0.07] ${
        item.ended || item.hidden ? "opacity-40" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {badge && (
            <span className="shrink-0 rounded bg-sky-500/10 px-1.5 py-0.5 text-[11px] font-medium text-sky-300 ring-1 ring-inset ring-sky-500/20">
              {badge}
            </span>
          )}
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer noopener"
            className={`truncate text-sm font-medium text-zinc-100 hover:text-rose-200 hover:underline ${
              item.ended ? "line-through decoration-zinc-500" : ""
            }`}
          >
            {item.title}
          </a>
          {fresh && (
            <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
              NEW
            </span>
          )}
          {item.ended && (
            <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400">
              종료
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {discount && (
            <span className="mr-1 text-zinc-600 line-through">
              {item.prevPrice!.toLocaleString("ko-KR")}원
            </span>
          )}
          {price && <span className="font-semibold text-amber-300">{price}</span>}
          {discount && (
            <span
              className={`ml-1 font-semibold ${discount.dir === "down" ? "text-rose-400" : "text-zinc-500"}`}
            >
              {discount.text}
            </span>
          )}
          {item.shipping && <> · 배송 {item.shipping}</>}
          {item.category && <> · {item.category}</>}
          <> · {item.sourceLabel}</>
          {item.origin && item.sourceLabel !== item.origin && <>({item.origin})</>}
          {(item.postedAt || item.firstSeenAt) && (
            <> · {relativeTime(item.postedAt ?? item.firstSeenAt, now)}</>
          )}
          {item.votes != null && item.votes > 0 && <> · 👍 {item.votes}</>}
          {item.comments != null && item.comments > 0 && <> · 💬 {item.comments}</>}
        </p>
      </div>

      <button
        type="button"
        onClick={onToggleHidden}
        title={item.hidden ? "숨김 해제" : "숨기기"}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ring-1 ring-inset transition ${
          item.hidden
            ? "bg-white/15 text-zinc-200 ring-white/20"
            : "bg-white/5 text-zinc-500 ring-white/10 hover:text-rose-300 sm:opacity-0 sm:group-hover:opacity-100"
        }`}
      >
        ✕
      </button>
    </li>
  );
}
