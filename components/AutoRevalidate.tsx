"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Scope } from "@/lib/types";

/**
 * stale-while-revalidate의 revalidate 쪽 —
 * 페이지는 저장된 데이터를 즉시 보여주고, 마운트 후 서버에 TTL 검사를 요청한다.
 * 서버가 실제로 다시 긁었을 때만 화면을 갱신한다. TTL 판단은 전부 서버에 있어서
 * 탭을 여러 번 열어도 중복 수집이 없다 (busy면 409 → 조용히 무시).
 */
export default function AutoRevalidate({ scope }: { scope: Scope }) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // StrictMode 이중 마운트 가드
    ran.current = true;

    let cancelled = false;
    void (async () => {
      try {
        setChecking(true);
        const response = await fetch("/api/refresh", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ scope }),
        });
        const data = (await response.json().catch(() => null)) as { refreshed?: boolean } | null;
        if (!cancelled && response.ok && data?.refreshed) router.refresh();
      } catch {
        // 자동 갱신 실패는 조용히 — 수동 새로고침 버튼이 있다
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scope, router]);

  if (!checking) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />새 항목 확인 중…
    </span>
  );
}
