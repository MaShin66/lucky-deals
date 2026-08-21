"use client";

import { useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
  placeholder: string;
}

export default function SearchBox({ value, onChange, resultCount, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" 로 바로 검색창에 커서를 둔다
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typingElsewhere =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
      if (event.key === "/" && !typingElsewhere) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="relative w-full sm:max-w-xs">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>

      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onChange("");
        }}
        placeholder={placeholder}
        aria-label="검색"
        className="w-full rounded-full bg-white/5 py-2 pl-10 pr-20 text-sm text-zinc-100 ring-1 ring-inset ring-white/10 transition placeholder:text-zinc-600 focus:bg-white/8 focus:ring-white/25 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />

      {value.length > 0 && (
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
          <span className="text-xs text-zinc-500">{resultCount}건</span>
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="검색어 지우기"
            className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/10 hover:text-zinc-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
