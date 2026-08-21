import EventBoard from "@/components/EventBoard";
import RefreshButton from "@/components/RefreshButton";
import SourceStatusLine from "@/components/SourceStatusLine";
import { classifyJoinType } from "@/lib/filter-events";
import { readEvents, readStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const [store, status] = await Promise.all([readEvents(), readStatus()]);
  const now = Date.now();
  const items = Object.entries(store.items).map(([key, item]) => ({
    key,
    ...item,
    joinType: classifyJoinType(item.title),
  }));

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SourceStatusLine statuses={status.events} updatedAt={store.updatedAt} now={now} />
        <RefreshButton scope="events" />
      </div>
      <EventBoard items={items} now={now} />
    </main>
  );
}
