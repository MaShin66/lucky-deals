import AutoRevalidate from "@/components/AutoRevalidate";
import DealBoard from "@/components/DealBoard";
import RefreshButton from "@/components/RefreshButton";
import SourceStatusLine from "@/components/SourceStatusLine";
import { readDeals, readStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const [store, status] = await Promise.all([readDeals(), readStatus()]);
  const now = Date.now();
  const items = Object.entries(store.items).map(([key, item]) => ({ key, ...item }));

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SourceStatusLine statuses={status.deals} updatedAt={store.updatedAt} now={now} />
          <AutoRevalidate scope="deals" />
        </div>
        <RefreshButton scope="deals" />
      </div>
      <DealBoard items={items} now={now} />
    </main>
  );
}
