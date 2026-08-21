import DealBoard from "@/components/DealBoard";
import RefreshButton from "@/components/RefreshButton";
import SourceStatusLine from "@/components/SourceStatusLine";
import { classifyDealCategory } from "@/lib/deal-category";
import { IS_STATIC } from "@/lib/local-state";
import { readDeals, readStatus } from "@/lib/store";

// force-dynamic을 두지 않는다 — 리터럴만 허용돼서 정적 export와 양립할 수 없다.
// dev 서버는 매 요청 다시 렌더하므로 수집 결과가 바로 보이고, 정적 빌드는 스냅샷이 된다.

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
        {!IS_STATIC && <RefreshButton scope="deals" />}
      </div>
      <DealBoard items={items} now={now} />
    </main>
  );
}
