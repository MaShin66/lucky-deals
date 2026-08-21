import { NextResponse } from "next/server";
import { refreshScope } from "@/lib/collect";
import { enrichDealPrices } from "@/lib/enrich-prices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let scope = "deals";
  let force = false;
  try {
    const body = (await request.json()) as { scope?: string; force?: boolean };
    scope = body.scope ?? "deals";
    force = Boolean(body.force);
  } catch {
    // 본문 없는 호출은 deals 기본값으로
  }
  if (scope !== "deals" && scope !== "events") {
    return NextResponse.json({ ok: false, message: "scope는 events 또는 deals" }, { status: 400 });
  }

  try {
    const outcome = await refreshScope(scope, force);

    if (outcome.status === "busy") {
      return NextResponse.json(
        { ok: false, refreshed: false, message: "이미 수집이 진행 중입니다." },
        { status: 409 },
      );
    }
    if (outcome.status === "fresh") {
      return NextResponse.json({ ok: true, refreshed: false, ageMinutes: outcome.ageMinutes });
    }
    if (scope === "deals") {
      // 정가 조회는 느리다(딜당 fetch 2회) — 응답을 막지 않고 뒤에서 돌린다
      void enrichDealPrices().catch((e) => console.error("[enrich] 실패:", (e as Error).message));
    }
    return NextResponse.json({ ok: true, refreshed: true, ...outcome.result });
  } catch (error) {
    console.error("[api/refresh] 수집 실패:", error);
    return NextResponse.json(
      { ok: false, message: `수집에 실패했습니다: ${(error as Error).message}` },
      { status: 500 },
    );
  }
}
