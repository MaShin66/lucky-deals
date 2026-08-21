import cron from "node-cron";
import { collectEvents } from "./collect";
import { EVENTS_CRON, EVENTS_STALE_HOURS, TIMEZONE } from "./config";
import { runExclusive } from "./lock";
import { readEvents } from "./store";

// 이벤트만 cron으로 하루 1회 — 핫딜은 페이지 접근 시 TTL 검사가 담당한다.

const g = globalThis as typeof globalThis & { __luckySchedulerStarted?: boolean };

export function startScheduler(): void {
  if (g.__luckySchedulerStarted) return;
  g.__luckySchedulerStarted = true;

  cron.schedule(
    EVENTS_CRON,
    () => {
      console.log("[scheduler] 이벤트 예약 수집 실행");
      void runExclusive("events", collectEvents).catch((error) => {
        console.error("[scheduler] 예약 수집 실패:", (error as Error).message);
      });
    },
    { timezone: TIMEZONE, noOverlap: true },
  );
  console.log(`[scheduler] 이벤트 수집 예약됨: ${EVENTS_CRON} (${TIMEZONE})`);

  // 예약 시간에 서버가 꺼져 있었을 수 있으니 시작할 때 한 번 확인한다
  void (async () => {
    try {
      const { updatedAt, items } = await readEvents();
      const ageHours = updatedAt ? (Date.now() - Date.parse(updatedAt)) / 36e5 : Infinity;
      const stale = Object.keys(items).length === 0 || !Number.isFinite(ageHours) || ageHours >= EVENTS_STALE_HOURS;
      if (stale) {
        console.log(`[scheduler] 이벤트 데이터가 ${EVENTS_STALE_HOURS}시간 이상 낡음 — 지금 수집합니다`);
        await runExclusive("events", collectEvents);
      } else {
        console.log("[scheduler] 이벤트 데이터가 최신이라 시작 시 수집을 건너뜁니다");
      }
    } catch (error) {
      console.error("[scheduler] 시작 시 수집 실패:", (error as Error).message);
    }
  })();
}
