"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Scope } from "@/lib/types";

interface RefreshResponse {
  ok: boolean;
  refreshed?: boolean;
  message?: string;
  added?: number;
  updated?: number;
  sourceFailed?: number;
  failedLabels?: string[];
  allFailed?: boolean;
}

export default function RefreshButton({ scope }: { scope: Scope }) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isRefreshingView, startTransition] = useTransition();

  const busy = isRunning || isRefreshingView;

  async function handleClick() {
    if (busy) return;

    setIsRunning(true);
    setStatus("수집 중…");

    try {
      const response = await fetch("/api/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scope, force: true }),
      });
      const data = (await response.json()) as RefreshResponse;

      if (!response.ok) {
        setStatus(data.message ?? "새로고침에 실패했습니다.");
        return;
      }

      if (data.allFailed) {
        setStatus("전 소스 수집 실패 — 네트워크를 확인하세요");
      } else {
        const parts = [`신규 ${data.added ?? 0}건`];
        if (data.updated) parts.push(`갱신 ${data.updated}건`);
        if (data.failedLabels?.length) parts.push(`⚠️ ${data.failedLabels.join("·")} 실패`);
        setStatus(parts.join(" · "));
      }

      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(`실패: ${(error as Error).message}`);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {status && <span className="hidden text-xs text-zinc-500 sm:inline">{status}</span>}
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-medium text-zinc-100 ring-1 ring-inset ring-white/15 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={`h-4 w-4 ${busy ? "animate-spin" : ""}`}
          aria-hidden
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
        {busy ? "수집 중…" : "새로고침"}
      </button>
    </div>
  );
}
