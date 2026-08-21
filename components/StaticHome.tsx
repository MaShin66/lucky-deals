"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// 정적 배포에는 서버 redirect가 없다 — 클라이언트에서 이벤트 탭으로 보낸다.
export default function StaticHome() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/events");
  }, [router]);

  return (
    <p className="px-4 py-10 text-center text-sm text-zinc-500">
      <Link href="/events" className="underline hover:text-zinc-300">
        이벤트 추첨으로 이동
      </Link>
    </p>
  );
}
