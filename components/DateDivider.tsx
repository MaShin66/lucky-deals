/** 목록 중간에 끼우는 날짜 구분선 — 리스트는 쭉 흐르고 이게 단락만 나눈다 */
export default function DateDivider({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-3 pt-3 first:pt-0">
      <span className="shrink-0 text-xs font-semibold text-zinc-500">{label}</span>
      <span className="h-px flex-1 bg-white/5" />
    </li>
  );
}
