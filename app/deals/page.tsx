import DealBoard from "@/components/DealBoard";
import RefreshButton from "@/components/RefreshButton";
import SourceStatusLine from "@/components/SourceStatusLine";
import { classifyDealCategory } from "@/lib/deal-category";
import { readDeals, readStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const [store, status] = await Promise.all([readDeals(), readStatus()]);
  const now = Date.now();
  const items = Object.entries(store.items).map(([key, item]) => ({
    key,
    ...item,
    // 저장하지 않고 읽을 때마다 유도 — 분류 규칙 수정이 기존 항목에도 소급된다 (joinType과 동일)
    dealCategory: classifyDealCategory(item.category, item.title, item.mall),
  }));

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SourceStatusLine statuses={status.deals} updatedAt={store.updatedAt} now={now} />
        <RefreshButton scope="deals" />
      </div>
      <DealBoard items={items} now={now} />
    </main>
  );
}
