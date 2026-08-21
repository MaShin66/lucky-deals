export const TIMEZONE = "Asia/Seoul";

/** 이벤트 수집: 매일 08:00 (핫딜은 cron 없음 — 페이지 접근 시 TTL 검사) */
export const EVENTS_CRON = "0 8 * * *";

/** 마지막 이벤트 수집이 이 시간보다 오래됐으면 서버 시작 시 즉시 수집 */
export const EVENTS_STALE_HOURS = 20;

/** 핫딜 on-demand 수집 간격 — 페이지를 열 때 이보다 낡았으면 다시 긁는다 */
export const DEALS_TTL_MINUTES = 15;

/** NEW 뱃지 기준 */
export const EVENT_NEW_HOURS = 24;
export const DEAL_NEW_HOURS = 6;

/** 핫딜 롤링 보관 — 마지막 목격 후 이 일수가 지나면 삭제 (흘러간 딜은 볼 이유가 없다) */
export const DEAL_KEEP_DAYS = 3;

/** 이벤트 prune — 마감 후 30일 '그리고' 발견 후 90일이 지난 것만 삭제 (seen.mjs 규칙) */
export const EVENT_PRUNE_END_DAYS = 30;
export const EVENT_PRUNE_SEEN_DAYS = 90;
