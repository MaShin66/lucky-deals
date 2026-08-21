"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 이벤트/핫딜은 이 사이트의 최상위 2개 메뉴 — 한눈에 인지되게 크게 그린다.
const TABS = [
  {
    href: "/events",
    emoji: "🎁",
    label: "이벤트 추첨",
    active: "bg-amber-500/15 text-amber-200 ring-amber-400/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
  },
  {
    href: "/deals",
    emoji: "🔥",
    label: "핫딜",
    active: "bg-rose-500/15 text-rose-200 ring-rose-400/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
  },
] as const;

export default function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="grid grid-cols-2 gap-2 sm:gap-3">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center justify-center gap-2 rounded-2xl py-3.5 text-lg font-bold ring-1 ring-inset transition sm:py-4 sm:text-xl ${
              active
                ? tab.active
                : "bg-white/[0.04] text-zinc-500 ring-white/10 hover:bg-white/[0.08] hover:text-zinc-300"
            }`}
          >
            <span className="text-xl sm:text-2xl">{tab.emoji}</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
