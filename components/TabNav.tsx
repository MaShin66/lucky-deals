"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/events", label: "🎁 이벤트 추첨" },
  { href: "/deals", label: "🔥 핫딜" },
] as const;

export default function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 rounded-full bg-white/5 p-1 ring-1 ring-inset ring-white/10">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              active ? "bg-white/15 text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
