import { NextResponse } from "next/server";
import { withStoreLock } from "@/lib/lock";
import { readDeals, readEvents, writeDeals, writeEvents } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  scope?: string;
  key?: string;
  patch?: { entered?: string | null; hidden?: boolean };
}

// 응모완료·숨기기 저장. updatedAt은 건드리지 않는다 —
// updatedAt은 '수집 신선도' 표시라 여기서 바꾸면 TTL 판단이 오염된다.
export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  const { scope, key, patch } = body ?? {};
  if ((scope !== "events" && scope !== "deals") || typeof key !== "string" || !patch || typeof patch !== "object") {
    return NextResponse.json({ ok: false, message: "형식: {scope, key, patch}" }, { status: 400 });
  }

  const applied = await withStoreLock(scope, async () => {
    if (scope === "events") {
      const store = await readEvents();
      const item = store.items[key];
      if (!item) return false;
      if ("entered" in patch) item.entered = patch.entered == null ? null : String(patch.entered);
      if ("hidden" in patch) item.hidden = Boolean(patch.hidden);
      await writeEvents(store);
      return true;
    }
    const store = await readDeals();
    const item = store.items[key];
    if (!item) return false;
    if ("hidden" in patch) item.hidden = Boolean(patch.hidden);
    await writeDeals(store);
    return true;
  });

  if (!applied) return NextResponse.json({ ok: false, message: "해당 항목이 없습니다." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
