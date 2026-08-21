import type { CollectResult, Scope } from "./types";

// next dev는 모듈을 다시 컴파일하며 모듈 스코프 변수를 날려버린다. globalThis라야 살아남는다.
const g = globalThis as typeof globalThis & {
  __luckyQueues?: Record<string, Promise<unknown>>;
  __luckyCollecting?: Partial<Record<Scope, Promise<CollectResult> | null>>;
};

/**
 * 같은 키를 만지는 쓰기(수집 병합 vs 응모완료/숨기기 PATCH)를 직렬화한다.
 * 앞 작업이 실패해도 체인이 끊기지 않는다.
 */
export async function withStoreLock<T>(key: Scope | "status", fn: () => Promise<T>): Promise<T> {
  const queues = (g.__luckyQueues ??= {});
  const prev = queues[key] ?? Promise.resolve();
  const task = prev.catch(() => {}).then(fn);
  queues[key] = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

export function isCollecting(scope: Scope): boolean {
  return Boolean(g.__luckyCollecting?.[scope]);
}

/**
 * scope별 수집을 실행하되, 이미 돌고 있으면 null을 돌려준다.
 * (cron·부팅 체크·새로고침 연타가 동시에 긁는 사고 방지)
 */
export async function runExclusive(
  scope: Scope,
  run: () => Promise<CollectResult>,
): Promise<CollectResult | null> {
  const inflight = (g.__luckyCollecting ??= {});
  if (inflight[scope]) return null;

  const task = run().finally(() => {
    inflight[scope] = null;
  });
  inflight[scope] = task;
  return task;
}
