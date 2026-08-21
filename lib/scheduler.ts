import cron from "node-cron";
import { collectDeals, collectEvents } from "./collect";
import { DEALS_CRON, DEALS_STALE_HOURS, EVENTS_CRON, EVENTS_STALE_HOURS, TIMEZONE } from "./config";
import { enrichDealPrices } from "./enrich-prices";
import { runExclusive } from "./lock";
import { readDeals, readEvents } from "./store";

// 두 탭 다 하루 1회 cron + 부팅 보충 (이벤트 08:00, 핫딜 00:00).
// 핫딜의 페이지 접근 자동 수집(AutoRevalidate)은 2026-08-21 제거 —
// 수집 트리거는 cron·부팅 보충·수동 새로고침 버튼(force) 셋뿐이다.
// 로컬 서버라 예약 시각에 꺼져 있기 일쑤 — 시작할 때 낡았으면 바로 수집한다.

const JOBS = [
  { scope: "events", label: "이벤트", cron: EVENTS_CRON, staleHours: EVENTS_STALE_HOURS, read: readEvents, collect: collectEvents, after: undefined },
  // after: 수집 뒤 쇼핑몰 정가 조회 (미시도 항목만, 예산 제한이라 겹쳐 불러도 안전)
  { scope: "deals", label: "핫딜", cron: DEALS_CRON, staleHours: DEALS_STALE_HOURS, read: readDeals, collect: collectDeals, after: enrichDealPrices },
] as const;

const g = globalThis as typeof globalThis & { __luckySchedulerStarted?: boolean };

export function startScheduler(): void {
  if (g.__luckySchedulerStarted) return;
  g.__luckySchedulerStarted = true;

  for (const job of JOBS) {
    cron.schedule(
      job.cron,
      () => {
        console.log(`[scheduler] ${job.label} 예약 수집 실행`);
        void runExclusive(job.scope, job.collect)
          .then(() => job.after?.())
          .catch((error) => {
            console.error(`[scheduler] ${job.label} 예약 수집 실패:`, (error as Error).message);
          });
      },
      { timezone: TIMEZONE, noOverlap: true },
    );
    console.log(`[scheduler] ${job.label} 수집 예약됨: ${job.cron} (${TIMEZONE})`);

    // 예약 시간에 서버가 꺼져 있었을 수 있으니 시작할 때 한 번 확인한다
    void (async () => {
      try {
        const { updatedAt, items } = await job.read();
        const ageHours = updatedAt ? (Date.now() - Date.parse(updatedAt)) / 36e5 : Infinity;
        const stale = Object.keys(items).length === 0 || !Number.isFinite(ageHours) || ageHours >= job.staleHours;
        if (stale) {
          console.log(`[scheduler] ${job.label} 데이터가 ${job.staleHours}시간 이상 낡음 — 지금 수집합니다`);
          await runExclusive(job.scope, job.collect);
        } else {
          console.log(`[scheduler] ${job.label} 데이터가 최신이라 시작 시 수집을 건너뜁니다`);
        }
        await job.after?.(); // 지난 실행에서 예산에 밀린 미시도 항목 마저 처리
      } catch (error) {
        console.error(`[scheduler] ${job.label} 시작 시 수집 실패:`, (error as Error).message);
      }
    })();
  }
}
