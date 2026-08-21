import type { SourceStatus } from "@/lib/types";
import { relativeTime } from "@/lib/format";

/** 툴바 아래 한 줄 — 소스별 성공/실패와 마지막 갱신 시각 */
export default function SourceStatusLine({
  statuses,
  updatedAt,
  now,
}: {
  statuses: SourceStatus[];
  updatedAt: string;
  now: number;
}) {
  if (statuses.length === 0 && !updatedAt) return null;

  return (
    <p className="text-xs text-zinc-600">
      {statuses.map((s, i) => (
        <span key={s.id}>
          {i > 0 && " · "}
        <span className={s.ok ? "" : "text-amber-500/80"}>
            {s.label} {s.ok ? (s.rawCount ?? "") : "⚠️"}
          </span>
        </span>
      ))}
      {updatedAt && (
        <span className="text-zinc-700"> — {relativeTime(updatedAt, now) ?? ""} 갱신</span>
      )}
    </p>
  );
}
