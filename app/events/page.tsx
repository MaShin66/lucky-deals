import EventBoard from "@/components/EventBoard";
import RefreshButton from "@/components/RefreshButton";
import SourceStatusLine from "@/components/SourceStatusLine";
import { classifyJoinType } from "@/lib/filter-events";
import { IS_STATIC } from "@/lib/local-state";
import { readEvents, readStatus } from "@/lib/store";

// force-dynamic을 두지 않는다 — 리터럴만 허용돼서 정적 export와 양립할 수 없다.
// dev 서버는 매 요청 다시 렌더하므로 수집 결과가 바로 보이고, 정적 빌드는 스냅샷이 된다.

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
        {!IS_STATIC && <RefreshButton scope="events" />}
      </div>
      <EventBoard items={items} now={now} />
    </main>
  );
}
